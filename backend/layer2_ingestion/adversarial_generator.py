import random
import time
from faker import Faker
from datetime import timedelta, datetime
from shared.account_pool import get_pool
from layer1_governance.tokenization import load_mou_config, tokenize_and_tag_payload
from layer2_ingestion.db_writer import push_event

fake = Faker('en_IN')
Faker.seed(99)
random.seed(99)

def generate_evasive_ring_transactions(ring, victim_acc, pool, base_time):
    txs = []
    current_time = base_time
    # Evasion tactic: small amounts just under reporting thresholds (e.g. 49999)
    # but here we'll use normal amounts spread over long times
    amount = round(random.uniform(5000, 25000), 2)
    
    # 1. Victim to Mule 1
    txs.append({
        "tx_id": f"TX-ADV-{fake.uuid4()[:6]}",
        "sender_account": victim_acc,
        "receiver_account": ring[0],
        "amount": amount,
        "tx_type": "TRANSFER",
        "timestamp": current_time.isoformat(),
        "device_id": f"DEV-{fake.uuid4()[:8]}",
        "purpose": "Fraud Investigation",
        "retention_days": 365
    })
    
    # 2. Evasive Mule chain (long delays, changing IPs/devices)
    for i in range(len(ring) - 1):
        # Long delay: 24-72 hours between hops to evade short-time window rules
        current_time += timedelta(hours=random.randint(24, 72))
        amount = round(amount * random.uniform(0.9, 0.99), 2)
        
        txs.append({
            "tx_id": f"TX-ADV-{fake.uuid4()[:6]}",
            "sender_account": ring[i],
            "receiver_account": ring[i+1],
            "amount": amount,
            "tx_type": "TRANSFER",
            "timestamp": current_time.isoformat(),
            "device_id": f"DEV-{fake.uuid4()[:8]}", # Never reuse device
            "purpose": "Fraud Investigation",
            "retention_days": 365
        })
        
    # 3. Final Mule to CASH_OUT at wide-radius ATM
    current_time += timedelta(hours=random.randint(24, 48))
    # Pick a completely random ATM (chaotic spatial behavior)
    atm = random.choice(pool['atms'])
    
    txs.append({
        "tx_id": f"TX-ADV-{fake.uuid4()[:6]}",
        "sender_account": ring[-1],
        "receiver_account": atm['atm_id'],
        "amount": amount,
        "tx_type": "CASH_OUT",
        "timestamp": current_time.isoformat(),
        "device_id": f"DEV-{fake.uuid4()[:8]}",
        "purpose": "Fraud Investigation",
        "retention_days": 365
    })
    
    # Generate Complaint
    complaint_ts = current_time + timedelta(hours=random.randint(12, 48))
    victim_obj = next(v for v in pool['victims'] if v['account_number'] == victim_acc)
    
    complaint = {
        "complaint_id": f"CMP-ADV-{fake.random_int(min=10000, max=99999)}",
        "victim_name": victim_obj['name'],
        "account_number": victim_obj['account_number'],
        "phone_number": victim_obj['phone_number'],
        "device_id": f"DEV-{fake.uuid4()[:8]}",
        "upi_id": victim_obj['upi_id'],
        "suspect_account": ring[0],
        "loss_amount": amount,
        "fraud_category": "ATM Cash Withdrawal Fraud",
        "timestamp": complaint_ts.isoformat(),
        "purpose": "Fraud Investigation",
        "retention_days": 365
    }
    
    return txs, complaint

def run_adversarial_producer():
    config = load_mou_config()
    pool = get_pool()
    
    print("Starting Adversarial Producer to SQLite events table...")
    
    for _ in range(20):
        ring = random.choice(pool['rings'])
        victim = random.choice(pool['victims'])['account_number']
        
        # Evasion tactic: mimics salary day (1st or 2nd of the month)
        base_time = datetime.now().replace(day=random.choice([1, 2, 28, 29]), hour=random.randint(9, 17))
        
        txs, complaint = generate_evasive_ring_transactions(ring, victim, pool, base_time)
        
        # Push TXs
        for tx in txs:
            secured_tx = tokenize_and_tag_payload(tx, "SBI", config)
            push_event("transaction_stream", secured_tx)
            
        # Push Complaint
        secured_cmp = tokenize_and_tag_payload(complaint, "I4C", config)
        push_event("complaint_stream", secured_cmp)
        
        print(f"Published Adversarial Case: {secured_cmp.get('complaint_id')}")

if __name__ == "__main__":
    run_adversarial_producer()
