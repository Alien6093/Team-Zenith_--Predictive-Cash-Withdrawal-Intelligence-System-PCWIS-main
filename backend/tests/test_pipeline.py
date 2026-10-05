import pytest
from layer1_governance.tokenization import tokenize_value, load_mou_config, tokenize_and_tag_payload
from layer3_validation.schemas import ComplaintSchema, validate_payload
from layer4_rules.rule_engine import RuleEngine

def test_tokenization_consistency():
    val = "9876543210"
    hash1 = tokenize_value(val)
    hash2 = tokenize_value(val)
    assert hash1 == hash2
    assert hash1 != val

def test_pydantic_validation():
    # Missing required fields
    bad_payload = {"complaint_id": "CMP-123"} 
    assert validate_payload(bad_payload, ComplaintSchema) is None
    
def test_rule_engine_filtering():
    engine = RuleEngine()
    
    # Amount below threshold (default 1000)
    res = engine.evaluate("TRANSFER", {"amount": 500, "sender_account": "A", "receiver_account": "B"})
    assert res["action"] == "DROP"
    
    # Normal amount
    res = engine.evaluate("TRANSFER", {"amount": 5000, "sender_account": "A", "receiver_account": "B"})
    assert res["action"] == "PASS"
    
    # Recurring limit exceeded
    for _ in range(engine.recurring_limit):
        engine.evaluate("TRANSFER", {"amount": 5000, "sender_account": "X", "receiver_account": "Y"})
        
    res = engine.evaluate("TRANSFER", {"amount": 5000, "sender_account": "X", "receiver_account": "Y"})
    assert res["action"] == "DEPRIORITIZE"
