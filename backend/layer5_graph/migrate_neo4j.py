import sqlite3
import json
import random
from pathlib import Path
from dotenv import load_dotenv
import sys

# Add parent directory to path so we can import layer5_graph
sys.path.append(str(Path(__file__).resolve().parent.parent))
from layer5_graph.fraud_graph import FraudGraph

load_dotenv(Path(__file__).resolve().parent.parent / '.env')

def migrate_data():
    print("Starting Neo4j data migration...")
    
    # 1. Initialize Graph
    graph = FraudGraph()
    if not graph.use_neo4j:
        print("Error: Could not connect to Neo4j. Check credentials.")
        return
        
    print("Connected to Neo4j.")
    
    # 2. Load ATMs
    pool_file = Path(__file__).resolve().parent.parent / "data" / "account_pool.json"
    atms = []
    if pool_file.exists():
        with open(pool_file, 'r') as f:
            pool = json.load(f)
            atms = pool.get('atms', [])
    
    atm_ids = [atm.get('atm_id') for atm in atms if atm.get('atm_id')]
    
    # 3. Load Complaints
    db_path = Path(__file__).resolve().parent.parent / "cybercrime.db"
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM demo_complaints")
    complaints = cursor.fetchall()
    
    print(f"Migrating {len(complaints)} complaints into graph nodes and relationships...")
    
    for case in complaints:
        case_dict = dict(case)
        victim_id = f"vic_{case_dict.get('case_ref')}"
        mule_ref = case_dict.get('mule_account_ref') or f"unknown_mule_{random.randint(1000, 9999)}"
        amount = float(case_dict.get('victim_amount', 0.0))
        
        # Select a random ATM
        atm_id = random.choice(atm_ids) if atm_ids else f"ATM-DEMO-{random.randint(100, 999)}"
        device_id = f"DEV-{random.randint(10000, 99999)}"
        
        # Transaction 1: Victim -> Mule (TRANSFER)
        tx1 = {
            'sender_account': victim_id,
            'receiver_account': mule_ref,
            'amount': amount,
            'tx_type': 'TRANSFER',
            'device_id': device_id,
            'tx_id': f"TX_{case_dict.get('case_ref')}_1"
        }
        graph.add_transaction(tx1)
        
        # Transaction 2: Mule -> ATM (CASH_OUT)
        tx2 = {
            'sender_account': mule_ref,
            'receiver_account': atm_id,
            'amount': amount,
            'tx_type': 'CASH_OUT',
            'tx_id': f"TX_{case_dict.get('case_ref')}_2"
        }
        graph.add_transaction(tx2)
        
        # Add original complaint node connection
        with graph.driver.session() as session:
            session.run('''
                MATCH (v:ACCOUNT {id: $victim_id})
                MERGE (c:COMPLAINT {case_ref: $case_ref})
                MERGE (v)-[:FILED]->(c)
                
                WITH c
                MATCH (m:ACCOUNT {id: $mule_ref})
                MERGE (c)-[:TRANSFERRED_TO]->(m)
            ''', victim_id=victim_id, case_ref=case_dict.get('case_ref'), mule_ref=mule_ref)
            
    # Set the VICTIM label for victims since add_transaction uses ACCOUNT by default
    with graph.driver.session() as session:
        session.run("MATCH (v:ACCOUNT) WHERE v.id STARTS WITH 'vic_' SET v:VICTIM REMOVE v:ACCOUNT")

    print("Migration completed successfully.")
    graph.close()
    conn.close()

if __name__ == "__main__":
    migrate_data()
