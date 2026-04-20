from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from api.routes import router

app = FastAPI(title="Tactical LoRa Predictive Middleware")

app.include_router(router)

# Mount dashboard as static files
app.mount("/dashboard_static", StaticFiles(directory="dashboard"), name="dashboard_static")

import threading
import subprocess
import os
import time

def run_simulator():
    # Wait for the FastAPI server to start
    time.sleep(3)
    port = os.getenv("PORT", "8000")
    env = os.environ.copy()
    env["API_URL"] = f"http://127.0.0.1:{port}/api/ingest"
    # Use the same python executable to run the simulator
    import sys
    subprocess.Popen([sys.executable, "simulate_lora.py"], env=env)

@app.on_event("startup")
def startup_event():
    threading.Thread(target=run_simulator, daemon=True).start()

@app.get("/")
async def root():
    return FileResponse("dashboard/index.html")

if __name__ == "__main__":
    import uvicorn
    
    print("\n" + "="*50)
    print("DASHBOARD IS LIVE! CLICK HERE: http://localhost:8000")
    print("="*50 + "\n")
    
    # In a real environment, this would run behind a proxy like Nginx
    uvicorn.run(app, host="127.0.0.1", port=8000)