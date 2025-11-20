"""
WebSocket Router for PneumAI
Real-time communication for scan updates and notifications
"""

import json
import logging
from typing import Dict, List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter()

# Global WebSocket connection manager
class ConnectionManager:
    """Manages WebSocket connections for real-time updates"""

    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {
            "scans": [],  # For scan-related updates
            "notifications": [],  # For general notifications
        }

    async def connect(self, websocket: WebSocket, room: str = "scans"):
        """Connect a WebSocket to a specific room"""
        await websocket.accept()
        if room not in self.active_connections:
            self.active_connections[room] = []
        self.active_connections[room].append(websocket)
        logger.info(f"WebSocket connected to room '{room}'. Total connections: {len(self.active_connections[room])}")

    def disconnect(self, websocket: WebSocket, room: str = "scans"):
        """Disconnect a WebSocket from a specific room"""
        if room in self.active_connections:
            try:
                self.active_connections[room].remove(websocket)
                logger.info(f"WebSocket disconnected from room '{room}'. Remaining connections: {len(self.active_connections[room])}")
            except ValueError:
                logger.warning(f"WebSocket not found in room '{room}' during disconnect")

    async def broadcast(self, message: dict, room: str = "scans"):
        """Broadcast a message to all connections in a room"""
        if room not in self.active_connections:
            logger.warning(f"Room '{room}' does not exist")
            return

        disconnected = []
        for connection in self.active_connections[room]:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Failed to send message to connection: {e}")
                disconnected.append(connection)

        # Clean up disconnected connections
        for conn in disconnected:
            self.disconnect(conn, room)

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Send a message to a specific WebSocket connection"""
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Failed to send personal message: {e}")

# Global connection manager instance
manager = ConnectionManager()


@router.websocket("/ws/scans")
async def websocket_scans(websocket: WebSocket):
    """
    WebSocket endpoint for real-time scan updates

    Clients can connect to receive live updates when:
    - New scans are uploaded
    - Scan analysis is completed
    - Comments are added to scans
    """
    await manager.connect(websocket, "scans")

    try:
        while True:
            # Keep connection alive and listen for client messages
            data = await websocket.receive_text()

            try:
                message = json.loads(data)
                logger.info(f"Received message from client: {message}")

                # Handle different message types from client
                if message.get("type") == "ping":
                    await manager.send_personal_message({
                        "type": "pong",
                        "timestamp": datetime.utcnow().isoformat()
                    }, websocket)
                elif message.get("type") == "subscribe":
                    # Client wants to subscribe to specific scan updates
                    scan_id = message.get("scanId")
                    if scan_id:
                        await manager.send_personal_message({
                            "type": "subscribed",
                            "scanId": scan_id,
                            "timestamp": datetime.utcnow().isoformat()
                        }, websocket)

            except json.JSONDecodeError:
                logger.warning(f"Invalid JSON received: {data}")

    except WebSocketDisconnect:
        manager.disconnect(websocket, "scans")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket, "scans")


@router.websocket("/ws/notifications")
async def websocket_notifications(websocket: WebSocket):
    """
    WebSocket endpoint for general notifications

    Used for system-wide notifications and updates
    """
    await manager.connect(websocket, "notifications")

    try:
        while True:
            data = await websocket.receive_text()
            # Handle notification-specific messages if needed
            logger.info(f"Notification WebSocket received: {data}")

    except WebSocketDisconnect:
        manager.disconnect(websocket, "notifications")
    except Exception as e:
        logger.error(f"Notification WebSocket error: {e}")
        manager.disconnect(websocket, "notifications")


# Utility functions for broadcasting updates
async def broadcast_scan_upload(scan_data: dict):
    """
    Broadcast scan upload event to all connected clients

    Args:
        scan_data: Dictionary containing scan information
    """
    message = {
        "type": "scan_uploaded",
        "data": scan_data,
        "timestamp": datetime.utcnow().isoformat()
    }
    await manager.broadcast(message, "scans")
    logger.info(f"Broadcasted scan upload: {scan_data.get('scanId', 'unknown')}")


async def broadcast_scan_analysis_complete(scan_data: dict):
    """
    Broadcast scan analysis completion event

    Args:
        scan_data: Dictionary containing completed scan analysis
    """
    message = {
        "type": "scan_analysis_complete",
        "data": scan_data,
        "timestamp": datetime.utcnow().isoformat()
    }
    await manager.broadcast(message, "scans")
    logger.info(f"Broadcasted scan analysis complete: {scan_data.get('scanId', 'unknown')}")


async def broadcast_scan_comment(scan_id: str, comment_data: dict):
    """
    Broadcast new comment on scan

    Args:
        scan_id: ID of the scan
        comment_data: Comment information
    """
    message = {
        "type": "scan_comment_added",
        "scanId": scan_id,
        "data": comment_data,
        "timestamp": datetime.utcnow().isoformat()
    }
    await manager.broadcast(message, "scans")
    logger.info(f"Broadcasted comment on scan {scan_id}")


async def broadcast_notification(title: str, message: str, level: str = "info"):
    """
    Broadcast general notification to all clients

    Args:
        title: Notification title
        message: Notification message
        level: Notification level (info, warning, error, success)
    """
    notification = {
        "type": "notification",
        "title": title,
        "message": message,
        "level": level,
        "timestamp": datetime.utcnow().isoformat()
    }
    await manager.broadcast(notification, "notifications")
    logger.info(f"Broadcasted notification: {title}")
