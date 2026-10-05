import time
import sys
import os
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from layer2_ingestion.complaint_producer import run_complaint_producer
from layer2_ingestion.transaction_producer import run_transaction_producer
from layer2_ingestion.mulehunter_producer import run_mulehunter_producer
from pipeline import PipelineOrchestrator
from layer7_ranking.train import train_and_save

def run_cycle(cycle_num=1):
    print(f"\n==========================================", flush=True)
    print(f"[CYCLE #{cycle_num}] SYNTHETIC DATA & RETRAINING", flush=True)
    print(f"==========================================", flush=True)
    
    print("\n1. Generating synthetic complaints, transactions & flags...", flush=True)
    run_complaint_producer()
    run_transaction_producer()
    run_mulehunter_producer()
    
    print("\n2. Executing 10-Layer Predictive Pipeline Pass...", flush=True)
    orchestrator = PipelineOrchestrator()
    orchestrator.run()
    
    print("\n3. Retraining LightGBM Ranking Model on fresh database events...", flush=True)
    train_and_save(use_real_data=True)
    
    print(f"\n[OK] Cycle #{cycle_num} Complete! Model updated and saved.", flush=True)

if __name__ == "__main__":
    loop_mode = "--continuous" in sys.argv
    delay = 30 # seconds between cycles in continuous mode
    
    if loop_mode:
        print(f"Starting Continuous Backend Data Generator & Auto-Trainer (Interval: {delay}s)...", flush=True)
        cycle = 1
        while True:
            try:
                run_cycle(cycle)
                cycle += 1
                print(f"\nWaiting {delay} seconds until next training cycle...", flush=True)
                time.sleep(delay)
            except KeyboardInterrupt:
                print("\nStopped continuous trainer.", flush=True)
                break
            except Exception as e:
                print(f"Error in cycle {cycle}: {e}", flush=True)
                time.sleep(10)
    else:
        run_cycle(1)
