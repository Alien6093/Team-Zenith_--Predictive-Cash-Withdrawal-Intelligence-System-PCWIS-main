# Cybercrime Predictive Framework: Context & Technical Report

This document is a layer-by-layer architectural and technical report for the **Cybercrime Predictive Framework** (PCWIS). It describes the stack, what each layer does, and how data flows through the pipeline.

## 1. Tech Stack Overview & Rationale

### Backend & Machine Learning
*   **FastAPI & Uvicorn**: Chosen for the core API layer. FastAPI provides high performance, async capabilities, and automatic OpenAPI documentation, which is crucial for a microservice architecture.
*   **LightGBM**: Used for the core ranking engine (`Lambdarank`). Selected for its superior performance on tabular data, speed, and native support for pairwise ranking (NDCG optimization), which perfectly maps to ranking "hotspot candidates" by threat severity.
*   **Scikit-Learn (IsotonicRegression)**: Used to calibrate the raw outputs from LightGBM into true probabilities.
*   **PostgreSQL with PostGIS**: Enables high-performance geospatial queries (`ST_DWithin`, `ST_Distance`). Crucial for quickly finding candidate ATMs within a geographical radius of a crime location.
*   **SQLite**: Serves as a local/lightweight storage for predictions and active learning acknowledgments (officer feedback).
*   **NetworkX & Neo4j**: Powers the graph features (Layer 5). Used to compute network metrics like `in_degree`, `pagerank`, and `is_gateway` which are critical indicators of money muling and withdrawal networks.
*   **PyJWT**: Handles secure tokenization and API authentication (Layer 1 Governance).

### Frontend
*   **React (Vite)**: The frontend is built using Vite and React, chosen for rapid compilation and modern component-based UI architecture.
*   **JSON Data Mocks**: Uses structured JSON files (e.g., `auditLogs.json`, `complaints.json`, `hotspots.json`) to hydrate the dashboard with graphs and metrics, illustrating KPIs, complaint trends, and GNN (Graph Neural Network) visualizations.

---

## 2. Layer-by-Layer Breakdown

The system is structured into 9 modular layers:

### Layer 1: Governance (`layer1_governance`)
Handles system security, tokenization, and auth. Uses JWT to secure the API, ensuring that only authorized officers can query risk predictions or submit feedback.

### Layer 2 & 3: Behavior & ML Features (`layer2_behavior`, `layer3_ml`)
Focuses on feature engineering. Translates raw transaction and complaint data into structured ML features.

### Layer 4 & 5: Ensembles & Graph (`layer4_ensembles`, `layer5_graph`)
Constructs fraud graphs (nodes as accounts/ATMs, edges as transactions). Computes critical network metrics:
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
*   **SHAP Integration**: Extracts feature contributions (`pred_contrib=True`) to provide human-readable "Reason Codes" for the predictions (e.g., explaining that an ATM is flagged primarily due to its `pagerank` or `distance_km`).

### Layer 8 & 9: Policy & App (`layer8_policy`, `layer9_app`)
*   **Policy**: Applies business logic thresholds (e.g., mapping scores > 0.7 to "Critical" tier).
*   **App**: The FastAPI entry point exposing `/predict` endpoints and integrating all underlying layers into a unified HTTP interface.

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
