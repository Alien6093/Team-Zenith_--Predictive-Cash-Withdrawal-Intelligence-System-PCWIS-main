import time
import random
from faker import Faker
from shared.account_pool import get_pool
from layer1_governance.tokenization import load_mou_config, tokenize_and_tag_payload
from layer2_ingestion.db_writer import push_event

fake = Faker('en_IN')

def run_mulehunter_producer():
    config = load_mou_config()
    pool = get_pool()
    
    print("Starting MuleHunter.AI Producer to SQLite events table...")
    
    # Pick a few mules to flag
    mules = random.sample(pool['mules'], 5)
    
    for mule in mules:
        flag_event = {
            "flag_id": f"MH-{fake.uuid4()[:8]}",
            "account_number": mule['account_number'],
            "risk_score": round(random.uniform(0.7, 0.99), 2),
            "flagged_reason": random.choice(["Velocity limits exceeded", "Known device association", "High-risk IP"]),
            "timestamp": fake.date_time_between(start_date='-1d', end_date='now').isoformat(),
            "purpose": "Fraud Investigation",
            "retention_days": 365
        }
        
        # In MoU config, we might need an institution for MuleHunter, let's use I4C
        secured_payload = tokenize_and_tag_payload(flag_event, "I4C", config)
        push_event("mulehunter_stream", secured_payload)
        
        print(f"Published MuleHunter flag for account (tokenized): {secured_payload.get('account_number')[:8]}...")
        time.sleep(0.1)

if __name__ == "__main__":
    run_mulehunter_producer()
