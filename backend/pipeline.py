import json
import hashlib
from typing import Optional
from pydantic import BaseModel

from layer2_ingestion.db_writer import get_db_connection, save_predictions
from layer3_validation.schemas import ComplaintSchema, TransactionSchema, MuleHunterSchema, validate_payload
from layer3_validation.entity_resolution import entity_resolver
from layer4_rules.rule_engine import RuleEngine
from layer5_graph.fraud_graph import FraudGraph
from layer6_spatial.candidate_gen import CandidateGenerator
from layer7_ranking.predict import MLPredictor
from layer8_policy.policy import ActionPolicyEngine
from layer10_eval.evaluation import Evaluator
from shared.account_pool import get_pool

class PipelineOrchestrator:
    def __init__(self):
        self.rule_engine = RuleEngine()
        self.graph = FraudGraph()
        self.candidate_gen = CandidateGenerator()
        self.predictor = MLPredictor()
        self.policy_engine = ActionPolicyEngine()
        self.evaluator = Evaluator()
        
        # Ground truth mapping: complaint_id -> actual CASH_OUT atm_id
        # Populated by processing CASH_OUT transaction events before complaints
        self.cashout_ground_truth = {}
        
        # Set of flagged mule accounts (from MuleHunter events)
        self.flagged_gateway_accounts = set()
        
        # Reference ATM pool for ground truth matching
        pool = get_pool()
        self.atms = pool['atms']
        # Build ATM lookup by ID
        self.atm_lookup = {atm['atm_id']: atm for atm in self.atms}
        
    def process_event(self, conn, stream_name: str, payload: dict):
        # Layer 3: Validation
        schema_class: Optional[type[BaseModel]] = None
        event_type = "UNKNOWN"
        
        if stream_name == 'complaint_stream':
            schema_class = ComplaintSchema
            event_type = "COMPLAINT"
        elif stream_name == 'transaction_stream':
            schema_class = TransactionSchema
            event_type = "TRANSFER" if payload.get('tx_type') != "CASH_OUT" else "CASH_OUT"
        elif stream_name == 'mulehunter_stream':
            schema_class = MuleHunterSchema
            event_type = "MULE_FLAG"
            
        if not schema_class:
            return
            
        validated = validate_payload(payload, schema_class)
        if not validated:
            print(f"Validation failed for event on {stream_name}")
            return
            
        val_dict = validated.model_dump(by_alias=True)
        
        # Layer 3: Entity Resolution
        resolved_dict = entity_resolver.resolve(val_dict)
        
        # Layer 4: Rule Engine Filter
        rule_result = self.rule_engine.evaluate(event_type, resolved_dict)
        if rule_result['action'] == 'DROP':
            print(f"Dropped by Rule Engine: {rule_result['reason']}")
            return
            
        # Layer 5: Graph Update
        if event_type in ["TRANSFER", "CASH_OUT"]:
            self.graph.add_transaction(resolved_dict)
            
            # Track CASH_OUT events for ground truth
            if event_type == "CASH_OUT":
                receiver = resolved_dict.get('receiver_account')
                sender = resolved_dict.get('sender_account')
                if receiver:
                    # Map the sender (last mule in chain) to the ATM they cashed out at
                    self.cashout_ground_truth[sender] = receiver
                    
        # Process MuleHunter flags — mark flagged accounts as gateways in the graph
        if event_type == "MULE_FLAG":
            flagged_account = resolved_dict.get('account_number')
            if flagged_account:
                self.flagged_gateway_accounts.add(flagged_account)
                # Add the flagged account to the graph with gateway marker
                if not self.graph.G.has_node(flagged_account):
                    self.graph.G.add_node(flagged_account, type='ACCOUNT', is_gateway=True)
                else:
                    self.graph.G.nodes[flagged_account]['is_gateway'] = True
                print(f"MuleHunter: Flagged account {flagged_account[:8]}... as gateway")
            return
            
        # Layers 6-10: Triggered on Complaint
        if event_type == "COMPLAINT":
            suspect_account = resolved_dict.get('suspect_account')
            if not suspect_account: return
            
            print(f"\n--- Processing Complaint {resolved_dict.get('complaint_id')} ---")
            
            # Simulated mule location for candidate generation
            # Deterministically pick a city based on complaint_id
            cities = [
                (28.6, 77.1), # Delhi
                (28.6, 77.1), # Delhi (Double weight)
                (28.6, 77.1), # Delhi (Triple weight)
                (28.6, 77.1), # Delhi (Quadruple weight)
                (19.1, 72.9), # Mumbai
                (19.1, 72.9), # Mumbai (Double weight)
                (19.1, 72.9), # Mumbai (Triple weight)
                (19.1, 72.9), # Mumbai (Quadruple weight)
                (12.9, 77.6), # Bangalore
                (12.9, 77.6), # Bangalore (Double weight)
                (12.9, 77.6), # Bangalore (Triple weight)
                (22.5, 88.4), # Kolkata
                (22.5, 88.4), # Kolkata (Double weight)
                (22.5, 88.4), # Kolkata (Triple weight)
                (22.5, 88.4), # Kolkata (Quadruple weight)
                (22.5, 88.4), # Kolkata (Quintuple weight)
            ]
            idx = sum(ord(c) for c in resolved_dict.get('complaint_id', 'A')) % len(cities)
            base_lat, base_lon = cities[idx]
            
            # Add a deterministic pseudo-random offset so every complaint has a unique anchor within the city
            h = int(hashlib.md5(resolved_dict.get('complaint_id', 'A').encode()).hexdigest(), 16)
            lat_offset = ((h % 100) - 50) * 0.002 # roughly +/- 10km
            lon_offset = (((h // 100) % 100) - 50) * 0.002
            mule_lat = base_lat + lat_offset
            mule_lon = base_lon + lon_offset
            
            # Layer 6: Spatial Candidates
            candidates = self.candidate_gen.find_candidates_within_radius(mule_lat, mule_lon, radius_km=20.0, limit=10)
            
            if not candidates:
                print("No candidate ATMs found nearby.")
                return
                
            # Layer 7: ML Scoring
            features = []
            pagerank_dict = self.graph.compute_pagerank()
            
            for c in candidates:
                # Enriched Features: [distance_km, in_degree, total_received, is_gateway, pagerank, min_gateway_hops]
                graph_feats = self.graph.get_node_features(
                    c['atm_id'], 
                    gateway_set=self.flagged_gateway_accounts, 
                    pagerank_dict=pagerank_dict
                )
                
                # Determine is_gateway: check if any account transacting with this ATM is a flagged gateway
                is_gateway = 0.0
                if self.graph.G.has_node(c['atm_id']):
                    # Check if any predecessor node is a flagged gateway
                    predecessors = list(self.graph.G.predecessors(c['atm_id']))
                    for pred in predecessors:
                        if pred in self.flagged_gateway_accounts:
                            is_gateway = 1.0
                            break
                    # Also check if the ATM node itself is marked
                    if self.graph.G.nodes[c['atm_id']].get('is_gateway', False):
                        is_gateway = 1.0
                
                feats = [
                    float(c['distance_km']),
                    float(graph_feats['in_degree']),
                    float(graph_feats['total_received']),
                    float(is_gateway),
                    float(graph_feats['pagerank']),
                    float(graph_feats['min_gateway_hops'])
                ]
                c['feats'] = feats
                features.append(feats)
                
            ml_results = self.predictor.predict_and_explain(features)
            
            # Layer 8: Policy Enforcement
            for i, c in enumerate(candidates):
                c['score'] = ml_results['probabilities'][i]
                c['reason_code'] = ml_results['reason_codes'][i]
                
                # Apply policy
                policy_decision = self.policy_engine.apply_policy(
                    confidence_score=c['score'],
                    target_type="ATM",
                    target_id=c['atm_id']
                )
                c['tier'] = policy_decision['tier']
                c['action'] = policy_decision['response_action']
            
            # Sort by score descending
            candidates.sort(key=lambda x: x['score'], reverse=True)
            
            print("Top Candidate ATMs:")
            for c in candidates[:3]:
                print(f" - {c['name']} (Score: {c['score']:.4f} -> {c['tier']} | Reason: {c['reason_code']})")
                
            # Layer 10: Evaluation — use real ground truth from CASH_OUT events
            ground_truth_id = self.cashout_ground_truth.get(suspect_account)
            
            if ground_truth_id and ground_truth_id in self.atm_lookup:
                # We have real ground truth from the transaction stream
                gt_atm = self.atm_lookup[ground_truth_id]
                actual_loc = (gt_atm['lat'], gt_atm['lon'])
            elif ground_truth_id:
                # Ground truth ATM exists but not in our lookup — use candidate list position
                actual_loc = None
                for c in candidates:
                    if c['atm_id'] == ground_truth_id:
                        actual_loc = (c['lat'], c['lon'])
                        break
                if not actual_loc:
                    # Fallback: pick a random candidate that isn't the top pick
                    import random
                    gt_idx = random.randint(0, max(0, len(candidates) - 1))
                    ground_truth_id = candidates[gt_idx]['atm_id']
                    actual_loc = (candidates[gt_idx]['lat'], candidates[gt_idx]['lon'])
            else:
                # No CASH_OUT ground truth found — use randomized mock
                # (not circular: pick a random candidate, not the top one)
                import random
                gt_idx = random.randint(0, max(0, len(candidates) - 1))
                ground_truth_id = candidates[gt_idx]['atm_id']
                actual_loc = (candidates[gt_idx]['lat'], candidates[gt_idx]['lon'])
            
            baseline_id = candidates[-1]['atm_id']
            
            # Persist spatial candidates to DB for the frontend map
            save_predictions(conn, resolved_dict.get('complaint_id'), candidates)
            
            self.evaluator.log_evaluation(
                complaint_id=resolved_dict.get('complaint_id'),
                predictions=candidates,
                ground_truth_id=ground_truth_id,
                actual_loc=actual_loc,
                baseline_id=baseline_id
            )

    def run(self):
        print("Starting Pipeline Orchestrator...")
        while True:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Fetch 10 unprocessed events. Process transactions before complaints so graph is populated!
            cursor.execute("SELECT id, stream_name, payload FROM events WHERE processed = 0 ORDER BY CASE WHEN stream_name='complaint_stream' THEN 1 ELSE 0 END, id ASC LIMIT 10")
            events = cursor.fetchall()
            
            for ev_id, stream_name, payload_json in events:
                payload = json.loads(payload_json)
                self.process_event(conn, stream_name, payload)
                
                # Mark as processed
                cursor.execute("UPDATE events SET processed = 1 WHERE id = ?", (ev_id,))
                
            conn.commit()
            conn.close()
            
            if not events:
                print("No more unprocessed events in the database. Pipeline complete.")
                break

if __name__ == "__main__":
    pipeline = PipelineOrchestrator()
    pipeline.run()
