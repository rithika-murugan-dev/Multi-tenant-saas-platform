import json
import uuid
from typing import Dict, List
from fastapi import WebSocket
from app.core.metrics import ACTIVE_WEBSOCKETS_GAUGE


class ConnectionManager:
    def __init__(self):
        self.active_tenant_connections: Dict[str, List[WebSocket]] = {}
        self.active_ticket_connections: Dict[str, List[WebSocket]] = {}

    def _update_gauge(self):
        total = sum(len(conns) for conns in self.active_tenant_connections.values())
        ACTIVE_WEBSOCKETS_GAUGE.set(total)

    async def connect_tenant(self, websocket: WebSocket, tenant_id: str):
        await websocket.accept()
        if tenant_id not in self.active_tenant_connections:
            self.active_tenant_connections[tenant_id] = []
        self.active_tenant_connections[tenant_id].append(websocket)
        self._update_gauge()

    def disconnect_tenant(self, websocket: WebSocket, tenant_id: str):
        if tenant_id in self.active_tenant_connections:
            if websocket in self.active_tenant_connections[tenant_id]:
                self.active_tenant_connections[tenant_id].remove(websocket)
            if not self.active_tenant_connections[tenant_id]:
                del self.active_tenant_connections[tenant_id]
        self._update_gauge()

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
        if tenant_id in self.active_tenant_connections:
            payload = json.dumps({"event": event_type, "data": data})
            for connection in list(self.active_tenant_connections[tenant_id]):
                try:
                    await connection.send_text(payload)
                except Exception:
                    self.disconnect_tenant(connection, tenant_id)

    async def broadcast_to_ticket(self, ticket_id: str, event_type: str, data: dict):
        if ticket_id in self.active_ticket_connections:
            payload = json.dumps({"event": event_type, "data": data})
            for connection in list(self.active_ticket_connections[ticket_id]):
                try:
                    await connection.send_text(payload)
                except Exception:
                    self.disconnect_ticket(connection, ticket_id)


ws_manager = ConnectionManager()
