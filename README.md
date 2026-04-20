# Predictive Reconstruction of Fragmented LoRa Telemetry Context

This project addresses the problem of data fragmentation and packet loss in LoRa networks, specifically for tracking tactical and remote assets. It implements a middleware layer that predicts and reconstructs missing telemetry data to ensure visual continuity on an intelligence dashboard.

## File Structure

- `main.py`: FastAPI entry point serving the API and static dashboard.
- `api/routes.py`: Contains endpoints for data ingestion and dashboard polling.
- `processing/parser.py`: Implements Data Integrity Checks and Heuristic Auto-Correction.
- `prediction/kalman.py`: Implements Predictive Completion using a Kalman Filter (mathematical state estimation).
- `storage/buffer.py`: Maintains the Historical Data Buffer for each active node.
- `dashboard/`: Contains the frontend UI (HTML, JS, CSS) using Leaflet.js.
- `simulate_lora.py`: A Python script that acts as the LoRa gateway, generating both intact and "broken" telemetry streams.

## How to Run

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Start the API and Dashboard Server:**
   ```bash
   python main.py
   ```
   The dashboard will be available at `http://localhost:8000`

3. **Start the LoRa Gateway Simulation:**
   In a separate terminal, run:
   ```bash
   python simulate_lora.py
   ```
   This script will simulate asset movement and randomly introduce packet fragmentation (broken JSON strings).

## Key Features

- **Heuristic Data Smoothing:** Uses a Kalman Filter (`prediction/kalman.py`) to estimate current position when payload data is missing.
- **Auto-Correction:** Uses regex matching (`processing/parser.py`) to salvage partial key-value pairs from truncated strings.
- **Visual Continuity:** The dashboard renders verified packets as solid green dots, and reconstructed/estimated data as pulsing orange dashes, minimizing analyst cognitive load while maintaining situational awareness.
