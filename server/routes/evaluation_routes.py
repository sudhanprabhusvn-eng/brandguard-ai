import re
import hashlib
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends
from server.models import EvaluationRequest, EvaluationResponse, FindingModel
from server.auth import get_current_user
from server import database

router = APIRouter(prefix="/evaluations", tags=["Compliance Engine"])

def compute_sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()

def evaluate_text_against_rules(text: str, profile: Dict[str, Any]) -> List[Dict[str, Any]]:
    findings = []
    rules = profile.get("rules", [])
    content_hash = compute_sha256(text)
    
    for idx, rule in enumerate(rules):
        if not rule.get("active", True):
            continue
            
        pattern = rule.get("pattern", "")
        if not pattern:
            continue
            
        case_sensitive = rule.get("caseSensitive", False)
        flags = 0 if case_sensitive else re.IGNORECASE
        
        # Whole word boundary handling
        regex_pattern = pattern
        if rule.get("matchMode") == "whole_word" and not pattern.startswith(r"\b"):
            regex_pattern = rf"\b(?:{pattern})\b"
            
        try:
            compiled = re.compile(regex_pattern, flags)
            for m in compiled.finditer(text):
                trigger_text = m.group(0)
                findings.append({
                    "id": f"fnd_{content_hash[:8]}_{rule['id']}_{len(findings)}",
                    "ruleId": rule["id"],
                    "ruleName": rule["name"],
                    "ruleVersion": rule.get("updatedAt", "v1.0"),
                    "ruleType": "prohibited_phrase" if rule["category"] == "prohibited_language" else "factual_accuracy",
                    "severity": rule["severity"],
                    "category": rule["category"],
                    "status": "FAIL",
                    "engineType": "deterministic",
                    "triggerText": trigger_text,
                    "startIndex": m.start(),
                    "endIndex": m.end(),
                    "explanation": rule.get("explanation", "Brand rule violation detected."),
                    "evidenceStatus": "unverified" if rule.get("evidenceReferenceId") else "na",
                    "evidenceCitation": rule.get("evidenceReferenceId"),
                    "suggestionText": rule.get("suggestedReplacement"),
                    "suggestedAction": f"Replace with: '{rule.get('suggestedReplacement')}'" if rule.get("suggestedReplacement") else "Review with compliance team."
                })
        except Exception:
            pass

    # Check for missing mandatory disclosures
    for rule in rules:
        if rule.get("category") == "mandatory_disclosure" and rule.get("active", True):
            pattern = rule.get("pattern", "")
            try:
                if not re.search(pattern, text, re.IGNORECASE):
                    findings.append({
                        "id": f"fnd_{content_hash[:8]}_{rule['id']}_missing",
                        "ruleId": rule["id"],
                        "ruleName": rule["name"],
                        "ruleVersion": rule.get("updatedAt", "v1.0"),
                        "ruleType": "missing_disclosure",
                        "severity": rule["severity"],
                        "category": rule["category"],
                        "status": "FAIL",
                        "engineType": "deterministic",
                        "triggerText": "[Missing required disclaimer]",
                        "startIndex": 0,
                        "endIndex": 0,
                        "explanation": rule.get("explanation", "Mandatory disclaimer missing from content."),
                        "evidenceStatus": "missing",
                        "evidenceCitation": None,
                        "suggestionText": rule.get("suggestedReplacement"),
                        "suggestedAction": f"Append mandatory disclosure: '{rule.get('suggestedReplacement')}'"
                    })
            except Exception:
                pass
                
    return findings

@router.post("/evaluate", response_model=EvaluationResponse)
async def evaluate_content(req: EvaluationRequest):
    # Fetch active brand profile
    if req.brandProfileId:
        if database.is_connected_to_mongo:
            profile = await database.db.profiles.find_one({"id": req.brandProfileId}, {"_id": 0})
        else:
            profile = next((p for p in database.in_memory_store["profiles"] if p["id"] == req.brandProfileId), None)
    else:
        if database.is_connected_to_mongo:
            profile = await database.db.profiles.find_one({}, {"_id": 0})
        else:
            profile = database.in_memory_store["profiles"][0] if database.in_memory_store["profiles"] else None
            
    if not profile:
        profile = database.get_seed_novapulse_profile()
        
    findings = evaluate_text_against_rules(req.text, profile)
    content_hash = compute_sha256(req.text)
    
    critical_count = sum(1 for f in findings if f["severity"] == "critical")
    warning_count = sum(1 for f in findings if f["severity"] == "warning")
    info_count = sum(1 for f in findings if f["severity"] == "info")
    
    # Calculate score: baseline 100 - (critical * 25) - (warning * 10) - (info * 3)
    score_deduction = (critical_count * 25) + (warning_count * 10) + (info_count * 3)
    compliance_score = max(0, min(100, 100 - score_deduction))
    overall_status = "FAIL" if critical_count > 0 else ("WARNING" if warning_count > 0 else "PASS")
    
    eval_id = f"eval-{uuid.uuid4().hex[:8]}"
    evaluated_at = datetime.now(timezone.utc).isoformat()
    
    eval_result = {
        "evaluationId": eval_id,
        "contentHash": content_hash,
        "overallStatus": overall_status,
        "complianceScore": compliance_score,
        "criticalCount": critical_count,
        "warningCount": warning_count,
        "infoCount": info_count,
        "findings": findings,
        "evaluatedAt": evaluated_at
    }
    
    # Persist evaluation result
    if database.is_connected_to_mongo:
        await database.db.evaluations.insert_one(eval_result)
    else:
        database.in_memory_store["evaluations"].append(eval_result)
        
    return eval_result

@router.post("/submissions", response_model=dict)
async def create_submission(submission_data: dict, current_user: dict = Depends(get_current_user)):
    sub_id = submission_data.get("id", f"sub-{uuid.uuid4().hex[:8]}")
    submission_data["id"] = sub_id
    submission_data["authorId"] = current_user.get("sub")
    submission_data["authorEmail"] = current_user.get("email")
    submission_data["timestamp"] = datetime.now(timezone.utc).isoformat()
    
    if database.is_connected_to_mongo:
        await database.db.submissions.insert_one(submission_data)
    else:
        database.in_memory_store["submissions"].append(submission_data)
        
    return submission_data

@router.get("/submissions", response_model=List[dict])
async def list_submissions():
    if database.is_connected_to_mongo:
        cursor = database.db.submissions.find({}, {"_id": 0})
        return await cursor.to_list(length=100)
    else:
        return database.in_memory_store["submissions"]
