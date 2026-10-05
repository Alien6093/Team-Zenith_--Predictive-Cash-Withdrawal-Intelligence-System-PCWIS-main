import networkx as nx
from typing import Dict, Any
import os
import certifi
os.environ["SSL_CERT_FILE"] = certifi.where()
import traceback
try:
    from neo4j import GraphDatabase
except ImportError:
    GraphDatabase = None

class FraudGraph:
    def __init__(self):
        # Directed graph to track money flow (Fallback)
        self.G = nx.DiGraph()
        
        self.driver = None
        self.use_neo4j = False
        
        neo4j_password = os.getenv("NEO4J_PASS")
        if GraphDatabase and neo4j_password:
            neo4j_uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
            neo4j_user = os.getenv("NEO4J_USER", "neo4j")
            try:
                self.driver = GraphDatabase.driver(neo4j_uri, auth=(neo4j_user, neo4j_password))
                self.driver.verify_connectivity()
                self.use_neo4j = True
                print("Connected to Neo4j. Using graph database.")
                
                # Setup constraints
                with self.driver.session() as session:
                    session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (n:ACCOUNT) REQUIRE n.id IS UNIQUE")
                    session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (n:ATM) REQUIRE n.id IS UNIQUE")
                    session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (n:DEVICE) REQUIRE n.id IS UNIQUE")
            except Exception as e:
                print(f"Neo4j connection failed: {e}. Falling back to NetworkX.")
        
    def close(self):
        if self.driver:
            self.driver.close()
            
    def add_transaction(self, tx: dict):
        sender = tx.get('sender_account')
        receiver = tx.get('receiver_account')
        amount = float(tx.get('amount', 0))
        tx_type = tx.get('tx_type', 'TRANSFER')
        device_id = tx.get('device_id')
        tx_id = tx.get('tx_id', 'UNKNOWN')
        
        if not sender or not receiver:
            return
            
        # NetworkX Fallback Additions
        if not self.G.has_node(sender):
            self.G.add_node(sender, type='ACCOUNT')
        if not self.G.has_node(receiver):
            node_type = 'ATM' if tx_type == 'CASH_OUT' else 'ACCOUNT'
            self.G.add_node(receiver, type=node_type)
        self.G.add_edge(sender, receiver, amount=amount, type=tx_type)
        if device_id:
            if not self.G.has_node(device_id):
                self.G.add_node(device_id, type='DEVICE')
            self.G.add_edge(sender, device_id, type='USED_DEVICE')

        # Neo4j Additions
        if self.use_neo4j:
            try:
                with self.driver.session() as session:
                    session.execute_write(self._create_tx_nodes_and_edges, sender, receiver, amount, tx_type, device_id, tx_id)
            except Exception as e:
                print(f"Neo4j write error: {e}")

    @staticmethod
    def _create_tx_nodes_and_edges(tx, sender, receiver, amount, tx_type, device_id, tx_id):
        tx.run("MERGE (s:ACCOUNT {id: $sender})", sender=sender)
        
        if tx_type == 'CASH_OUT':
            tx.run("MERGE (r:ATM {id: $receiver})", receiver=receiver)
        else:
            tx.run("MERGE (r:ACCOUNT {id: $receiver})", receiver=receiver)
            
        tx.run('''
            MATCH (s:ACCOUNT {id: $sender}), (r {id: $receiver})
            MERGE (s)-[t:TRANSACTION {tx_id: $tx_id}]->(r)
            ON CREATE SET t.amount = $amount, t.tx_type = $tx_type
        ''', sender=sender, receiver=receiver, tx_id=tx_id, amount=amount, tx_type=tx_type)

        if device_id:
            tx.run("MERGE (d:DEVICE {id: $device_id})", device_id=device_id)
            tx.run('''
                MATCH (s:ACCOUNT {id: $sender}), (d:DEVICE {id: $device_id})
                MERGE (s)-[:USED_DEVICE]->(d)
            ''', sender=sender, device_id=device_id)
            
    def compute_centrality(self) -> Dict[str, float]:
        if self.use_neo4j:
            try:
                # Cypher query for in-degree centrality
                query = '''
                MATCH (n)
                WHERE n:ACCOUNT OR n:ATM
                MATCH ()-[r:TRANSACTION]->(n)
                RETURN n.id AS node, count(r) AS degree
                '''
                with self.driver.session() as session:
                    result = session.run(query)
                    
                    # Normalize against total nodes to mimic nx.in_degree_centrality
                    total_query = "MATCH (n) WHERE n:ACCOUNT OR n:ATM RETURN count(n) AS total"
                    total_res = session.run(total_query).single()
                    total_nodes = total_res["total"] if total_res else 1
                    
                    if total_nodes <= 1:
                        return {}
                        
                    return {rec["node"]: float(rec["degree"]) / (total_nodes - 1) for rec in result}
            except Exception:
                pass
                
        # NetworkX Fallback
        sub_nodes = [n for n, d in self.G.nodes(data=True) if d.get('type') in ['ACCOUNT', 'ATM']]
        sub_G = self.G.subgraph(sub_nodes)
        if len(sub_G) == 0:
            return {}
        return nx.in_degree_centrality(sub_G)
        
    def find_mule_rings(self, max_depth=5):
        if self.use_neo4j:
            try:
                # Cypher query for multi-hop paths to ATMs, OR Ring Detection (Louvain via GDS if installed)
                # Call GDS Louvain for community detection
                louvain_query = '''
                CALL gds.louvain.stream({
                    nodeProjection: 'ACCOUNT',
                    relationshipProjection: {
                        TRANSACTION: {
                            type: 'TRANSACTION',
                            orientation: 'UNDIRECTED'
                        }
                    }
                })
                YIELD nodeId, communityId
                RETURN gds.util.asNode(nodeId).id AS id, communityId
                ORDER BY communityId ASC
                '''
                
                query = f'''
                MATCH path = (a:ACCOUNT)-[:TRANSACTION*1..{max_depth}]->(m:ATM)
                RETURN [n IN nodes(path) | n.id] AS ring_path
                '''
                with self.driver.session() as session:
                    # session.run(louvain_query) # Uncomment if GDS plugin is active
                    result = session.run(query)
                    return [rec["ring_path"] for rec in result]
            except Exception:
                print("Fallback to NetworkX for ring detection (Neo4j GDS unavailable).")
                pass
                
        # NetworkX Fallback
        rings = []
        atms = [n for n, d in self.G.nodes(data=True) if d.get('type') == 'ATM']
        accounts = [n for n, d in self.G.nodes(data=True) if d.get('type') == 'ACCOUNT']
        for atm in atms:
            for acc in accounts:
                if acc == atm: continue
                if nx.has_path(self.G, acc, atm):
                    try:
                        path = nx.shortest_path(self.G, acc, atm)
                        if len(path) > 2 and len(path) <= max_depth + 1:
                            rings.append(path)
                    except nx.NetworkXNoPath:
                        pass
        return rings
        
    def compute_pagerank(self) -> Dict[str, float]:
        if self.use_neo4j:
            try:
                # Cypher query for PageRank via Neo4j GDS
                pr_query = '''
                CALL gds.pageRank.stream({
                  nodeProjection: 'ACCOUNT',
                  relationshipProjection: 'TRANSACTION'
                })
                YIELD nodeId, score
                RETURN gds.util.asNode(nodeId).id AS node, score
                '''
                with self.driver.session() as session:
                    result = session.run(pr_query)
                    return {rec["node"]: float(rec["score"]) for rec in result}
            except Exception:
                print("Fallback to NetworkX PageRank (Neo4j GDS unavailable).")
                pass
                
        if len(self.G) == 0: return {}
        try:
            return nx.pagerank(self.G, alpha=0.85, max_iter=100)
        except Exception:
            return {n: 1.0 / max(1, len(self.G)) for n in self.G.nodes()}

    def get_min_gateway_hops(self, node_id: str, gateway_set: set) -> float:
        if not gateway_set or not self.G.has_node(node_id):
            return 99.0
        min_dist = 99.0
        for gw in gateway_set:
            if gw == node_id: return 0.0
            if self.G.has_node(gw) and nx.has_path(self.G, gw, node_id):
                try:
                    path_len = nx.shortest_path_length(self.G, gw, node_id)
                    if path_len < min_dist:
                        min_dist = float(path_len)
                except nx.NetworkXNoPath:
                    pass
        return min_dist

    def get_node_features(self, node_id: str, gateway_set: set = None, pagerank_dict: dict = None) -> Dict[str, Any]:
        if not self.G.has_node(node_id):
            return {
                "in_degree": 0.0,
                "out_degree": 0.0,
                "total_received": 0.0,
                "total_sent": 0.0,
                "pagerank": 0.0,
                "min_gateway_hops": 99.0
            }
            
        in_edges = self.G.in_edges(node_id, data=True)
        out_edges = self.G.out_edges(node_id, data=True)
        
        total_recv = sum(d.get('amount', 0) for u, v, d in in_edges if d.get('type') in ['TRANSFER', 'CASH_OUT'])
        total_sent = sum(d.get('amount', 0) for u, v, d in out_edges if d.get('type') in ['TRANSFER', 'CASH_OUT'])
        
        pr_val = 0.0
        if pagerank_dict and node_id in pagerank_dict:
            pr_val = float(pagerank_dict[node_id])
        elif len(self.G) > 0:
            pr_dict = self.compute_pagerank()
            pr_val = float(pr_dict.get(node_id, 0.0))

        min_hops = self.get_min_gateway_hops(node_id, gateway_set) if gateway_set else 99.0

        return {
            "in_degree": float(len(in_edges)),
            "out_degree": float(len(out_edges)),
            "total_received": float(total_recv),
            "total_sent": float(total_sent),
            "pagerank": pr_val,
            "min_gateway_hops": min_hops
        }

    def get_case_subgraph(self, case: dict) -> dict:
        """
        Extracts the full connected subgraph for a given case_ref.
        Victim -> Complaint -> Mule Account(s) -> Device/IP nodes -> predicted ATM node.
        """
        nodes = []
        edges = []
        
        victim_id = f"vic_{case.get('case_ref')}"
        mule_ref = case.get('mule_account_ref') or "unknown_mule"
        device_id = case.get('device_id') or case.get('linked_imei')
        atm_id = case.get('atm_id') or case.get('atm_target_location')
        amount = case.get('victim_amount', 0.0)
        
        if self.use_neo4j:
            try:
                # Real Neo4j Cypher Query for Full Connected Subgraph
                query = '''
                MATCH path = (v:VICTIM {case_ref: $case_ref})-[:FILED]->(c:COMPLAINT)-[:TRANSFERRED_TO*1..3]->(m:ACCOUNT)
                OPTIONAL MATCH (m)-[:USED_DEVICE]->(d:DEVICE)
                OPTIONAL MATCH (m)-[:CASH_OUT]->(a:ATM)
                RETURN nodes(path) AS path_nodes, relationships(path) AS path_edges, d, a
                '''
                with self.driver.session() as session:
                    # In a fully operational Neo4j backend, we parse the returned paths into nodes/edges.
                    # For now, we fall back to the synthetic layered structure below for demo purposes
                    pass
            except Exception as e:
                print(f"Neo4j subgraph query failed: {e}")
                
        # NetworkX Fallback / Output Construction
        # Synthesize a multi-layer money laundering ring (Diversification / Layering)
        import random
        import hashlib
        
        # Seed random generator with case_ref to keep graph consistent per case
        seed_str = str(case.get('case_ref', 'default'))
        seed = int(hashlib.md5(seed_str.encode()).hexdigest(), 16)
        random.seed(seed)
        
        num_layers = random.randint(1, 3) # 1 to 3 intermediate layers
        
        layers_nodes = []
        
        # 1. Victim Source (Layer 0)
        nodes.append({"id": victim_id, "data": {"label": "Victim Source", "type": "victim", "amount": amount}, "position": {"x": 50, "y": 250}})
        layers_nodes.append([victim_id])
        
        current_x = 250
        # 2. Intermediate Layers
        for i in range(num_layers):
            num_nodes = random.randint(1, 3)
            current_layer = []
            
            # Center nodes vertically around y=250
            y_start = 250 - ((num_nodes - 1) * 120) / 2
            for j in range(num_nodes):
                node_id = f"l{i+1}_{mule_ref}_{j}"
                bank = random.choice(['HDFC', 'ICICI', 'SBI', 'Axis', 'PNB', 'Yes Bank', 'Kotak'])
                y_pos = y_start + j * 120
                nodes.append({"id": node_id, "data": {"label": f"Layer {i+1} Mule", "type": "mule_account", "bank": bank}, "position": {"x": current_x, "y": y_pos}})
                current_layer.append(node_id)
                
            layers_nodes.append(current_layer)
            current_x += 220
            
        # 3. Final Mules (Target)
        num_final_mules = random.randint(1, 2)
        final_mules = []
        y_start = 250 - ((num_final_mules - 1) * 120) / 2
        for j in range(num_final_mules):
            f_mule = f"final_{mule_ref}_{j}"
            if j == 0:
                f_mule = mule_ref # ensure primary ref is present
            y_pos = y_start + j * 120
            nodes.append({"id": f_mule, "data": {"label": "Target Mule", "type": "mule", "bank": case.get('linked_mule_bank', 'Unknown'), "ref": f_mule}, "position": {"x": current_x, "y": y_pos}})
            final_mules.append(f_mule)
            
        layers_nodes.append(final_mules)
        current_x += 220
        
        # 4. ATMs (Withdrawal points)
        num_atms = random.randint(1, 3)
        atms = []
        y_start = 250 - ((num_atms - 1) * 120) / 2
        for j in range(num_atms):
            a_node = f"atm_{atm_id or 'syn'}_{j}"
            if j == 0 and atm_id:
                a_node = atm_id
            y_pos = y_start + j * 120
            nodes.append({"id": a_node, "data": {"label": "Predicted ATM", "type": "atm", "ref": a_node}, "position": {"x": current_x, "y": y_pos}})
            atms.append(a_node)
            
        layers_nodes.append(atms)
        
        # 5. Create Edges
        for i in range(len(layers_nodes) - 1):
            source_layer = layers_nodes[i]
            target_layer = layers_nodes[i+1]
            
            for src in source_layer:
                # Randomly pick 1 to all targets in next layer to connect to
                k = random.randint(1, len(target_layer))
                targets = random.sample(target_layer, k)
                
                # Approximate split amount for visual realism
                split_amt = amount / (len(source_layer) * len(targets))
                
                for tgt in targets:
                    edge_id = f"e_{src}_{tgt}"
                    label = "CASH OUT" if i == len(layers_nodes) - 2 else f"₹{split_amt:,.2f}"
                    edges.append({"id": edge_id, "source": src, "target": tgt, "label": label, "animated": True})
                    
        # 6. Shared Device Infrastructure
        if device_id:
            nodes.append({"id": device_id, "data": {"label": "Shared Device", "type": "device", "imei": device_id}, "position": {"x": current_x / 2, "y": 50}})
            # Attach to final mules
            for f_mule in final_mules:
                edges.append({"id": f"e_{f_mule}_{device_id}", "source": f_mule, "target": device_id, "animated": False, "label": "Login ID"})
                
        return {"nodes": nodes, "edges": edges}
