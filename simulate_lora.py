import requests
import time
import json
import random
import math

import os

API_URL = os.getenv("API_URL", "http://localhost:8000/api/ingest")

def generate_movement(lat, lng, heading, speed):
    """Simulates linear movement based on heading and speed."""
    new_lat = lat + (speed * math.cos(math.radians(heading)))
    new_lng = lng + (speed * math.sin(math.radians(heading)))
    return new_lat, new_lng

nodes = {
    "Viper-Actual": {"lat": 34.0522, "lng": -118.2437, "heading": 45, "speed": 0.0003},
    "Ghost-2": {"lat": 34.0582, "lng": -118.2497, "heading": 120, "speed": 0.0002},
    "Spectre-4": {"lat": 34.0450, "lng": -118.2500, "heading": 200, "speed": 0.00025},
    "Raven-1": {"lat": 34.0600, "lng": -118.2300, "heading": 315, "speed": 0.00035},
    "Shadow-9": {"lat": 34.0400, "lng": -118.2350, "heading": 90, "speed": 0.00015}
}

print("==================================================")
print("Starting LoRa Gateway Telemetry Simulation")
print("Target: ", API_URL)
print("==================================================")

while True:
    for node_id, state in nodes.items():
        # Update physical position
        state["lat"], state["lng"] = generate_movement(state["lat"], state["lng"], state["heading"], state["speed"])
        
        # Introduce a slight curve to the movement over time
        state["heading"] += random.uniform(-5, 5)
        
        # Environmental Interference simulation
        # ~8% chance a packet is fragmented due to terrain dead zones or attenuation
        is_broken = random.random() < 0.08
        
        payload = {
            "id": node_id,
            "lat": round(state["lat"], 6),
            "lng": round(state["lng"], 6),
            "batt": random.randint(60, 100),
            "status": "active"
        }
        
        payload_str = json.dumps(payload)
        
        if is_broken:
            # Simulate fragmentation by truncating the JSON string mid-transmission
            # This perfectly emulates "incomplete JSON strings" mentioned in the objective
            chop_index = random.randint(len(payload_str)//2, len(payload_str) - 2)
            payload_str = payload_str[:chop_index]
            print(f"[{node_id}] [WARN] FRAGMENTED STREAM CHUNK: {payload_str}")
        else:
            print(f"[{node_id}] [OK] INTACT PACKET: {payload_str}")
            
        try:
            requests.post(API_URL, data=payload_str, headers={'Content-Type': 'text/plain'}, timeout=1)
        except Exception as e:
            pass # Ignore connection refused if server isn't up yet
            
    time.sleep(1.0)
