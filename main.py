from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from api.routes import router

app = FastAPI(title="Tactical LoRa Predictive Middleware")

app.include_router(router)

# Mount dashboard as static files
app.mount("/dashboard_static", StaticFiles(directory="dashboard"), name="dashboard_static")

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