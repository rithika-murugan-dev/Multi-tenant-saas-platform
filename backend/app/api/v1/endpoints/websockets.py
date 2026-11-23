import uuid
from typing import Dict
from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect, status
from pydantic import BaseModel, Field
from app.api.deps import get_current_tenant, get_current_user, require_roles
from app.core.security import decode_access_token
from app.core.websockets import ws_manager
from app.models.tenant import Tenant
from app.models.user import User, UserRole

router = APIRouter()


class BroadcastMessage(BaseModel):
    event_type: str = Field(default="system_announcement", description="Type of event")
    message: str = Field(..., min_length=1, description="Message to broadcast live")


# ==========================================
# REST API Endpoints (Visible in Swagger UI)
# ==========================================

@router.get(
    "/active-connections",
    summary="Get count of live connected WebSocket clients (REST)",
)
async def get_active_connections(
    tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(require_roles(UserRole.TENANT_ADMIN, UserRole.MANAGER)),
):
    """
    Returns the number of employees currently connected live via WebSockets.
    """
    tenant_id_str = str(tenant.id)
    active_count = len(ws_manager.active_tenant_connections.get(tenant_id_str, []))
    return {
        "tenant_id": tenant_id_str,
        "company_name": tenant.name,
        "active_live_connections": active_count,
    }


@router.post(
    "/broadcast",
    summary="Broadcast an instant live announcement to all company screens (REST)",
)
async def broadcast_announcement(
    payload: BroadcastMessage,
    tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(require_roles(UserRole.TENANT_ADMIN, UserRole.MANAGER)),
):
    """
    Sends an instant live message to every connected employee's screen in real time.
    """
    await ws_manager.broadcast_to_tenant(
        tenant_id=str(tenant.id),
        event_type=payload.event_type,
        data={
            "sender": current_user.full_name,
            "message": payload.message,
        },
    )
    return {
        "status": "broadcast_sent",
        "event_type": payload.event_type,
        "message": payload.message,
    }


# ==========================================
# Raw WebSocket Streams (ws://)
# ==========================================

@router.websocket("/notifications")
async def websocket_tenant_notifications(
    websocket: WebSocket,
    token: str = Query(..., description="JWT access token"),
):
    """
    Live real-time notification feed for a user's organization.
    """
    payload = decode_access_token(token)
    if not payload or not payload.get("tenant_id"):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    tenant_id = str(payload.get("tenant_id"))
    await ws_manager.connect_tenant(websocket, tenant_id)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect_tenant(websocket, tenant_id)


@router.websocket("/tickets/{ticket_id}")
async def websocket_ticket_chat(
    websocket: WebSocket,
    ticket_id: uuid.UUID,
    token: str = Query(..., description="JWT access token"),
):
    """
    Live real-time chat room for a specific ticket.
    """
    payload = decode_access_token(token)
    if not payload or not payload.get("tenant_id"):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    t_id_str = str(ticket_id)
    await ws_manager.connect_ticket(websocket, t_id_str)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect_ticket(websocket, t_id_str)
