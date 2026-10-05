import json
import numpy as np
from pathlib import Path
from datetime import datetime, timezone
from collections import deque
from geopy.distance import geodesic

EVAL_LOG_FILE = Path(__file__).resolve().parent.parent / "data" / "evaluation_logs.jsonl"
EVAL_LOG_FILE.parent.mkdir(exist_ok=True)

class Evaluator:
    def __init__(self, drift_window_size=100):
        self.drift_window = deque(maxlen=drift_window_size)
        
    def _compute_mrr(self, predictions: list, ground_truth_id: str) -> float:
        """Computes Mean Reciprocal Rank for a single prediction group."""
        for rank, pred in enumerate(predictions, start=1):
            if pred.get('atm_id') == ground_truth_id:
                return 1.0 / rank
        return 0.0
        
    def _compute_recall_at_k(self, predictions: list, ground_truth_id: str, k: int) -> int:
        """Returns 1 if ground truth is in Top-K predictions, else 0."""
        top_k = [p.get('atm_id') for p in predictions[:k]]
        return 1 if ground_truth_id in top_k else 0
        
    def _compute_distance_error(self, predicted_loc: tuple, actual_loc: tuple) -> float:
        """Uses Haversine distance via Geopy."""
        return geodesic(predicted_loc, actual_loc).kilometers

    def log_evaluation(self, complaint_id: str, predictions: list, ground_truth_id: str, 
                       actual_loc: tuple, baseline_id: str):
        """
        Logs metrics to a JSONL file and updates drift window.
        """
        if not predictions:
            return
            
        # Get the top prediction for distance error
        top_pred = predictions[0]
        pred_loc = (top_pred['lat'], top_pred['lon'])
        
        mrr = self._compute_mrr(predictions, ground_truth_id)
        recall_1 = self._compute_recall_at_k(predictions, ground_truth_id, 1)
        recall_5 = self._compute_recall_at_k(predictions, ground_truth_id, 5)
        dist_err = self._compute_distance_error(pred_loc, actual_loc)
        
        # Baseline check
        baseline_mrr = 1.0 if predictions[0].get('atm_id') == baseline_id else 0.0 # simplified baseline
        
        eval_record = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "complaint_id": complaint_id,
            "mrr": mrr,
            "recall_at_1": recall_1,
            "recall_at_5": recall_5,
            "distance_error_km": dist_err,
            "baseline_mrr": baseline_mrr
        }
        
        # Write to JSONL
        with open(EVAL_LOG_FILE, 'a') as f:
            f.write(json.dumps(eval_record) + "\n")
            
        # Update drift window
        self.drift_window.append(eval_record)
        
    def check_drift(self) -> dict:
        """Computes rolling average over the window to detect drift."""
        if len(self.drift_window) < 10:
            return {"status": "INSUFFICIENT_DATA"}
            
        recent_mrr = np.mean([r['mrr'] for r in self.drift_window])
        recent_dist = np.mean([r['distance_error_km'] for r in self.drift_window])
        
        status = "DRIFT_DETECTED" if recent_mrr < 0.5 or recent_dist > 10.0 else "HEALTHY"
        
        return {
            "status": status,
            "rolling_mrr": float(recent_mrr),
            "rolling_distance_error": float(recent_dist),
            "window_size": len(self.drift_window)
        }
