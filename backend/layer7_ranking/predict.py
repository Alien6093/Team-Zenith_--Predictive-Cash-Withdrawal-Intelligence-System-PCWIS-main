import numpy as np
import lightgbm as lgb
import joblib
from pathlib import Path

MODEL_DIR = Path(__file__).resolve().parent.parent / "models"
MODEL_PATH = MODEL_DIR / "lgb_model.txt"
CALIB_PATH = MODEL_DIR / "calibrator.pkl"

class MLPredictor:
    def __init__(self):
        self.model = None
        self.calibrator = None
        self.feature_names = [
            "distance_km", "in_degree", "total_received", 
            "is_gateway", "pagerank", "min_gateway_hops"
        ]
        
    def _load_models(self):
        if not self.model and MODEL_PATH.exists():
            self.model = lgb.Booster(model_file=str(MODEL_PATH))
        if not self.calibrator and CALIB_PATH.exists():
            self.calibrator = joblib.load(CALIB_PATH)
            
    def predict_and_explain(self, features: list) -> dict:
        """
        Takes a list of feature vectors for candidates.
        Returns probabilities and SHAP-based reason codes.
        """
        self._load_models()
        if not self.model or not self.calibrator:
            # Fallback if no model exists (e.g., first run)
            return {"probabilities": [0.5]*len(features), "reason_codes": [self.feature_names[0]]*len(features)}
            
        X = np.array(features)
        
        # Adjust feature dimension dynamically if loading a model trained on fewer features
        n_model_feats = self.model.num_feature()
        if X.shape[1] > n_model_feats:
            X_pred = X[:, :n_model_feats]
        elif X.shape[1] < n_model_feats:
            # Pad with zeros if necessary
            pad = np.zeros((X.shape[0], n_model_feats - X.shape[1]))
            X_pred = np.hstack([X, pad])
        else:
            X_pred = X
        
        # Raw predictions
        raw_preds = self.model.predict(X_pred)
        
        # Calibrate
        probs = self.calibrator.predict(raw_preds)
        
        # SHAP contributions
        # Returns (n_samples, n_features + 1), where the last column is the expected value
        contribs = self.model.predict(X_pred, pred_contrib=True)
        
        reason_codes = []
        n_feats = X.shape[1]
        active_names = self.feature_names[:n_feats] if n_feats <= len(self.feature_names) else self.feature_names + [f"feature_{i}" for i in range(len(self.feature_names), n_feats)]

        for i in range(len(X)):
            # Ignore the base value (last element)
            feature_contribs = contribs[i][:-1]
            # Find the feature that contributed the most *positively*
            top_idx = int(np.argmax(feature_contribs))
            if top_idx < len(active_names):
                reason_codes.append(active_names[top_idx])
            else:
                reason_codes.append(active_names[0])
            
        return {
            "probabilities": probs.tolist(),
            "reason_codes": reason_codes
        }
