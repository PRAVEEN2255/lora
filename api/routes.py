from fastapi import APIRouter, Request
from storage.buffer import StateBuffer
from processing.parser import parse_lora_payload
from prediction.kalman import NodeKalmanFilter
import time

router = APIRouter()
buffer = StateBuffer()
filters = {}

@router.post("/api/ingest")
async def ingest_lora_data(request: Request):
    """
    Ingestion layer endpoint. Handles low-bitrate stream chunks from the LoRa Gateway.
    """
    raw_data = await request.body()
    payload_str = raw_data.decode('utf-8', errors='ignore')
    
    # 1. Processing / Data Integrity Check
    parsed_data, is_intact = parse_lora_payload(payload_str)
    
    node_id = parsed_data.get("id")
    if not node_id:
        return {"status": "error", "message": "No node ID found in payload, dropping packet"}
        
    # Initialize Kalman filter if it's a new node
    if node_id not in filters:
        filters[node_id] = NodeKalmanFilter(dt=1.0)
        
    node_state = buffer.get_node(node_id)
    kf = filters[node_id]
    
    lat = parsed_data.get("lat")
    lng = parsed_data.get("lng")
    
    # 2 & 3. Predictive Completion & Heuristic Data Smoothing
    if is_intact and lat is not None and lng is not None:
        # We have verified, contiguous data -> update Kalman filter & node state
        smoothed_lat, smoothed_lng = kf.update(lat, lng)
        node_state.current_lat = lat
        node_state.current_lng = lng
        node_state.is_estimated = False
    else:
        # Packet fragmentation detected! 
        # Missing coordinates, predict next state using Historical Data Buffer & Kalman Filter
        pred_lat, pred_lng = kf.predict()
        
        if lat is not None and lng is not None:
            # We managed to auto-correct the string to extract partial coordinates
            smoothed_lat, smoothed_lng = kf.update(lat, lng)
            node_state.current_lat = lat
            node_state.current_lng = lng
            node_state.is_estimated = True # Mark as estimated due to string reconstruction
        elif pred_lat is not None:
            # Full reliance on predictive layer since payload coordinates were lost
            node_state.current_lat = pred_lat
            node_state.current_lng = pred_lng
            node_state.is_estimated = True
        else:
            return {"status": "error", "message": "Cannot predict state yet, insufficient history"}

    node_state.last_update_time = time.time()
    
    return {"status": "success", "is_intact": is_intact, "estimated": node_state.is_estimated}

@router.get("/api/state")
async def get_dashboard_state():
    """
    Provides the continuous operating picture to the dashboard.
    """
    return buffer.get_all_states()
