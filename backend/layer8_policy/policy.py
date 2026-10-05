import yaml
from shared.env_loader import ACTION_POLICY_PATH

class ActionPolicyEngine:
    def __init__(self):
        with open(ACTION_POLICY_PATH, 'r') as f:
            self.policy = yaml.safe_load(f)
            
    def apply_policy(self, confidence_score: float, target_type: str, target_id: str) -> dict:
        """
        Maps a confidence score (0.0 to 1.0) to an action tier and enforces policy.
        """
        selected_tier_name = None
        selected_tier_config = None
        
        for tier_name, config in self.policy['tiers'].items():
            min_s = config['min_score']
            max_s = config['max_score']
            
            # The critical tier goes up to 1.0 inclusive
            if tier_name == 'Critical':
                if min_s <= confidence_score <= max_s:
                    selected_tier_name = tier_name
                    selected_tier_config = config
                    break
            else:
                if min_s <= confidence_score < max_s:
                    selected_tier_name = tier_name
                    selected_tier_config = config
                    break
                    
        if not selected_tier_config:
            # Fallback
            print(f"Warning: Score {confidence_score} did not match any tier. Defaulting to Low.")
            selected_tier_name = 'Low'
            selected_tier_config = self.policy['tiers']['Low']
            
        action_decision = {
            "target_type": target_type,
            "target_id": target_id,
            "confidence_score": round(confidence_score, 4),
            "tier": selected_tier_name,
            "response_action": selected_tier_config['response'],
            "notify_bank": selected_tier_config.get('notify_bank', False),
            "notify_police": selected_tier_config.get('notify_police', False),
            "escalation_required": selected_tier_config.get('escalation_required', False)
        }
        
        # Policy enforcement: Ensure AI doesn't execute autonomous blocks on Critical without human ack
        if selected_tier_name == 'Critical' and selected_tier_config.get('autonomous_action', False):
            print("POLICY VIOLATION DETECTED: Critical tier configured for autonomous action.")
            print("OVERRIDING: Forcing autonomous_action = False per safety guidelines.")
            action_decision['autonomous_action'] = False
        else:
            action_decision['autonomous_action'] = selected_tier_config.get('autonomous_action', False)
            
        return action_decision
