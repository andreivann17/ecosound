from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from ..realtime.ws_manager import manager

router = APIRouter(prefix="/ws", tags=["ws"])

@router.websocket("/agenda")
async def ws_agenda(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            await ws.receive()
    except WebSocketDisconnect:
        manager.disconnect(ws)

@router.websocket("/notificaciones")
async def ws_notificaciones(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            await ws.receive()
    except WebSocketDisconnect:
        manager.disconnect(ws)

print("WS manager id:", id(manager))