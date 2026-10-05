import numpy as np
import lightgbm as lgb
import joblib
import sqlite3
import json
from pathlib import Path
from sklearn.isotonic import IsotonicRegression
from sklearn.model_selection import train_test_split

MODEL_DIR = Path(__file__).resolve().parent.parent / "models"

def generate_training_data(n_samples=1000):
    """
    Generates structured 6-feature synthetic data:
    [distance_km, in_degree, total_received, is_gateway, pagerank, min_gateway_hops]
    """
    np.random.seed(42)
    
    distance = np.random.uniform(0.1, 50.0, n_samples)
    in_degree = np.random.poisson(3, n_samples)
    total_received = np.random.uniform(1000, 500000, n_samples)
    is_gateway = np.random.binomial(1, 0.1, n_samples)
    pagerank = np.random.uniform(0.001, 0.2, n_samples)
    min_gateway_hops = np.random.choice([0.0, 1.0, 2.0, 3.0, 99.0], size=n_samples, p=[0.1, 0.3, 0.3, 0.2, 0.1])
    
    X = np.column_stack([distance, in_degree, total_received, is_gateway, pagerank, min_gateway_hops])
    weights = np.ones(n_samples)
    
    # Target logic: short distance + high degree + gateway + high PageRank + close hops = high CASH_OUT likelihood
    logits = (-0.1 * distance + 0.5 * in_degree + 0.00001 * total_received + 
              2.0 * is_gateway + 10.0 * pagerank - 0.3 * np.minimum(min_gateway_hops, 5.0) - 1.0)
    probs = 1 / (1 + np.exp(-logits))
    
    y = np.random.binomial(1, probs)
    groups = np.full(n_samples // 10, 10)
    
    return X, y, groups, weights


def extract_training_data_from_db(db_path=None):
    """
    Extracts real training data from SQLite predictions + acks tables.
    Extracts true candidate feature vectors stored in the predictions table.
    Applies active learning weights based on officer acknowledgements.
    """
    if db_path is None:
        db_path = Path(__file__).resolve().parent.parent / "cybercrime.db"
    
    if not db_path.exists():
        print("Database not found. Cannot extract real training data.")
        return None
    
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        # Check if raw feature columns exist in predictions table
        cursor.execute("PRAGMA table_info(predictions)")
        cols = [col[1] for col in cursor.fetchall()]
        
        has_raw_features = "distance_km" in cols and "pagerank" in cols
        
        if has_raw_features:
            cursor.execute("""
                SELECT p.complaint_id, p.atm_id, p.score, p.tier, p.action,
                       p.distance_km, p.in_degree, p.total_received, p.is_gateway, 
                       p.pagerank, p.min_gateway_hops,
                       a.status as ack_status
                FROM predictions p
                LEFT JOIN acks a ON p.complaint_id = a.complaint_id
                ORDER BY p.complaint_id, p.score DESC
            """)
        else:
            cursor.execute("""
                SELECT p.complaint_id, p.atm_id, p.score, p.tier, p.action,
                       a.status as ack_status
                FROM predictions p
                LEFT JOIN acks a ON p.complaint_id = a.complaint_id
                ORDER BY p.complaint_id, p.score DESC
            """)
        rows = cursor.fetchall()
    except sqlite3.Error as e:
        print(f"Error extracting training data: {e}")
        conn.close()
        return None
    
    conn.close()
    
    if len(rows) < 20:
        print(f"Insufficient data for training: {len(rows)} rows (need at least 20)")
        return None
    
    groups_dict = {}
    for row in rows:
        cid = row['complaint_id']
        if cid not in groups_dict:
            groups_dict[cid] = []
        groups_dict[cid].append(dict(row))
    
    X_list = []
    y_list = []
    w_list = []
    group_sizes = []
    
    for cid, preds in groups_dict.items():
        if len(preds) < 2:
            continue
            
        group_sizes.append(len(preds))
        
        for pred in preds:
            if 'distance_km' in pred:
                feats = [
                    float(pred.get('distance_km', 0.0)),
                    float(pred.get('in_degree', 0.0)),
                    float(pred.get('total_received', 0.0)),
                    float(pred.get('is_gateway', 0.0)),
                    float(pred.get('pagerank', 0.0)),
                    float(pred.get('min_gateway_hops', 99.0))
                ]
            else:
                tier_map = {'Low': 0, 'Medium': 1, 'High': 2, 'Critical': 3}
                tier_num = tier_map.get(pred['tier'], 0)
                feats = [pred['score'], float(tier_num), 0.0, 0.0, 0.0, 99.0]
                
            X_list.append(feats)
            
            # Active learning label & weighting based on officer feedback
            ack = (pred.get('ack_status') or '').lower()
            if ack in ['blocked', 'confirmed', 'accepted']:
                y_list.append(1)
                w_list.append(3.0) # High weight for verified ground truth
            elif ack in ['rejected', 'false_alert', 'dismissed']:
                y_list.append(0)
                w_list.append(0.5) # Lower weight for false alerts
            else:
                y_list.append(1 if pred['score'] > 0.7 else 0)
                w_list.append(1.0)
    
    if len(X_list) < 20:
        print(f"Insufficient grouped data for training: {len(X_list)} samples")
        return None
    
    X = np.array(X_list)
    y = np.array(y_list)
    groups = np.array(group_sizes)
    weights = np.array(w_list)
    
    print(f"Extracted {len(X)} samples (6 features) across {len(groups)} complaint groups from database")
    return X, y, groups, weights


def train_and_save(use_real_data=False):
    """Train and save the LightGBM Lambdarank model."""
    
    data = None
    if use_real_data:
        data = extract_training_data_from_db()
    
    if data is None:
        print("Using synthetic training data...")
        X, y, groups, weights = generate_training_data(2000)
    else:
        X, y, groups, weights = data
    
    # Split by groups cleanly so sum(group_train) always equals len(X_train)
    n_groups = len(groups)
    n_train_groups = max(1, int(0.7 * n_groups))
    
    group_train = groups[:n_train_groups]
    train_samples = int(np.sum(group_train))
    
    X_train, y_train, w_train = X[:train_samples], y[:train_samples], weights[:train_samples]
    X_test, y_test = X[train_samples:], y[train_samples:]
    
    print(f"Training LightGBM model on {len(X_train)} samples across {len(group_train)} groups...")
    train_data = lgb.Dataset(X_train, label=y_train, group=group_train, weight=w_train)
    
    params = {
        'objective': 'lambdarank',
        'metric': 'ndcg',
        'ndcg_eval_at': [1, 3, 5],
        'learning_rate': 0.05,
        'num_leaves': 31,
        'min_child_samples': 5,
        'seed': 42,
        'verbose': -1
    }
    
    model = lgb.train(params, train_data, num_boost_round=100)
    
    # Calibrate on test set using Isotonic Regression
    print("Calibrating model outputs...")
    raw_test_preds = model.predict(X_test)
    calibrator = IsotonicRegression(out_of_bounds='clip')
    calibrator.fit(raw_test_preds, y_test)
    
    # Ensure directory exists
    MODEL_DIR.mkdir(exist_ok=True)
    
    # Save model and calibrator
    model_path = MODEL_DIR / "lgb_model.txt"
    calib_path = MODEL_DIR / "calibrator.pkl"
    
    model.save_model(str(model_path))
    joblib.dump(calibrator, calib_path)
    
    print(f"Model saved to {model_path}")
    print(f"Calibrator saved to {calib_path}")

if __name__ == "__main__":
    import sys
    use_real = "--real" in sys.argv
    if use_real:
        print("Attempting to use real pipeline data for training...")
    train_and_save(use_real_data=use_real)
