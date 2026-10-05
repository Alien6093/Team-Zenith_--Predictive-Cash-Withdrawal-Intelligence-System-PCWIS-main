import re

def normalize_phone(phone: str) -> str:
    """Removes non-numeric characters and country code +91 for Indian phones."""
    if not phone: return phone
    # Extract only digits
    digits = re.sub(r'\D', '', phone)
    # Strip leading 91 if it's 12 digits
    if len(digits) == 12 and digits.startswith('91'):
        return digits[2:]
    # Strip leading 91 if it's 13 digits (like +91 91...) wait, if it's 12 it means 91 + 10.
    # What if they typed 0091? We just strip any leading 91 or 0 if it leaves 10 digits.
    if len(digits) > 10 and digits.endswith(digits[-10:]):
        return digits[-10:] # Just return the last 10 digits for Indian phones
    return digits

def normalize_account(account: str) -> str:
    """Remove spaces and dashes, convert to uppercase."""
    if not account: return account
    return re.sub(r'[\s-]', '', account).upper()

def normalize_upi(upi: str) -> str:
    """Lowercase UPI IDs."""
    if not upi: return upi
    return upi.lower().strip()

def normalize_device(device_id: str) -> str:
    """Normalize device IDs (uppercase, strip)."""
    if not device_id: return device_id
    return device_id.upper().strip()

def normalize_entity_fields(payload: dict) -> dict:
    """Normalizes fields before tokenization."""
    normalized = payload.copy()
    
    if normalized.get('phone_number'):
        normalized['phone_number'] = normalize_phone(str(normalized['phone_number']))
        
    for acc_field in ['account_number', 'sender_account', 'receiver_account']:
        if normalized.get(acc_field):
            normalized[acc_field] = normalize_account(str(normalized[acc_field]))
            
    if normalized.get('upi_id'):
        normalized['upi_id'] = normalize_upi(str(normalized['upi_id']))
        
    if normalized.get('device_id'):
        normalized['device_id'] = normalize_device(str(normalized['device_id']))
        
    return normalized

import datetime

class EntityResolver:
    def __init__(self):
        # Maps token value -> primary record ID
        self.token_registry = {}
        # Audit log of all linkages
        self.linkages = []
        
    def resolve(self, validated_record):
        # Identify the primary ID for this record
        record_id = validated_record.get('complaint_id') or validated_record.get('tx_id') or validated_record.get('flag_id') or 'UNKNOWN'
        
        linked_via = []
        
        # Fields that can be used for linking (already tokenized)
        tokens_to_check = ['device_id', 'phone_number', 'upi_id', 'account_number', 'sender_account', 'receiver_account', 'suspect_account']
        
        for field in tokens_to_check:
            token_val = validated_record.get(field)
            if token_val:
                if token_val in self.token_registry:
                    existing_record_id = self.token_registry[token_val]
                    if existing_record_id != record_id:
                        # Explicit link found
                        link = {
                            "from_record": record_id,
                            "to_record": existing_record_id,
                            "linked_via_field": field,
                            # Don't log the raw token if it's sensitive, but these are already hashed
                            "token_hash_prefix": str(token_val)[:8], 
                            "confidence": "HIGH" if field in ['device_id', 'account_number', 'sender_account', 'receiver_account', 'suspect_account'] else "MEDIUM",
                            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
                        }
                        self.linkages.append(link)
                        linked_via.append(link)
                        print(f"[EntityResolution] AUDIT LOG: Linked {record_id} to {existing_record_id} via shared {field} (Confidence: {link['confidence']})")
                else:
                    # Register this token
                    self.token_registry[token_val] = record_id
                    
        # Add explicit links to the record
        if linked_via:
            validated_record['linked_via'] = linked_via
            
        return validated_record

entity_resolver = EntityResolver()
