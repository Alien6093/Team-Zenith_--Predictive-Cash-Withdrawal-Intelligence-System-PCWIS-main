import sqlite3
import csv
import random
from datetime import datetime
import os

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'cybercrime.db'))
ARCHIVE_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'datasets', 'atm_transactions'))
LAGOS_TX_FILE = os.path.join(ARCHIVE_PATH, 'lagos_transactions.csv')

def ingest_data():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print("Clearing demo_complaints...")
    cursor.execute("DELETE FROM demo_complaints")
    
    print(f"Reading {LAGOS_TX_FILE}...")
    
    with open(LAGOS_TX_FILE, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        count = 0
        for row in reader:
            if count >= 150: # limit for demo purposes
                break
                
            case_ref = row.get('TransactionID', f'TX-{count}')
            timestamp_raw = row.get('TransactionStartDateTime', datetime.now().isoformat())
            try:
                # '1/1/2022 0:03'
                dt = datetime.strptime(timestamp_raw, '%m/%d/%Y %H:%M')
                ts = dt.isoformat() + "Z"
            except:
                ts = datetime.now().isoformat() + "Z"
                
            amount = float(row.get('TransactionAmount', 0.0))
            if amount == 0:
                amount = random.uniform(1000.0, 50000.0) # add fake amount if 0 for demo visual
            
            # Map Nigerian context to Indian schema format
            fraud_cat = random.choice(['Financial Fraud', 'Cyber Fraud', 'Identity Theft', 'Phishing'])
            state = "Lagos"
            district = "Lagos"
            atm_loc = row.get('LocationID', 'LA-001')
            mule = row.get('CardholderID', 'Unknown')
            risk = random.uniform(50.0, 99.0)
            
            # Base coords for Lagos
            lat = 6.5244 + random.uniform(-0.05, 0.05)
            lng = 3.3792 + random.uniform(-0.05, 0.05)
            
            cursor.execute("""
                INSERT INTO demo_complaints 
                (case_ref, timestamp, fraud_category, state_ut, district, victim_amount, mule_account_ref, mule_bank, mule_branch_city, atm_target_location, predicted_time_window, risk_score, status, linked_imei, ip_address, associated_syndicate, lat, lng)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                case_ref, ts, fraud_cat, state, district, amount, mule, "Wisabi Bank", state, atm_loc, 
                "Within 4 Hours", risk, "UNDER_INVESTIGATION", "IMEI-UNKNOWN", "10.0.0.1", "Lagos Syndicate", lat, lng
            ))
            count += 1
            
    conn.commit()
    conn.close()
    print(f"Ingested {count} Nigerian transactions successfully.")

if __name__ == '__main__':
    ingest_data()
