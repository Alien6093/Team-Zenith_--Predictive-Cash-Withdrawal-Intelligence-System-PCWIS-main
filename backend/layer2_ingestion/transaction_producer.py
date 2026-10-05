import time
import random
from faker import Faker
from datetime import timedelta
from shared.account_pool import get_pool
from layer1_governance.tokenization import load_mou_config, tokenize_and_tag_payload
from layer2_ingestion.db_writer import push_event
from layer2_ingestion.fraud_scenario_gen import generate_cash_withdrawal_fraud_case

fake = Faker('en_IN')

def run_transaction_producer():
    config = load_mou_config()
    pool = get_pool()
    
    print("Starting Transaction Producer to SQLite events table...")
    
    for ring_idx in range(len(pool['rings'])):
        # Generate 2-3 cascades per ring
        for _ in range(random.randint(2, 3)):
            base_time = fake.date_time_between(start_date='-7d', end_date='now')
            txs, _ = generate_cash_withdrawal_fraud_case(ring_idx, pool, base_time)
            
            for tx in txs:
                tx['purpose'] = 'Fraud Investigation'
                tx['retention_days'] = 365
                secured_payload = tokenize_and_tag_payload(tx, "SBI", config)
                push_event("transaction_stream", secured_payload)
                print(f"Published TX: {secured_payload.get('tx_id')} -> {tx['tx_type']}")
                time.sleep(0.01)

if __name__ == "__main__":
    run_transaction_producer()
