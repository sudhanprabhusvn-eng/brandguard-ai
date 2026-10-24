from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field
from datetime import datetime

# --- AUTHENTICATION MODELS ---
class UserRole:
    BRAND_MANAGER = "brand_manager"
    CREATOR = "creator"
    APPROVER = "approver"
    ADMIN = "admin"

class UserRegister(BaseModel):
    email: str
    password: str = Field(..., min_length=6)
    name: str
    role: str = Field(default=UserRole.CREATOR)

class UserLogin(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    created_at: str

# --- BRAND GOVERNANCE MODELS ---
class BrandRuleModel(BaseModel):
    id: str
    name: str
    category: str
    severity: str
    pattern: str
    matchMode: Optional[str] = "whole_word"
    caseSensitive: Optional[bool] = False
    explanation: str
    suggestedReplacement: Optional[str] = None
    active: bool = True
    scope: Optional[str] = "all"
    evidenceReferenceId: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

class EvidenceRecordModel(BaseModel):
    id: str
    claim: str
    sourceCitation: str
    dateAdded: str
    expirationDate: str
    verified: bool

class BrandProfileModel(BaseModel):
    id: str
    name: str
    version: str = "v1.0"
    description: str
    industry: Optional[str] = None
    voiceGuidelines: List[str] = []
    requiredPhrases: List[str] = []
    prohibitedPhrases: List[str] = []
    disclosures: List[str] = []
    visualGuidelines: List[str] = []
    rules: List[BrandRuleModel] = []
    evidenceRecords: List[EvidenceRecordModel] = []
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None
    isDemonstration: Optional[bool] = False

# --- EVALUATION MODELS ---
class FindingModel(BaseModel):
    id: str
    ruleId: str
    ruleName: str
    ruleVersion: Optional[str] = "v1.0"
    ruleType: Optional[str] = "prohibited_phrase"
    severity: str
    category: str
    status: Optional[str] = "FAIL"
    engineType: Optional[str] = "deterministic"
    triggerText: str
    startIndex: int
    endIndex: int
    explanation: str
    evidenceStatus: Optional[str] = "na"
    evidenceCitation: Optional[str] = None
    suggestionText: Optional[str] = None
    suggestedAction: Optional[str] = None

class EvaluationRequest(BaseModel):
    title: str
    channel: str = "Social Post"
    text: str
    brandProfileId: Optional[str] = None

class EvaluationResponse(BaseModel):
    evaluationId: str
    contentHash: str
    overallStatus: str
    complianceScore: int
    criticalCount: int
    warningCount: int
    infoCount: int
    findings: List[FindingModel]
    evaluatedAt: str

# --- APPROVAL & AUDIT MODELS ---
class ApprovalDecisionRequest(BaseModel):
    brandId: str
    brandName: str
    contentId: str
    contentTitle: str
    contentVersionId: str
    versionNumber: str
    contentHash: str
    decision: str  # APPROVED, REJECTED, REVISIONS_REQUESTED
    reason: Optional[str] = None
    comment: Optional[str] = None

class AuditEventModel(BaseModel):
    id: str
    timestamp: str
    eventType: str
    outcome: Optional[str] = "SUCCESS"
    brandId: Optional[str] = None
    brandName: Optional[str] = None
    contentId: Optional[str] = None
    documentTitle: str
    contentVersion: str
    contentVersionId: Optional[str] = None
    contentHash: str
    ruleId: Optional[str] = None
    ruleVersion: Optional[str] = None
    actorName: str
    actorRole: str
    summary: str
    parentHash: Optional[str] = None
    eventHash: Optional[str] = None
