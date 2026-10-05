from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Optional, List
from datetime import datetime

class MetadataSchema(BaseModel):
    source_institution: str
    purpose: str
    legal_basis: str
    permitted_roles: List[str]
    ingestion_timestamp: datetime
    retention_expiry: datetime

class ComplaintSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    complaint_id: str
    purpose: str
    retention_days: int
    victim_name: Optional[str] = None
    account_number: Optional[str] = None
    phone_number: Optional[str] = None
    device_id: Optional[str] = None
    upi_id: Optional[str] = None
    suspect_account: Optional[str] = None
    loss_amount: float
    fraud_category: Optional[str] = None
    timestamp: datetime
    metadata: MetadataSchema

    @field_validator('loss_amount')
    @classmethod
    def check_loss_amount(cls, v: float) -> float:
        if v < 0:
            print(f"Warning: Negative loss amount {v} detected. Taking absolute value.")
            return abs(v)
        return v

class TransactionSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    tx_id: str
    purpose: str
    retention_days: int
    sender_account: str
    receiver_account: str
    amount: float
    tx_type: str
    timestamp: datetime
    device_id: Optional[str] = None
    metadata: MetadataSchema

    @field_validator('amount')
    @classmethod
    def check_amount(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Transaction amount must be strictly positive.")
        return v

class MuleHunterSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    flag_id: str
    purpose: str
    retention_days: int
    account_number: str
    risk_score: float
    flagged_reason: str
    timestamp: datetime
    metadata: MetadataSchema

def validate_payload(payload: dict, schema_class: type[BaseModel]) -> Optional[BaseModel]:
    try:
        validated_data = schema_class(**payload)
        return validated_data
    except Exception as e:
        print(f"Validation Error for {schema_class.__name__}: {e}")
        return None
