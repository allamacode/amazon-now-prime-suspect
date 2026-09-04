import asyncio
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import List
from fastapi.middleware.cors import CORSMiddleware
from data_generator import generate_stream
from nlp_engine import NLPEngine

app = FastAPI()

# Allow CORS for local frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store active connections
active_connections = set()
nlp_engine = NLPEngine()

async def broadcast_stream():
    """Background task to generate, process, and broadcast data."""
    async for raw_message in generate_stream():
        # Process the message through our NLP engine to find bots and sockpuppets
        processed_message = nlp_engine.process_message(raw_message)
        
        # Broadcast to all connected clients
        if active_connections:
            message_str = json.dumps(processed_message)
            disconnected = set()
            for connection in active_connections:
                try:
                    await connection.send_text(message_str)
                except Exception:
                    disconnected.add(connection)
            
            # Clean up dead connections
            active_connections.difference_update(disconnected)

@app.on_event("startup")
async def startup_event():
    # Start the background broadcasting task
    asyncio.create_task(broadcast_stream())

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.add(websocket)
    try:
        while True:
            # We don't expect client messages, just keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        active_connections.remove(websocket)

class ReviewRequest(BaseModel):
    user_id: str
    text: str
    region: str
    ip_address: str = "127.0.0.1"

@app.post("/api/analyze")
async def analyze_review(request: ReviewRequest):
    raw_message = {
        "id": "manual-1",
        "user_id": request.user_id,
        "text": request.text,
        "region": request.region,
        "ip_address": request.ip_address,
        "type": "manual"
    }
    # The NLP engine will process it synchronously and add the 'nlp' payload
    processed_message = nlp_engine.process_message(raw_message)
    return processed_message

class ReviewBatchRequest(BaseModel):
    reviews: List[ReviewRequest]

import uuid

@app.post("/api/analyze-batch")
async def analyze_review_batch(request: ReviewBatchRequest):
    results = []
    for idx, rev in enumerate(request.reviews):
        raw_message = {
            "id": f"manual-batch-{uuid.uuid4().hex[:8]}",
            "user_id": rev.user_id,
            "text": rev.text,
            "region": rev.region,
            "ip_address": rev.ip_address,
            "type": "manual"
        }
        processed_message = nlp_engine.process_message(raw_message)
        results.append(processed_message)
    return results
