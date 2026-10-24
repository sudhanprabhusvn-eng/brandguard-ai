import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Depends
from server.models import ApprovalDecisionRequest
from server.auth import get_current_user
from server import database

router = APIRouter(prefix="/approvals", tags=["Approval Gate"])

@router.get("", response_model=List[dict])
async def list_approval_queue():
    if database.is_connected_to_mongo:
        cursor = database.db.approvals.find({}, {"_id": 0})
        return await cursor.to_list(length=100)
    else:
        return database.in_memory_store["approvals"]

@router.post("/decision", response_model=dict)
async def record_approval_decision(req: ApprovalDecisionRequest, current_user: dict = Depends(get_current_user)):
    user_role = current_user.get("role", "creator")
    
    # Enforce role permission: Creators cannot approve
    if req.decision == "APPROVED" and user_role not in ["approver", "brand_manager", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User with role '{user_role}' is not authorized to grant compliance approval. Approver or Brand Manager role required."
        )
        
    decision_id = f"dec-{uuid.uuid4().hex[:8]}"
    now_iso = datetime.now(timezone.utc).isoformat()
    
    record = {
        "id": decision_id,
        "brandId": req.brandId,
        "brandName": req.brandName,
        "contentId": req.contentId,
        "contentTitle": req.contentTitle,
        "contentVersionId": req.contentVersionId,
        "versionNumber": req.versionNumber,
        "contentHash": req.contentHash,
        "decision": req.decision,
        "reviewerId": current_user.get("sub"),
        "reviewerName": current_user.get("name", "Authorized Reviewer"),
        "reviewerRole": user_role,
        "reason": req.reason or req.comment,
        "comment": req.comment or req.reason,
        "timestamp": now_iso
    }
    
    if database.is_connected_to_mongo:
        await database.db.approvals.insert_one(record)
    else:
        database.in_memory_store["approvals"].append(record)
        
    # Also log an audit event
    audit_event = {
        "id": f"aud-{uuid.uuid4().hex[:8]}",
        "timestamp": now_iso,
        "eventType": f"APPROVAL_{req.decision}",
        "outcome": "SUCCESS",
        "brandId": req.brandId,
        "brandName": req.brandName,
        "contentId": req.contentId,
        "documentTitle": req.contentTitle,
        "contentVersion": req.versionNumber,
        "contentVersionId": req.contentVersionId,
        "contentHash": req.contentHash,
        "actorName": current_user.get("name", "Authorized Reviewer"),
        "actorRole": user_role,
        "summary": f"{req.versionNumber} {req.decision.lower()} by {current_user.get('name')}"
    }
    
    if database.is_connected_to_mongo:
        await database.db.audit_events.insert_one(audit_event)
    else:
        database.in_memory_store["audit_events"].append(audit_event)
        
    return record
