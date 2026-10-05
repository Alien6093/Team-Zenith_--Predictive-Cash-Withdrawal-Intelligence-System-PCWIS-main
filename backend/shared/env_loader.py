"""
Environment loader — single source of truth for all config values.
Uses SQLite instead of Dockerized services for prototype simplicity.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root
_project_root = Path(__file__).resolve().parent.parent
load_dotenv(_project_root / ".env")

# SQLite Database path
DB_PATH = _project_root / "cybercrime.db"
DB_URI = f"sqlite:///{DB_PATH}"

# Security
HMAC_SECRET_KEY = os.getenv("HMAC_SECRET_KEY", "CHANGE_ME_IN_PRODUCTION")
JWT_SECRET = os.getenv("JWT_SECRET", "CHANGE_ME_JWT_SECRET_IN_PRODUCTION")

# PostGIS connection parameters
POSTGIS_PARAMS = {
    'dbname': os.getenv("POSTGIS_DB", "cybercrime_gis"),
    'user': os.getenv("POSTGIS_USER", "postgres"),
    'password': os.getenv("POSTGIS_PASS", ""),
    'host': os.getenv("POSTGIS_HOST", "localhost"),
    'port': os.getenv("POSTGIS_PORT", "5432"),
}

# Config file paths (resolve relative to project root)
CONFIG_DIR = _project_root / "config"
MOU_CONFIG_PATH = CONFIG_DIR / "mou_config.yaml"
ACTION_POLICY_PATH = CONFIG_DIR / "action_policy.yaml"
RULE_CONFIG_PATH = CONFIG_DIR / "rule_config.yaml"
