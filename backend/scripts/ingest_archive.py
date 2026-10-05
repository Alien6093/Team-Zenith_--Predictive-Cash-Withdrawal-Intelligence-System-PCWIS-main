import sqlite3
import csv
import random
from datetime import datetime
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from generate_synthetic_data import init_demo_tables

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'cybercrime.db'))
ARCHIVE_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'datasets', 'atm_transactions'))
LAGOS_TX_FILE = os.path.join(ARCHIVE_PATH, 'lagos_transactions.csv')

def ingest_data():
    conn = sqlite3.connect(DB_PATH)
    init_demo_tables(conn)
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
            except ValueError:
                ts = datetime.now().isoformat() + "Z"
                
            amount = float(row.get('TransactionAmount', 0.0))
            if amount == 0:
                amount = random.uniform(1000.0, 50000.0) # add fake amount if 0 for demo visual
            
            # Map the Nigerian transaction onto the demo complaint schema
            fraud_cat = random.choice(['Financial Fraud', 'Cyber Fraud', 'Identity Theft', 'Phishing'])
            mule = row.get('CardholderID', 'Unknown')
            risk = random.uniform(50.0, 99.0)

            cursor.execute("""
                INSERT OR REPLACE INTO demo_complaints
                (case_ref, timestamp, fraud_category, state, district, victim_amount,
                 linked_mule_bank, mule_account_ref, risk_score, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (case_ref, ts, fraud_cat, "Lagos", "Lagos", amount,
                  "Wisabi Bank", mule, risk, "Under Investigation"))
            count += 1
            
    conn.commit()
    conn.close()
    print(f"Ingested {count} Nigerian transactions successfully.")

if __name__ == '__main__':
    ingest_data()
