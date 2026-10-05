import time
import sqlite3
from datetime import datetime, timezone
from shared.env_loader import DB_PATH

def run_retention_job():
    print(f"[{datetime.now(timezone.utc).isoformat()}] Running SQLite retention expiry job...")
    
    if not DB_PATH.exists():
        print("Database does not exist yet. Skipping.")
        return

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # We assume the pipeline stores events in a table `events` 
        # with columns: id, payload, retention_expiry
        
        # Check if table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='events'")
        if not cursor.fetchone():
            print("Table 'events' not found. Skipping.")
            conn.close()
            return
            
        now_iso = datetime.now(timezone.utc).isoformat()
        
        # Delete expired records
        cursor.execute("DELETE FROM events WHERE retention_expiry < ?", (now_iso,))
        deleted_count = cursor.rowcount
        conn.commit()
        
        print(f"Retention job completed. Deleted {deleted_count} expired events.")
        
    except sqlite3.Error as e:
        print(f"SQLite error running retention job: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    while True:
        run_retention_job()
        time.sleep(3600) # Run every hour
