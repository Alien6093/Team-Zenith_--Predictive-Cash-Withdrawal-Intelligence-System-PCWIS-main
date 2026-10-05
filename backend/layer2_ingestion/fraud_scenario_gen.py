import random
import time
from faker import Faker
from datetime import timedelta
from shared.account_pool import get_pool

fake = Faker('en_IN')
Faker.seed(42)
random.seed(42)

# Cache ring profiles
_ring_profiles = {}

def get_ring_profile(ring_idx, pool):
    if ring_idx in _ring_profiles:
        return _ring_profiles[ring_idx]
        
    # Determine ring behavior
    roll = random.random()
    if roll < 0.75:
        pattern = "disciplined"
        # Picks 2-4 ATMs close to each other
        base_atm = random.choice(pool['atms'])
        preferred_atms = [base_atm]
        # Find 2-3 other ATMs in the same city
        same_city_atms = [a for a in pool['atms'] if a['city'] == base_atm['city']]
        random.shuffle(same_city_atms)
        preferred_atms.extend(same_city_atms[:random.randint(1, 3)])
    else:
        pattern = "chaotic"
        # Picks ATMs totally randomly across cities
        preferred_atms = random.sample(pool['atms'], random.randint(5, 15))
        
    _ring_profiles[ring_idx] = {
        "pattern": pattern,
        "preferred_atms": preferred_atms
    }
    return _ring_profiles[ring_idx]

def inject_noise(record, field_name, null_chance=0.1):
    if random.random() < null_chance:
        record[field_name] = None
    return record

def generate_cash_withdrawal_fraud_case(ring_idx, pool, base_time):
    ring = pool['rings'][ring_idx]
    victim = random.choice(pool['victims'])
    
    profile = get_ring_profile(ring_idx, pool)
    
    # Select ATM based on profile
    if profile['pattern'] == 'disciplined':
        atm = random.choice(profile['preferred_atms'])
    else:
        atm = random.choice(profile['preferred_atms'] if random.random() < 0.8 else pool['atms'])
        
    # Transactions
    txs = []
    current_time = base_time
    amount = round(random.uniform(10000, 50000), 2)
    
    # Victim to Mule 1
    tx_1 = {
        "tx_id": f"TX-{fake.uuid4()[:8]}",
        "sender_account": victim['account_number'],
        "receiver_account": ring[0],
        "amount": amount,
        "tx_type": "TRANSFER",
        "timestamp": current_time.isoformat(),
        "device_id": f"DEV-{fake.uuid4()[:8]}"
    }
    txs.append(inject_noise(tx_1, 'device_id', 0.15))
    
    # Mule chain
    for i in range(len(ring) - 1):
        current_time += timedelta(minutes=random.randint(5, 60))
        ts = current_time.isoformat()
            
        amount = round(amount * random.uniform(0.9, 0.99), 2)
        tx = {
            "tx_id": f"TX-{fake.uuid4()[:8]}",
            "sender_account": ring[i],
            "receiver_account": ring[i+1],
            "amount": amount,
            "tx_type": "TRANSFER",
            "timestamp": ts,
            "device_id": f"DEV-{fake.uuid4()[:8]}"
        }
        txs.append(inject_noise(tx, 'device_id', 0.15))
        
    # Cash Out
    current_time += timedelta(minutes=random.randint(30, 120))
    cash_out = {
        "tx_id": f"TX-{fake.uuid4()[:8]}",
        "sender_account": ring[-1],
        "receiver_account": atm['atm_id'],
        "amount": amount,
        "tx_type": "CASH_OUT",
        "timestamp": current_time.isoformat(),
        "device_id": f"DEV-{fake.uuid4()[:8]}"
    }
    txs.append(inject_noise(cash_out, 'device_id', 0.15))
    
    # Complaint
    complaint_ts = current_time + timedelta(hours=random.randint(1, 48))
    complaint = {
        "complaint_id": f"CMP-{fake.random_int(min=10000, max=99999)}",
        "victim_name": victim['name'],
        "account_number": victim['account_number'],
        "phone_number": victim['phone_number'],
        "device_id": f"DEV-{fake.uuid4()[:8]}",
        "upi_id": victim['upi_id'],
        "suspect_account": ring[0],
        "loss_amount": amount,
        "fraud_category": "ATM Cash Withdrawal Fraud",
        "timestamp": complaint_ts.isoformat()
    }
    
    return txs, complaint
