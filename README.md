# PCWIS — Predictive Cash-Withdrawal Intelligence System

*A graph-and-geospatial decision-support layer for cybercrime fund-flow forecasting.*

> **A note before anything else:** every number, case record, and account reference in
> this repository is synthetic. Nothing here is trained on, tested against, or connected
> to real financial or personal data. This is a research prototype, and it's built and
> presented as one.

---

## Why this exists

Most fraud-detection software answers one question well: *is this account suspicious?*
Rule engines flag it, a compliance officer reviews it, and the case moves into an
investigation queue. That part of the problem is mature — banks and regulators have
spent years building it, and it works.

What almost nothing answers is the next question: *given that this account is already
flagged, where is the money actually going to surface?* By the time a suspicious
transfer is confirmed, the funds have usually already moved through two or three more
accounts and are on their way to a cash withdrawal somewhere — a specific ATM, in a
specific city, within a specific window of time. That withdrawal is the last moment
anyone can intervene before the money is effectively gone. Almost no system tries to
predict it in advance.

PCWIS is an attempt at that narrower, harder problem. It doesn't try to replace fraud
detection — it assumes a ring has already been flagged, and asks what happens next.

## What it actually does

Given a cluster of linked, already-suspicious accounts, PCWIS traces how funds move
between them, layers in geography and timing, and produces a short, ranked list of
plausible cash-out locations — each with a calibrated confidence score and a plain-
language reason, not a black-box number. An officer reviewing the output can see exactly
why a location was flagged, how confident the system actually is, and what to do next.
Nothing is automated past that point. The system recommends; a person decides.

That distinction matters more than it might seem. A wrong prediction that quietly
influences a human's judgment is a minor cost. A wrong prediction that autonomously
freezes an account or dispatches a patrol is a real one — so this system is built to
never take the second kind of action, under any confidence threshold.

## How it's put together

The pipeline is organized into ten layers, each one replaceable and independently
testable rather than a single monolithic script:

**Governance and intake.** Every identifier — phone numbers, account numbers, device
IDs — is tokenized with HMAC before it ever enters the system. Raw personal data never
touches the pipeline. Transactions and complaints flow in as events through a queue (SQLite in this
prototype; a real deployment would use something like Redis Streams).

**Entity and graph analysis.** A Neo4j graph stitches together accounts, devices, and
known high-risk exit points, tracing how money moves between them and catching cases
where a brand-new account shares a device with one that's already been flagged.

**Geography and ranking.** Candidate cash-out locations are shortlisted using real
OpenStreetMap ATM data and PostGIS spatial queries, then ranked with a LightGBM
learning-to-rank model — trained to optimize for the right question (does the correct
location appear near the top of a short list) rather than a generic accuracy score that
would look good and mean little.

**Decision and interface.** Predictions pass through a tiered policy layer before
reaching a React dashboard built for the person actually using it — an investigator
deciding what to do in the next hour, not a data scientist inspecting a model.

**Evaluation.** Every claim the system makes about its own performance is checked
against a proper held-out, time-respecting split and compared to a naive baseline —
because a number with no baseline and no honest test set isn't really a number.

## Stack

Python and FastAPI on the backend, LightGBM and scikit-learn for the model, Neo4j
for the graph, PostGIS for spatial queries, and an event queue for ingestion (SQLite
in this prototype). The
frontend is React and Leaflet, rendered on plain OpenStreetMap tiles rather than a
paid mapping service — partly a cost decision, partly a bet that the map shouldn't be
the part of the system anyone has to think about.

Neo4j and PostGIS are optional for a local run. Without them the prototype
falls back to NetworkX for the graph, an in-memory ATM pool for candidate generation
and SQLite for the event queue, so you can see the whole pipeline working with nothing
but Python and Node installed.

## Project layout

```
.
├── backend/
│   ├── layer1_governance/   HMAC tokenization, retention jobs
│   ├── layer2_ingestion/    event producers and the event-queue writer
│   ├── layer3_validation/   schemas, entity resolution
│   ├── layer4_rules/        first-pass rule engine
│   ├── layer5_graph/        fund-flow graph (NetworkX / Neo4j)
│   ├── layer6_spatial/      candidate ATM generation, OSM fetch
│   ├── layer7_ranking/      LightGBM ranker, calibration, reason codes
│   ├── layer8_policy/       tiered action policy (recommend only, never auto-act)
│   ├── layer9_app/          FastAPI service
│   ├── layer10_eval/        evaluation against baselines
│   ├── config/              MoU, action-policy and rule configuration (YAML)
│   ├── scripts/             data generators and dataset ingestion
│   ├── shared/              env loading, account pool
│   ├── tests/
│   └── pipeline.py          orchestrates layers 3-8 over queued events
├── frontend/                React + Vite investigator dashboard
├── datasets/                raw ATM transaction CSVs and their data dictionary
├── docs/architecture.md     deeper layer-by-layer write-up
└── docker-compose.yml       optional Redis / Neo4j / PostGIS containers
```

## Running it locally

You'll need Python 3.11 or newer and Node 20+. On macOS, LightGBM also needs OpenMP
(`brew install libomp`).

```bash
# 1. Backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp backend/.env.example backend/.env      # then fill in the values

cd backend
python generate_synthetic_data.py         # builds the demo SQLite database
python -m layer7_ranking.train            # trains the first ranking model
python scripts/auto_generator.py          # seeds the ATM pool and runs the pipeline once
python -m layer9_app.api                  # API on http://localhost:8000 (docs at /docs)
```

```bash
# 2. Frontend, in a second terminal
cd frontend
cp .env.example .env                      # set VITE_RECAPTCHA_SITE_KEY
npm install
npm run dev                               # http://localhost:5173
```

Secrets live only in the two `.env` files, which are git-ignored. Generate the HMAC and
JWT keys with `python -c "import secrets; print(secrets.token_hex(32))"`. The backend refuses to start without them, so there are no weak fallback keys. Google
publishes reCAPTCHA test keys that work fine for a demo. The demo login is
`admin` / `123` and is hardcoded for the prototype, so replace it with real authentication
before hosting this anywhere public. Several dashboard figures (some KPIs, bank numbers,
ATM risk scores) are randomised demo values, not model output.

To push a fresh batch of synthetic events through the whole pipeline and retrain on
them, run `python scripts/auto_generator.py` from `backend/` (add `--continuous` to
loop). The optional services start with
`docker compose --env-file backend/.env up -d`, and `python -m layer6_spatial.fetch_osm_atms`
replaces the synthetic ATM list in `backend/data/account_pool.json` with real
OpenStreetMap locations.

Tests:

```bash
pip install -r requirements-dev.txt
cd backend && pytest
```

## What this is, and isn't

This is a working prototype, built to explore whether a specific, narrow prediction
problem is tractable at all — not a finished product and not a claim of real-world
accuracy. Every dataset it runs on is synthetic, generated to resemble realistic fraud
patterns without ever touching real financial records. It has no connection to any
government system, bank, or live data source, and it isn't built to be dropped into
production as-is. Treat it as a technical exploration of the problem, not a finished
answer to it.

## License

MIT, see [LICENSE](LICENSE).

## Credits
Built by Team Zenith for Smart India Hackathon.

- Kirti Chauhan
