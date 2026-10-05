import yaml
from collections import defaultdict
from shared.env_loader import RULE_CONFIG_PATH
from layer1_governance.tokenization import tokenize_value

class RuleEngine:
    def __init__(self):
        with open(RULE_CONFIG_PATH, "r") as f:
            self.config = yaml.safe_load(f)
            
        self.min_amount = self.config['thresholds']['min_transaction_amount']
        self.recurring_limit = self.config['thresholds']['recurring_tx_limit']
        
        # Hash the whitelist entries so they match the tokenized payloads
        raw_whitelist = self.config['whitelist_merchants']
        self.hashed_whitelist = {tokenize_value(m) for m in raw_whitelist}
        
        # In-memory counter for recurring transactions (sender -> receiver)
        # In production this would be a Redis counter with a 30-day TTL
        self.tx_counts = defaultdict(int)
        
    def evaluate(self, event_type: str, payload_dict: dict) -> dict:
        """
        Returns a dict indicating if the event should be dropped or deprioritized.
        { "action": "DROP" | "PASS" | "DEPRIORITIZE", "reason": str }
        """
        # Complaints and MuleHunter flags always pass
        if event_type in ["COMPLAINT", "MULE_FLAG"]:
            return {"action": "PASS", "reason": ""}
            
        # For transactions
        amount = payload_dict.get('amount', 0)
        sender = payload_dict.get('sender_account')
        receiver = payload_dict.get('receiver_account')
        
        # 1. Amount Threshold
        if amount < self.min_amount:
            return {"action": "DROP", "reason": f"Drops frequent small transfers under ₹{self.min_amount:,.0f}"}
            
        # 2. Whitelist Check (e.g. Utility companies)
        if receiver in self.hashed_whitelist:
            return {"action": "DROP", "reason": "Receiver matches trusted whitelist (Utility/Govt)"}
            
        # 3. Recurring Pattern Check
        if sender and receiver:
            pair_key = f"{sender}:{receiver}"
            self.tx_counts[pair_key] += 1
            if self.tx_counts[pair_key] > self.recurring_limit:
                return {"action": "DEPRIORITIZE", "reason": f"Deprioritized: Exceeds {self.recurring_limit} recurring transfers to same recipient in 30d window"}
                
        # 4. High Risk Rule
        if amount > 500000:
            return {"action": "PRIORITIZE", "reason": "Prioritized: High-risk capital flight (Amount > ₹500,000)"}
                
        return {"action": "PASS", "reason": "Passed standard validation checks"}
