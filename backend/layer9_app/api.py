import json
import os
import jwt
import math
import random
from datetime import datetime, timezone, timedelta
from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
import sqlite3
from pathlib import Path
import uvicorn
from shared.env_loader import DB_PATH, JWT_SECRET
from dotenv import load_dotenv
import requests
from apscheduler.schedulers.background import BackgroundScheduler
from layer1_governance.retention_job import run_retention_job

load_dotenv()

app = FastAPI(title="Cybercrime Predictive Framework API")

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

scheduler = BackgroundScheduler()

@app.on_event("startup")
def startup_event():
    scheduler.add_job(run_retention_job, 'interval', hours=1)
    scheduler.start()

@app.on_event("shutdown")
def shutdown_event():
    scheduler.shutdown()

RECAPTCHA_TIMEOUT_SECONDS = 5
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 8
security = HTTPBearer()

EVAL_LOG_FILE = Path(__file__).resolve().parent.parent / "data" / "evaluation_logs.jsonl"

def create_jwt_token(username: str) -> str:
    payload = {
        "sub": username,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_jwt_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload["sub"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def _get_db():
    conn = sqlite3.connect(str(DB_PATH), timeout=15.0)
    conn.row_factory = sqlite3.Row
    return conn

class LoginRequest(BaseModel):
    username: str
    password: str
    captcha_token: str

class StatusRequest(BaseModel):
    owner: str
    status: str

@app.get("/")
def root():
    return {"message": "Cybercrime Predictive Framework API is running."}

@app.post("/api/login")
def login(req: LoginRequest):
    # Verify CAPTCHA with Google (Test secret key used here for demo)
    recaptcha_secret = os.getenv("RECAPTCHA_SECRET_KEY")
    if not recaptcha_secret:
        raise HTTPException(status_code=500, detail="RECAPTCHA_SECRET_KEY is not configured on the server.")
    verify_url = "https://www.google.com/recaptcha/api/siteverify"
    try:
        resp = requests.post(
            verify_url,
            data={"secret": recaptcha_secret, "response": req.captcha_token},
            timeout=RECAPTCHA_TIMEOUT_SECONDS,
        )
        captcha_ok = bool(resp.json().get("success"))
    except (requests.RequestException, ValueError):
        raise HTTPException(status_code=503, detail="CAPTCHA service is unavailable. Try again shortly.")

    if not captcha_ok:
        raise HTTPException(status_code=403, detail="CAPTCHA verification failed.")

    if req.username == "admin" and req.password == "123":
        token = create_jwt_token(req.username)
        return {"authenticated": True, "user": req.username, "token": token}
    raise HTTPException(status_code=401, detail="Invalid credentials.")

# --- Existing Endpoints Kept for Compatibility ---
@app.get("/api/alerts")
def get_alerts(username: str = Depends(verify_jwt_token)):
    alerts = []
    if not EVAL_LOG_FILE.exists():
        return {"alerts": []}
    with open(EVAL_LOG_FILE, 'r') as f:
        lines = f.readlines()
    conn = _get_db()
    for line in lines[-100:]:
        if not line.strip():
            continue
        try:
            record = json.loads(line)
        except json.JSONDecodeError:
            continue
        c_id = record['complaint_id']
        candidates = []
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM predictions WHERE complaint_id = ? ORDER BY score DESC", (c_id,))
            for row in cursor.fetchall():
                candidates.append(dict(row))
        except sqlite3.Error:
            pass
        ack_info = None
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM acks WHERE complaint_id = ?", (c_id,))
            ack_row = cursor.fetchone()
            if ack_row:
                ack_info = dict(ack_row)
        except sqlite3.Error:
            pass
        alerts.append({
            "complaint_id": c_id,
            "timestamp": record['timestamp'],
            "mrr": record['mrr'],
            "distance_error_km": record['distance_error_km'],
            "acknowledged": ack_info is not None,
            "ack_info": ack_info,
            "candidates": candidates
        })
    conn.close()
    alerts.reverse()
    return {"alerts": alerts}

# --- NEW DEMO ENDPOINTS FOR UI OVERHAUL ---

@app.get("/api/demo/metrics")
def get_demo_metrics(username: str = Depends(verify_jwt_token)):
    conn = _get_db()
    cursor = conn.cursor()
    
    # KPIs
    cursor.execute("SELECT COUNT(*) as c FROM demo_complaints")
    total_complaints = cursor.fetchone()['c']
    
    cursor.execute("SELECT COUNT(*) as c FROM demo_mule_rings")
    active_networks = cursor.fetchone()['c']
    
    mules_flagged = active_networks * 8
    predicted_cash_withdrawals = int(total_complaints * 0.15)
    
    cursor.execute("SELECT SUM(victim_amount) as s FROM demo_complaints WHERE status IN ('Freeze Ordered', 'Funds Secured')")
    row = cursor.fetchone()
    secured_capital = row['s'] if row['s'] else 0.0
    secured_capital_cr = round(secured_capital / 10000000, 2)
    
    # Hourly Velocity Chart
    hourly_data = []
    for i in range(24):
        actual = random.randint(10, 50) if i < 18 else None
        predicted = actual if i < 18 else random.randint(30, 80)
        hourly_data.append({"hour": f"{i:02d}:00", "actual": actual, "predicted": predicted})
        
    # Category Distribution
    cursor.execute("SELECT fraud_category, COUNT(*) as count, SUM(victim_amount) as total FROM demo_complaints GROUP BY fraud_category")
    category_data = []
    for r in cursor.fetchall():
        category_data.append({
            "name": r["fraud_category"],
            "count": r["count"],
            "loss_cr": round(r["total"] / 10000000, 2)
        })
        
    # Priority Incidents (Top 10 High Risk)
    cursor.execute("SELECT * FROM demo_complaints ORDER BY risk_score DESC LIMIT 10")
    priority_incidents = [dict(r) for r in cursor.fetchall()]
        
    conn.close()
    
    return {
        "kpis": {
            "total_complaints": total_complaints,
            "active_networks": active_networks,
            "mules_flagged": mules_flagged,
            "predicted_withdrawals": predicted_cash_withdrawals,
            "secured_capital_cr": secured_capital_cr
        },
        "hourly_velocity": hourly_data,
        "category_distribution": category_data,
        "priority_incidents": priority_incidents
    }

class PredictRequest(BaseModel):
    category: str
    lat: float
    lng: float
    amount: float

@app.post("/api/demo/predict")
def run_demo_prediction(req: PredictRequest, username: str = Depends(verify_jwt_token)):
    risk_score = round(min(99.0, req.amount / 100000 * 5 + 60), 1)
    
    features = [
        {"feature": "burst_velocity_ratio", "desc": "Rapid transfer velocity detected", "weight": random.randint(20, 45)},
        {"feature": "geo_distance_anomaly", "desc": "Geographic distance anomaly from origin", "weight": random.randint(15, 30)},
        {"feature": "offshore_gateway_proximity", "desc": "Close graph proximity to offshore gateway", "weight": random.randint(10, 25)}
    ]
    
    return {
        "prediction_id": f"PRED-{random.randint(100000, 999999)}",
        "risk_score": risk_score,
        "confidence": round(random.uniform(75.0, 95.0), 1),
        "cluster": f"Cluster-{random.randint(10, 99)}",
        "features": features
    }

@app.get("/api/demo/cases")
def get_demo_cases(username: str = Depends(verify_jwt_token)):
    conn = _get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM demo_complaints ORDER BY timestamp DESC")
    cases = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return {"cases": cases}

@app.get("/api/demo/graph/{case_id}")
def get_demo_graph(case_id: str, username: str = Depends(verify_jwt_token)):
    conn = _get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM demo_complaints WHERE case_ref = ?", (case_id,))
    case_row = cursor.fetchone()
    conn.close()
    
    if not case_row:
        raise HTTPException(status_code=404, detail="Case not found")
        
    case = dict(case_row)
    
    from layer5_graph.fraud_graph import FraudGraph
    graph_engine = FraudGraph()
    subgraph_data = graph_engine.get_case_subgraph(case)
    backend_status = "Neo4j" if graph_engine.use_neo4j else "NetworkX (fallback - Neo4j unavailable)"
    graph_engine.close()
    
    return {
        "nodes": subgraph_data["nodes"],
        "edges": subgraph_data["edges"],
        "confidence": round(random.uniform(85.0, 98.0), 1),
        "graph_backend": backend_status
    }

@app.get("/api/demo/atms")
def get_demo_atms(username: str = Depends(verify_jwt_token)):
    # Read from the account_pool.json generated by fetch_osm_atms.py
    pool_file = Path(__file__).resolve().parent.parent / "data" / "account_pool.json"
    atms = []
    if pool_file.exists():
        with open(pool_file, 'r') as f:
            pool = json.load(f)
            atms = pool.get('atms', [])
            
    # Assign random risk tiers to them for demo
    for atm in atms:
        score = random.uniform(20.0, 99.0)
        atm['risk_score'] = score
        if score >= 90:
            atm['tier'] = 'High'
        elif score >= 70:
            atm['tier'] = 'Medium'
        else:
            atm['tier'] = 'Low'
            
        atm['incident_count_30d'] = random.randint(0, 15)
            
    return {"atms": atms}

@app.get("/api/demo/banks")
def get_demo_banks(username: str = Depends(verify_jwt_token)):
    conn = _get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM demo_bank_directory")
    banks = [dict(r) for r in cursor.fetchall()]
    conn.close()
    
    # Simulate dynamic data
    for b in banks:
        b['active_lien_count'] = random.randint(5, 50)
        b['funds_secured_today'] = round(random.uniform(50000, 5000000), 2)
    return {"banks": banks}

class AuditRequest(BaseModel):
    action_category: str = Field(max_length=100)
    target_case_ref: str = Field(max_length=100)
    narrative: str = Field(max_length=2000)

@app.post("/api/demo/audit")
def create_audit_log(req: AuditRequest, request: Request, username: str = Depends(verify_jwt_token)):
    conn = _get_db()
    cursor = conn.cursor()
    
    log_ref = f"DEMO-AUDIT-{random.randint(100000, 999999)}"
    ts = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    
    # Read client IP from request, fallback to dummy
    client_ip = request.client.host if request.client else "10.0.0.1"
    
    cursor.execute(
        "INSERT INTO demo_audit_log VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (log_ref, ts, username, "I4C HQ", req.action_category, req.target_case_ref, client_ip, req.narrative)
    )
    conn.commit()
    conn.close()
    return {"status": "success", "log_ref": log_ref}

@app.get("/api/demo/audit")
def get_audit_logs(username: str = Depends(verify_jwt_token)):
    conn = _get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM demo_audit_log ORDER BY timestamp DESC")
    logs = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return {"logs": logs}

if __name__ == "__main__":
    uvicorn.run(
        "layer9_app.api:app",
        host=os.getenv("API_HOST", "127.0.0.1"),
        port=int(os.getenv("API_PORT", "8000")),
        reload=os.getenv("API_RELOAD", "1") == "1",
    )
