import time
import random
from faker import Faker
from shared.account_pool import get_pool
from layer1_governance.tokenization import load_mou_config, tokenize_and_tag_payload
from layer2_ingestion.db_writer import push_event
from layer2_ingestion.fraud_scenario_gen import generate_cash_withdrawal_fraud_case

fake = Faker('en_IN')

def run_complaint_producer():
    config = load_mou_config()
    pool = get_pool()
    
    print(f"Starting Complaint Producer to SQLite events table...")
    
    for ring_idx in range(len(pool['rings'])):
        # Generate 1 complaint per ring
        base_time = fake.date_time_between(start_date='-7d', end_date='now')
        _, complaint = generate_cash_withdrawal_fraud_case(ring_idx, pool, base_time)
        
        complaint['purpose'] = 'Fraud Investigation'
        complaint['retention_days'] = 365
        
        # Tokenize and tag using Layer 1 logic
        secured_payload = tokenize_and_tag_payload(complaint, "I4C", config)
        
        push_event("complaint_stream", secured_payload)
        print(f"Published complaint: {secured_payload.get('complaint_id')} to DB.")
        
        time.sleep(0.01)

if __name__ == "__main__":
    run_complaint_producer()
