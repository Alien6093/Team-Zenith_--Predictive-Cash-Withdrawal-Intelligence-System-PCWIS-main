# ATM transaction dataset

Public Nigerian ATM transaction data, split by state (`lagos`, `kano`, `rivers`, `enugu`)
plus a combined fact table (`fct_transactions.csv`) and lookup tables for ATM locations,
calendar, hour and transaction type. `Data Dictionary.xlsx` describes every column.

`lagos_transactions.csv` is tracked with Git LFS, so run `git lfs install` before cloning
(or `git lfs pull` afterwards).

It is used by the ingestion scripts in `backend/scripts/`:

```bash
cd backend
python -m scripts.ingest_archive_data   # push fct_transactions.csv into the event stream
python -m scripts.ingest_archive        # fill the dashboard demo table from lagos_transactions.csv
```
