import json
import uuid
from typing import Dict, List
from fastapi import WebSocket


class ConnectionManager:
    """
    Manages live WebSocket connections:
    - Scopes connections by tenant_id (Company A never sees Company B's live events).
    - Can broadcast to an entire company or to a specific ticket conversation room.
    """
    def __init__(self):
        # Maps tenant_id -> list of active WebSockets
        self.active_tenant_connections: Dict[str, List[WebSocket]] = {}
        # Maps ticket_id -> list of active WebSockets watching that ticket
        self.active_ticket_connections: Dict[str, List[WebSocket]] = {}

    async def connect_tenant(self, websocket: WebSocket, tenant_id: str):
        await websocket.accept()
        if tenant_id not in self.active_tenant_connections:
            self.active_tenant_connections[tenant_id] = []
        self.active_tenant_connections[tenant_id].append(websocket)

    def disconnect_tenant(self, websocket: WebSocket, tenant_id: str):
        if tenant_id in self.active_tenant_connections:
            if websocket in self.active_tenant_connections[tenant_id]:
                self.active_tenant_connections[tenant_id].remove(websocket)
            if not self.active_tenant_connections[tenant_id]:
                del self.active_tenant_connections[tenant_id]

    async def connect_ticket(self, websocket: WebSocket, ticket_id: str):
        await websocket.accept()
        if ticket_id not in self.active_ticket_connections:
            self.active_ticket_connections[ticket_id] = []
        self.active_ticket_connections[ticket_id].append(websocket)

    def disconnect_ticket(self, websocket: WebSocket, ticket_id: str):
        if ticket_id in self.active_ticket_connections:
            if websocket in self.active_ticket_connections[ticket_id]:
                self.active_ticket_connections[ticket_id].remove(websocket)
            if not self.active_ticket_connections[ticket_id]:
                del self.active_ticket_connections[ticket_id]

    async def broadcast_to_tenant(self, tenant_id: str, event_type: str, data: dict):
        """Send live event to all staff in a company (e.g. New Ticket, Task status change)."""
        if tenant_id in self.active_tenant_connections:
            payload = json.dumps({"event": event_type, "data": data})
            for connection in list(self.active_tenant_connections[tenant_id]):
                try:
                    await connection.send_text(payload)
                except Exception:
                    self.disconnect_tenant(connection, tenant_id)

    async def broadcast_to_ticket(self, ticket_id: str, event_type: str, data: dict):
        """Send live event to people viewing a specific ticket (e.g. New Reply posted)."""
        if ticket_id in self.active_ticket_connections:
            payload = json.dumps({"event": event_type, "data": data})
            for connection in list(self.active_ticket_connections[ticket_id]):
                try:
                    await connection.send_text(payload)
                except Exception:
                    self.disconnect_ticket(connection, ticket_id)


# Global singleton instance
ws_manager = ConnectionManager()
