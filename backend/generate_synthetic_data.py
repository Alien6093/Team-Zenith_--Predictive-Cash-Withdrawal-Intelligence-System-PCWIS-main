import sqlite3
import json
import os
import random
import math
from datetime import datetime, timedelta
from faker import Faker
from pathlib import Path
from layer2_ingestion.db_writer import DB_PATH

faker = Faker('en_IN')
Faker.seed(42)
random.seed(42)

def init_demo_tables(conn):
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS demo_complaints (
            case_ref TEXT PRIMARY KEY,
            timestamp TEXT NOT NULL,
            fraud_category TEXT NOT NULL,
            state TEXT NOT NULL,
            district TEXT NOT NULL,
            victim_amount REAL NOT NULL,
            linked_mule_bank TEXT NOT NULL,
            mule_account_ref TEXT NOT NULL,
            risk_score REAL NOT NULL,
            status TEXT NOT NULL
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS demo_mule_rings (
            ring_id TEXT PRIMARY KEY,
            payload JSON NOT NULL
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS demo_bank_directory (
            bank_name TEXT PRIMARY KEY,
            rbi_code TEXT NOT NULL,
            nodal_contact TEXT NOT NULL,
            latency_ms INTEGER NOT NULL,
            gateway_status TEXT NOT NULL
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS demo_audit_log (
            log_ref TEXT PRIMARY KEY,
            timestamp TEXT NOT NULL,
            officer TEXT NOT NULL,
            agency TEXT NOT NULL,
            action_category TEXT NOT NULL,
            target_case_ref TEXT NOT NULL,
            network_ip TEXT NOT NULL,
            narrative TEXT NOT NULL
        )
    """)
    conn.commit()

# --- Configurations & Constants ---
# Fraud categories weighted by real NCRB-published category proportions
COMPLAINT_CATEGORIES = [
    ("Digital Arrest Scam", 0.30),
    ("Part-Time Job Fraud", 0.25),
    ("Investment Fraud", 0.20),
    ("ATM Cash Layering", 0.15),
    ("UPI Phishing", 0.08),
    ("KYC Update Scam", 0.02)
]

STATES_DISTRICTS = {
    "Delhi": ["New Delhi", "South Delhi", "West Delhi", "North Delhi", "East Delhi"],
    "Haryana": ["Gurugram", "Faridabad", "Nuh", "Ambala"],
    "Maharashtra": ["Mumbai", "Pune", "Thane", "Nagpur", "Nashik"],
    "West Bengal": ["Kolkata", "Howrah", "North 24 Parganas"],
    "Karnataka": ["Bengaluru Urban", "Mysuru", "Mangaluru"],
    "Uttar Pradesh": ["Noida", "Ghaziabad", "Lucknow", "Kanpur"]
}
# State weights informed by public NCRB category proportions (higher volumes in NCR, Maharashtra, UP)
STATE_WEIGHTS = [0.25, 0.15, 0.25, 0.10, 0.10, 0.15] # Must sum to 1.0

BANKS = [
    ("State Bank of India", "SBIN000"),
    ("HDFC Bank", "HDFC000"),
    ("ICICI Bank", "ICIC000"),
    ("Axis Bank", "UTIB000"),
    ("Punjab National Bank", "PUNB000"),
    ("Bank of Baroda", "BARB0")
]

STATUS_ENUM = ["Pending", "Under Investigation", "CCTV Requisition", "Freeze Ordered", "Field Dispatched", "Funds Secured", "Closed/Resolved"]

def get_weighted_choice(choices_with_weights):
    choices = [c[0] for c in choices_with_weights]
    weights = [c[1] for c in choices_with_weights]
    return random.choices(choices, weights=weights, k=1)[0]

def log_normal_amount():
    # median ~50,000 -> mu ~ 10.8
    # long tail -> sigma ~ 1.2
    amount = math.exp(random.gauss(10.8, 1.2))
    # Cap at 1.5 Cr for sanity
    if amount > 15000000:
        amount = 15000000
    return round(amount, 2)

def generate_complaints(conn, num=500):
    cursor = conn.cursor()
    cursor.execute("DELETE FROM demo_complaints")
    
    base_time = datetime.now()
    records = []
    
    states_list = list(STATES_DISTRICTS.keys())
    
    for _ in range(num):
        year = base_time.year
        state = random.choices(states_list, weights=STATE_WEIGHTS, k=1)[0]
        state_code = state[:3].upper()
        case_ref = f"DEMO-NCRP/{year}/{state_code}/{random.randint(100000, 999999)}"
        
        # Random time within last 30 days
        ts_obj = base_time - timedelta(days=random.uniform(0, 30))
        ts_str = ts_obj.isoformat() + "Z"
        
        category = get_weighted_choice(COMPLAINT_CATEGORIES)
        district = random.choice(STATES_DISTRICTS[state])
        amount = log_normal_amount()
        
        bank_name, _ = random.choice(BANKS)
        mule_acc_ref = f"{bank_name[:4].upper()}-DEMO-{random.randint(1000,9999)}-{random.randint(1000,9999)}-{random.randint(1000,9999)}"
        
        risk_score = random.uniform(20.0, 99.0)
        # Weight status
        if risk_score > 85:
            status = random.choice(["Pending", "Under Investigation", "Field Dispatched", "Freeze Ordered"])
        else:
            status = random.choice(["Closed/Resolved", "Pending", "Funds Secured"])
            
        cursor.execute(
            "INSERT INTO demo_complaints VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (case_ref, ts_str, category, state, district, amount, bank_name, mule_acc_ref, risk_score, status)
        )
    conn.commit()
    print(f" [+] Generated {num} synthetic complaints.")

def generate_mule_rings(conn, num_rings=20):
    cursor = conn.cursor()
    cursor.execute("DELETE FROM demo_mule_rings")
    
    for i in range(num_rings):
        ring_id = f"DEMO-CLUSTER-{i+1:02d}"
        
        num_accounts = random.randint(3, 15)
        has_gateway = random.random() < 0.3
        
        accounts = []
        for j in range(num_accounts):
            bank_name, _ = random.choice(BANKS)
            acc_ref = f"{bank_name[:4].upper()}-DEMO-{random.randint(1000,9999)}-{random.randint(1000,9999)}-{random.randint(1000,9999)}"
            is_hub = j < 2 # first 1-2 are hubs
            is_gateway_node = has_gateway and j == num_accounts - 1
            
            accounts.append({
                "account_ref": acc_ref,
                "bank": bank_name,
                "is_hub": is_hub,
                "is_gateway": is_gateway_node
            })
            
        # 70-80% show consistent 2-4 ATM reuse
        atms = []
        if random.random() < 0.75:
            atms = [f"ATM-OSM-{random.randint(1000000, 9999999)}" for _ in range(random.randint(2, 4))]
        else:
            atms = [f"ATM-OSM-{random.randint(1000000, 9999999)}" for _ in range(random.randint(5, 10))]
            
        payload = {
            "ring_id": ring_id,
            "accounts": accounts,
            "atms": atms,
            "total_volume": sum([log_normal_amount() for _ in range(num_accounts)]),
            "primary_syndicate": f"Syndicate-{chr(random.randint(65,90))}"
        }
        
        cursor.execute("INSERT INTO demo_mule_rings VALUES (?, ?)", (ring_id, json.dumps(payload)))
    
    conn.commit()
    print(f" [+] Generated {num_rings} synthetic mule rings.")

def generate_bank_directory(conn):
    cursor = conn.cursor()
    cursor.execute("DELETE FROM demo_bank_directory")
    
    for bank_name, rbi_prefix in BANKS:
        rbi_code = f"{rbi_prefix}{random.randint(100000, 999999)}"
        email = f"demo-nodal@{bank_name.replace(' ', '').lower()}-sandbox.example"
        latency = random.randint(150, 800)
        status = "Optimal" if latency < 500 else "Delay"
        
        cursor.execute(
            "INSERT INTO demo_bank_directory VALUES (?, ?, ?, ?, ?)",
            (bank_name, rbi_code, email, latency, status)
        )
    conn.commit()
    print(" [+] Generated bank directory.")

def clear_audit_logs(conn):
    cursor = conn.cursor()
    cursor.execute("DELETE FROM demo_audit_log")
    conn.commit()
    print(" [+] Cleared audit logs (start fresh per requirements).")

def main():
    print("Generating Synthetic Cybercrime Intelligence Data for Hackathon Demo...")
    conn = sqlite3.connect(DB_PATH)
    init_demo_tables(conn)
    
    generate_complaints(conn, 500)
    generate_mule_rings(conn, 20)
    generate_bank_directory(conn)
    clear_audit_logs(conn)
    
    conn.close()
    print("Done! Data written to cybercrime.db")

if __name__ == "__main__":
    main()
