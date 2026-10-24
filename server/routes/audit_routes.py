import hashlib
import io
import csv
from datetime import datetime, timezone
from typing import List, Dict, Any
from fastapi import APIRouter, Response, Depends
from server.auth import get_current_user
from server import database

router = APIRouter(prefix="/audit", tags=["Audit & Cryptographic Ledger"])

def compute_event_hash(event: Dict[str, Any], parent_hash: str) -> str:
    serialized = f"{parent_hash}:{event.get('id')}:{event.get('timestamp')}:{event.get('eventType')}:{event.get('contentHash', '')}"
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

@router.get("", response_model=List[dict])
async def list_audit_events():
    if database.is_connected_to_mongo:
        cursor = database.db.audit_events.find({}, {"_id": 0}).sort("timestamp", -1)
        events = await cursor.to_list(length=200)
    else:
        events = sorted(database.in_memory_store["audit_events"], key=lambda x: x.get("timestamp", ""), reverse=True)
    return events

@router.post("/verify")
async def verify_audit_chain():
    if database.is_connected_to_mongo:
        cursor = database.db.audit_events.find({}, {"_id": 0}).sort("timestamp", 1)
        events = await cursor.to_list(length=500)
    else:
        events = sorted(database.in_memory_store["audit_events"], key=lambda x: x.get("timestamp", ""))
        
    if not events:
        return {"isValid": True, "eventCount": 0, "message": "Ledger is empty; genesis state valid."}
        
    genesis_hash = "0000000000000000000000000000000000000000000000000000000000000000"
    current_parent = genesis_hash
    
    for idx, ev in enumerate(events):
        expected_hash = compute_event_hash(ev, current_parent)
        actual_hash = ev.get("eventHash")
        if actual_hash and actual_hash != expected_hash:
            return {
                "isValid": False,
                "eventCount": len(events),
                "corruptedEventId": ev.get("id"),
                "error": f"Sequential block digest mismatch at index {idx} (event {ev.get('id')})"
            }
        current_parent = expected_hash
        
    return {
        "isValid": True,
        "eventCount": len(events),
        "latestLedgerHash": current_parent,
        "verifiedAt": datetime.now(timezone.utc).isoformat()
    }

@router.get("/export/csv")
async def export_audit_csv():
    if database.is_connected_to_mongo:
        cursor = database.db.audit_events.find({}, {"_id": 0}).sort("timestamp", 1)
        events = await cursor.to_list(length=1000)
    else:
        events = sorted(database.in_memory_store["audit_events"], key=lambda x: x.get("timestamp", ""))
        
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Event ID", "Timestamp (UTC)", "Event Type", "Document Title", "Version", "Content SHA-256", "Actor", "Role", "Summary"])
    
    for ev in events:
        # Prevent CSV injection by escaping starting special chars
        def escape_val(v):
            val_str = str(v or "")
            if val_str and val_str[0] in ("=", "+", "-", "@"):
                return f"'{val_str}"
            return val_str
            
        writer.writerow([
            escape_val(ev.get("id")),
            escape_val(ev.get("timestamp")),
            escape_val(ev.get("eventType")),
            escape_val(ev.get("documentTitle")),
            escape_val(ev.get("contentVersion")),
            escape_val(ev.get("contentHash")),
            escape_val(ev.get("actorName")),
            escape_val(ev.get("actorRole")),
            escape_val(ev.get("summary"))
        ])
        
    csv_bytes = output.getvalue().encode("utf-8")
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=brandguard-audit-ledger-{int(datetime.now().timestamp())}.csv"}
    )
