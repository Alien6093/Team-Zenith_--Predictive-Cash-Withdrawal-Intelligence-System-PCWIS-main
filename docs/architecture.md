# PCWIS Architecture: Technical Report

This document is a layer-by-layer architectural and technical report for the **Predictive Cash-Withdrawal Intelligence System (PCWIS)**. It describes the stack, what each layer does, and how data flows through the pipeline.

## 1. Tech Stack Overview & Rationale

### Backend & Machine Learning
*   **FastAPI & Uvicorn**: Chosen for the core API layer. FastAPI provides high performance, async capabilities, and automatic OpenAPI documentation, which is crucial for a microservice architecture.
*   **LightGBM**: Used for the core ranking engine (`Lambdarank`). Selected for its superior performance on tabular data, speed, and native support for pairwise ranking (NDCG optimization), which perfectly maps to ranking "hotspot candidates" by threat severity.
*   **Scikit-Learn (IsotonicRegression)**: Used to calibrate the raw outputs from LightGBM into true probabilities.
*   **PostgreSQL with PostGIS**: Enables high-performance geospatial queries (`ST_DWithin`, `ST_Distance`). Crucial for quickly finding candidate ATMs within a geographical radius of a crime location.
*   **SQLite**: Serves as a local/lightweight storage for predictions and active learning acknowledgments (officer feedback).
*   **NetworkX & Neo4j**: Powers the graph features (Layer 5). Used to compute network metrics like `in_degree`, `pagerank`, and `is_gateway` which are critical indicators of money muling and withdrawal networks.
*   **PyJWT**: Issues and verifies the bearer tokens that protect the API (Layer 9). Identifier tokenization is a separate concern handled in Layer 1 with HMAC.

### Frontend
*   **React (Vite)**: The frontend is built using Vite and React, chosen for rapid compilation and modern component-based UI architecture.
*   **Live API data**: The dashboard fetches metrics, cases, ATMs, inter-bank data and the audit log from the FastAPI service. Some demo endpoints (metrics, ATM risk scores, bank figures) include randomised values, so they illustrate the interface rather than report real measurements.

---

## 2. Layer-by-Layer Breakdown

The system is structured into 10 modular layers:

### Layer 1: Governance (`layer1_governance`)
Tokenizes every identifier (phone, account, device) with HMAC before it enters the pipeline, tags payloads according to the data-sharing MoU in `config/mou_config.yaml`, and runs the retention job that purges records past their retention window.

### Layer 2: Ingestion (`layer2_ingestion`)
Producers for complaints, transactions and mule-hunter flags (plus an adversarial generator for stress cases). Events are written to an `events` table in SQLite by `db_writer.py`, which acts as the prototype's event queue.

### Layer 3: Validation (`layer3_validation`)
Pydantic schemas reject malformed payloads, and entity resolution links records that refer to the same underlying account or device.

### Layer 4: Rules (`layer4_rules`)
A first-pass rule engine configured by `config/rule_config.yaml`. It drops events below the amount threshold, deprioritizes accounts that exceed the recurring-transfer limit, and passes the rest on.

### Layer 5: Graph (`layer5_graph`)
Constructs fraud graphs (nodes as accounts/ATMs/devices, edges as transactions), using NetworkX by default or Neo4j when configured. Computes critical network metrics:
*   `in_degree`: Number of suspicious transfers received.
*   `pagerank`: Centrality of an entity in the illicit flow.
*   `is_gateway`: Boolean indicating if a node acts as a central distribution/withdrawal point.

### Layer 6: Spatial (`layer6_spatial`)
**Integration with PostGIS**: The `CandidateGenerator` queries a PostGIS database to find candidate withdrawal locations (ATMs) near the origin of a complaint. 
*   **How it works**: Uses `ST_MakePoint` and `ST_DWithin` to filter ATMs within a set radius (e.g., 5km), and `ST_Distance` to compute exact distance.
*   **Fallback**: If the DB is down, it gracefully degrades to using `geopy.distance.geodesic` on an in-memory pool.

### Layer 7: Ranking (`layer7_ranking`)
The core ML prediction layer. 
*   **Model**: LightGBM trained with the `lambdarank` objective.
*   **Reason codes**: Extracts LightGBM feature contributions (`pred_contrib=True`) to provide human-readable "Reason Codes" for the predictions (e.g., explaining that an ATM is flagged primarily due to its `pagerank` or `distance_km`).

### Layer 8: Policy (`layer8_policy`)
Applies the tiers and recommended actions defined in `config/action_policy.yaml` (e.g., mapping scores above 0.7 to "Critical"). The policy only ever recommends; it never triggers an automatic freeze or dispatch.

### Layer 9: App (`layer9_app`)
The FastAPI service. It authenticates officers (reCAPTCHA plus JWT), serves the dashboard endpoints under `/api/demo`, and exposes `/api/alerts` for scored complaints.

### Layer 10: Evaluation (`layer10_eval`)
Logs each prediction against the observed cash-out location and reports ranking metrics such as MRR and distance error to `data/evaluation_logs.jsonl`.

---

## 3. Data Flow & Treatment

### Datasets and Features
The predictive model relies on a 6-dimensional feature vector for each candidate ATM/Account:
1.  `distance_km`: Spatial distance from the victim/complaint origin.
2.  `in_degree`: Count of incoming illicit funds.
3.  `total_received`: Financial volume.
4.  `is_gateway`: Flag for money-mule distribution points.
5.  `pagerank`: Graph-based risk centrality.
6.  `min_gateway_hops`: Network distance to the nearest known illicit gateway.

### Training Methodology & Active Learning
1.  **Data Extraction**: The `extract_training_data_from_db` function pulls historical predictions and matches them against an `acks` table.
2.  **Active Learning Weights**: 
    *   If an officer marks an alert as `Confirmed` or `Blocked`, the label becomes `1` (Fraud) and receives a **high sample weight** (3.0).
    *   If marked as `Rejected` or `False Alert`, the label becomes `0` (Safe) with a **lower weight** (0.5).
3.  **Model Training**: The data is grouped by `complaint_id` (since ranking compares candidates *within* the same complaint). LightGBM is trained to minimize NDCG loss across these groups.
4.  **Calibration**: Because LightGBM outputs uncalibrated scores, the system passes the raw predictions through an `IsotonicRegression` calibrator to map them into accurate `[0, 1]` probability bounds.

---

## 4. Key Integrations Summary

*   **PostGIS (Spatial Filtering)**: Acts as the top-of-funnel filter. Before the ML model evaluates anything, PostGIS rapidly reduces millions of global ATMs to just the 50 physically closest locations to a crime.
*   **NetworkX (Graph Topology)**: Acts as the feature engine. It continuously updates node importance (PageRank) based on money flows, transforming relational data into tabular features.
*   **LightGBM (Ranking)**: Acts as the decision engine. It takes the spatial candidates and their graph features, ranking them to surface the exact ATM a cybercriminal is statistically most likely to use for withdrawal.
