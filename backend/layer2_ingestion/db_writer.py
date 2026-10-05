import sqlite3
import json
from shared.env_loader import DB_PATH

def get_db_connection():
    conn = sqlite3.connect(DB_PATH, timeout=15.0)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            stream_name TEXT NOT NULL,
            payload JSON NOT NULL,
            retention_expiry TEXT NOT NULL,
            processed BOOLEAN DEFAULT 0
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS predictions (
            complaint_id TEXT NOT NULL,
            atm_id TEXT NOT NULL,
            name TEXT NOT NULL,
            lat REAL NOT NULL,
            lon REAL NOT NULL,
            score REAL NOT NULL,
            tier TEXT NOT NULL,
            action TEXT NOT NULL,
            distance_km REAL DEFAULT 0.0,
            in_degree REAL DEFAULT 0.0,
            total_received REAL DEFAULT 0.0,
            is_gateway REAL DEFAULT 0.0,
            pagerank REAL DEFAULT 0.0,
            min_gateway_hops REAL DEFAULT 99.0,
            UNIQUE(complaint_id, atm_id)
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS acks (
            complaint_id TEXT PRIMARY KEY,
            owner TEXT NOT NULL,
            status TEXT NOT NULL,
            timestamp TEXT NOT NULL
        )
    """)
    
    # Auto-migrate existing predictions table if feature columns are missing
    cursor.execute("PRAGMA table_info(predictions)")
    cols = [col[1] for col in cursor.fetchall()]
    new_cols = {
        "distance_km": "REAL DEFAULT 0.0",
        "in_degree": "REAL DEFAULT 0.0",
        "total_received": "REAL DEFAULT 0.0",
        "is_gateway": "REAL DEFAULT 0.0",
        "pagerank": "REAL DEFAULT 0.0",
        "min_gateway_hops": "REAL DEFAULT 99.0"
    }
    for col_name, col_type in new_cols.items():
        if col_name not in cols:
            cursor.execute(f"ALTER TABLE predictions ADD COLUMN {col_name} {col_type}")

    conn.commit()
    conn.close()

def push_event(stream_name: str, payload: dict):
    init_db() # ensure db exists
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Extract retention expiry from metadata
    expiry = payload.get('metadata', {}).get('retention_expiry', '')
    
    cursor.execute(
        "INSERT INTO events (stream_name, payload, retention_expiry) VALUES (?, ?, ?)",
        (stream_name, json.dumps(payload), expiry)
    )
    conn.commit()
    conn.close()

def save_predictions(conn, complaint_id: str, candidates: list):
    cursor = conn.cursor()
    
    for c in candidates:
        feats = c.get('feats', [c.get('distance_km', 0.0), 0.0, 0.0, 0.0, 0.0, 99.0])
        dist = feats[0] if len(feats) > 0 else c.get('distance_km', 0.0)
        in_deg = feats[1] if len(feats) > 1 else 0.0
        tot_recv = feats[2] if len(feats) > 2 else 0.0
        is_gw = feats[3] if len(feats) > 3 else 0.0
        pr = feats[4] if len(feats) > 4 else 0.0
        hops = feats[5] if len(feats) > 5 else 99.0

        cursor.execute(
            """INSERT OR REPLACE INTO predictions 
               (complaint_id, atm_id, name, lat, lon, score, tier, action, distance_km, in_degree, total_received, is_gateway, pagerank, min_gateway_hops) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (complaint_id, c['atm_id'], c['name'], c['lat'], c['lon'], c['score'], c['tier'], c['action'],
             dist, in_deg, tot_recv, is_gw, pr, hops)
        )
    conn.commit()
