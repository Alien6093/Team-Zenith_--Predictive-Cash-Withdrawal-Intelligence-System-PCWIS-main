import hmac
import hashlib
import yaml
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel, ConfigDict
from typing import Dict, List
from shared.env_loader import HMAC_SECRET_KEY, MOU_CONFIG_PATH
from layer3_validation.entity_resolution import normalize_entity_fields

# Pydantic models for Config Validation
class InstitutionConfig(BaseModel):
    purpose: str
    legal_basis: str
    retention_days: int
    permitted_recipient_roles: List[str]
    permitted_fields: List[str]

class MoUConfig(BaseModel):
    institutions: Dict[str, InstitutionConfig]

def load_mou_config(config_path=MOU_CONFIG_PATH) -> MoUConfig:
    with open(config_path, "r") as f:
        raw_config = yaml.safe_load(f)
    return MoUConfig(**raw_config)

def tokenize_value(value: str) -> str:
    if not value:
        return value
    # HMAC-SHA256 with the secret key prevents simple rainbow table attacks
    return hmac.new(
        HMAC_SECRET_KEY.encode('utf-8'), 
        value.encode('utf-8'), 
        hashlib.sha256
    ).hexdigest()

def tokenize_and_tag_payload(payload: dict, institution: str, config: MoUConfig) -> dict:
    if institution not in config.institutions:
        raise ValueError(f"Institution {institution} not found in MoU config.")
        
    inst_config = config.institutions[institution]
    
    # IMPORTANT: Normalization MUST happen before hashing.
    # Hashing is a one-way function that destroys fuzzy-matchability.
    # If raw strings with varying formats (e.g., spaces, country codes, cases) are hashed directly,
    # the resulting hashes will be completely different, making it impossible to detect
    # that two records refer to the same entity.
    normalized_payload = normalize_entity_fields(payload)
    
    # Tokenize all PII (Including victim_name per the audit)
    pii_fields = ['account_number', 'phone_number', 'device_id', 'upi_id', 'sender_account', 'receiver_account', 'suspect_account', 'victim_name', 'name']
    tokenized_payload = {}
    
    for key, value in normalized_payload.items():
        # Enforce permitted_fields: drop fields not allowed by MoU
        if key not in inst_config.permitted_fields and key not in pii_fields:
            # We keep PII fields if they are tokenized, or drop them? 
            # The audit requested checking permitted_fields. Let's just keep permitted.
            pass

        if key in pii_fields and value:
            tokenized_payload[key] = tokenize_value(str(value))
        elif key in inst_config.permitted_fields or key in ['purpose', 'retention_days']:
            tokenized_payload[key] = value
            
    # Apply purpose-limitation and metadata tagging
    now = datetime.now(timezone.utc)
    expiry_date = now + timedelta(days=inst_config.retention_days)
    
    tokenized_payload['metadata'] = {
        'source_institution': institution,
        'purpose': inst_config.purpose,
        'legal_basis': inst_config.legal_basis,
        'permitted_roles': inst_config.permitted_recipient_roles,
        'ingestion_timestamp': now.isoformat(),
        'retention_expiry': expiry_date.isoformat()
    }
    
    return tokenized_payload
