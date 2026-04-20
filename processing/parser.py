import json
import re

def parse_lora_payload(payload: str):
    """
    Tries to parse the incoming LoRa payload.
    Returns (data_dict, is_intact)
    """
    try:
        data = json.loads(payload)
        return data, True
    except json.JSONDecodeError:
        # Payload is fragmented or malformed, attempt predictive completion/auto-correction
        return attempt_heuristic_fix(payload), False

def attempt_heuristic_fix(payload: str):
    """
    Uses regex heuristics to extract whatever useful data is left in the fragmented payload.
    This acts as the Data Integrity Check and Auto-Correction layer.
    """
    fixed_data = {}
    
    # Extract ID (e.g., "id": "Alpha-1")
    id_match = re.search(r'"id"\s*:\s*"([^"]+)"', payload)
    if id_match:
        fixed_data['id'] = id_match.group(1)
        
    # Extract Lat
    lat_match = re.search(r'"lat"\s*:\s*([\d\.\-]+)', payload)
    if lat_match:
        try:
            fixed_data['lat'] = float(lat_match.group(1))
        except ValueError:
            pass
        
    # Extract Lng
    lng_match = re.search(r'"lng"\s*:\s*([\d\.\-]+)', payload)
    if lng_match:
        try:
            fixed_data['lng'] = float(lng_match.group(1))
        except ValueError:
            pass
        
    return fixed_data
