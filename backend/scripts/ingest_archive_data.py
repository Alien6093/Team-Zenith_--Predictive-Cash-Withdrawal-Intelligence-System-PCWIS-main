import os
import sys
import csv
import json
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from layer2_ingestion.db_writer import push_event

ARCHIVE_DIR = PROJECT_ROOT.parent / "datasets" / "atm_transactions"

TX_TYPE_MAP = {
    "1": "CASH_OUT",
    "2": "DEPOSIT",
    "3": "BALANCE_INQUIRY",
    "4": "TRANSFER"
}

def ingest_transactions():
    print(f"Reading from {ARCHIVE_DIR}...")
    
    # Ingest a small subset to avoid taking too long for demo
    csv_files = ["fct_transactions.csv"] # We can add more like "enugu_transactions.csv" later if needed
    
    total_pushed = 0
    for filename in csv_files:
        file_path = ARCHIVE_DIR / filename
        if not file_path.exists():
            print(f"Skipping {filename}, not found.")
            continue
            
        print(f"Ingesting {filename}...")
        with open(file_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for i, row in enumerate(reader):
                if i >= 10000: # Limit to 10k per file for quick execution
                    break
                
                tx_type_id = row.get("TransactionTypeID")
                tx_type = TX_TYPE_MAP.get(tx_type_id, "UNKNOWN")
                
                # We skip balance inquiries
                if tx_type == "BALANCE_INQUIRY":
                    continue
                
                tx = {
                    "tx_id": row.get("TransactionID"),
                    "sender_account": row.get("CardholderID"),
                    "receiver_account": row.get("LocationID"),
                    "amount": float(row.get("TransactionAmount", 0)),
                    "tx_type": tx_type,
                    "timestamp": row.get("TransactionStartDateTime"),
                    "purpose": "Archive Ingestion",
                    "retention_days": 365
                }
                
                # Mock tokenization wrapper for compatibility
                secured_payload = {
                    "tx_id": tx["tx_id"],
                    "secured_data": tx, # In real pipeline, this would be encrypted
                    "metadata": {
                        "bank_id": "ARCHIVE",
                        "retention_expiry": "2030-01-01T00:00:00Z"
                    }
                }
                
                push_event("transaction_stream", secured_payload)
                total_pushed += 1
                
                if total_pushed % 1000 == 0:
                    print(f"Pushed {total_pushed} events...")
                    
    print(f"Completed! Total events pushed: {total_pushed}")

if __name__ == "__main__":
    ingest_transactions()
