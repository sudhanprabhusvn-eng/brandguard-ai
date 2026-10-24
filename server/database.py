import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from motor.motor_asyncio import AsyncIOMotorClient
from server.config import settings
from server.auth import hash_password

logger = logging.getLogger("brandguard.database")

client: Optional[AsyncIOMotorClient] = None
db: Any = None
is_connected_to_mongo: bool = False

# Robust in-memory fallback store if MongoDB isn't reachable
in_memory_store: Dict[str, List[Dict[str, Any]]] = {
    "users": [],
    "profiles": [],
    "submissions": [],
    "evaluations": [],
    "approvals": [],
    "audit_events": []
}

async def connect_to_database():
    global client, db, is_connected_to_mongo
    try:
        client = AsyncIOMotorClient(settings.MONGODB_URL, serverSelectionTimeoutMS=2000)
        # Verify connection
        await client.server_info()
        db = client[settings.DATABASE_NAME]
        is_connected_to_mongo = True
        logger.info(f"Connected to MongoDB at {settings.MONGODB_URL}, database: {settings.DATABASE_NAME}")
        await seed_initial_data()
    except Exception as e:
        is_connected_to_mongo = False
        logger.warning(f"MongoDB connection failed: {e}. Running with resilient in-memory storage mode.")
        await seed_in_memory_data()

async def close_database_connection():
    global client
    if client:
        client.close()
        logger.info("Closed MongoDB connection.")

async def seed_initial_data():
    """Seed baseline users and NovaPulse profile into MongoDB if empty."""
    try:
        user_count = await db.users.count_documents({})
        if user_count == 0:
            demo_users = [
                {
                    "id": "usr-001",
                    "email": "brand_manager@brandguard.ai",
                    "password_hash": hash_password("password123"),
                    "name": "Sarah Chen",
                    "role": "brand_manager",
                    "created_at": datetime.now(timezone.utc).isoformat()
                },
                {
                    "id": "usr-002",
                    "email": "creator@brandguard.ai",
                    "password_hash": hash_password("password123"),
                    "name": "Alex Rivera",
                    "role": "creator",
                    "created_at": datetime.now(timezone.utc).isoformat()
                },
                {
                    "id": "usr-003",
                    "email": "approver@brandguard.ai",
                    "password_hash": hash_password("password123"),
                    "name": "Elena Rostova",
                    "role": "approver",
                    "created_at": datetime.now(timezone.utc).isoformat()
                },
                {
                    "id": "usr-004",
                    "email": "admin@brandguard.ai",
                    "password_hash": hash_password("password123"),
                    "name": "System Admin",
                    "role": "admin",
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
            ]
            await db.users.insert_many(demo_users)
            logger.info("Seeded 4 default demo users into MongoDB.")

        profile_count = await db.profiles.count_documents({})
        if profile_count == 0:
            novapulse_seed = get_seed_novapulse_profile()
            await db.profiles.insert_one(novapulse_seed)
            logger.info("Seeded NovaPulse baseline profile into MongoDB.")
    except Exception as e:
        logger.error(f"Error seeding MongoDB data: {e}")

async def seed_in_memory_data():
    """Seed baseline users and profile into in-memory store."""
    if not in_memory_store["users"]:
        in_memory_store["users"] = [
            {
                "id": "usr-001",
                "email": "brand_manager@brandguard.ai",
                "password_hash": hash_password("password123"),
                "name": "Sarah Chen",
                "role": "brand_manager",
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": "usr-002",
                "email": "creator@brandguard.ai",
                "password_hash": hash_password("password123"),
                "name": "Alex Rivera",
                "role": "creator",
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": "usr-003",
                "email": "approver@brandguard.ai",
                "password_hash": hash_password("password123"),
                "name": "Elena Rostova",
                "role": "approver",
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": "usr-004",
                "email": "admin@brandguard.ai",
                "password_hash": hash_password("password123"),
                "name": "System Admin",
                "role": "admin",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        ]
    if not in_memory_store["profiles"]:
        in_memory_store["profiles"] = [get_seed_novapulse_profile()]

def get_seed_novapulse_profile() -> Dict[str, Any]:
    return {
        "id": "np-org-01",
        "name": "NovaPulse AI",
        "version": "v2.1",
        "description": "Enterprise AI workflow intelligence and automated decision platform brand governance policies.",
        "industry": "B2B Enterprise SaaS / Artificial Intelligence",
        "voiceGuidelines": [
            "Maintain an authoritative, precise, and empowering tone.",
            "Always substaniate performance claims with benchmark citations.",
            "Avoid hyperbolic superlatives without customer-validated case references.",
            "Write with active voice and measurable business outcome descriptions."
        ],
        "requiredPhrases": [
            "NovaPulse",
            "Terms and conditions apply.",
            "Benchmark study of 50 enterprise customers"
        ],
        "prohibitedPhrases": [
            "guarantees results",
            "100% risk-free",
            "completely risk-free",
            "doubled their output",
            "miracle solution"
        ],
        "disclosures": [
            "Terms and conditions apply. Individual enterprise results may vary based on deployment configuration.",
            "Performance metrics verified under supervised beta customer testing environments."
        ],
        "visualGuidelines": [
            "Use primary Deep Teal (#0D3331) and Mint (#00D296) for contrast.",
            "Preserve high contrast (minimum 7:1 for text surfaces).",
            "Avoid saturated neon backgrounds."
        ],
        "rules": [
            {
                "id": "Rule R-001",
                "name": "Prohibit Guaranteed Results",
                "category": "prohibited_language",
                "severity": "critical",
                "pattern": "guarantees?\\s+results?",
                "matchMode": "whole_word",
                "caseSensitive": False,
                "explanation": "Guaranteed results claims violate Section 4 of enterprise promotional guidelines. Performance guarantees require legal sign-off.",
                "suggestedReplacement": "engineered to deliver measurable outcomes",
                "active": True,
                "scope": "all"
            },
            {
                "id": "Rule R-002",
                "name": "Prohibit 100% Risk-Free Claims",
                "category": "prohibited_language",
                "severity": "critical",
                "pattern": "(?:100%\\s+|completely\\s+)?risk[- ]free",
                "matchMode": "whole_word",
                "caseSensitive": False,
                "explanation": "Absolute risk-free marketing claims violate Section 4 of promotional compliance.",
                "suggestedReplacement": "designed for enterprise-grade resilience",
                "active": True,
                "scope": "all"
            },
            {
                "id": "Rule R-003",
                "name": "Factual Performance Claims Substantiation",
                "category": "factual_accuracy",
                "severity": "warning",
                "pattern": "(?:100%\\s+more\\s+productive|doubled\\s+their\\s+output)",
                "matchMode": "whole_word",
                "caseSensitive": False,
                "explanation": "Quantitative productivity claims must cite validated evidence study EVD-NP-01.",
                "suggestedReplacement": "streamlined critical workflows by up to 25% (Benchmark study EVD-NP-01)",
                "active": True,
                "scope": "all",
                "evidenceReferenceId": "EVD-NP-01"
            },
            {
                "id": "Rule R-004",
                "name": "Mandatory Terms and Conditions Disclosure",
                "category": "mandatory_disclosure",
                "severity": "warning",
                "pattern": "terms\\s+and\\s+conditions\\s+apply",
                "matchMode": "whole_word",
                "caseSensitive": False,
                "explanation": "All outward-facing promotional communications require explicit terms and conditions disclosure.",
                "suggestedReplacement": "Terms and conditions apply.",
                "active": True,
                "scope": "all"
            },
            {
                "id": "Rule R-005",
                "name": "Direct and Objective Brand Tone",
                "category": "voice_and_tone",
                "severity": "info",
                "pattern": "(?:miracle\\s+solution|revolutionize\\s+everything)",
                "matchMode": "whole_word",
                "caseSensitive": False,
                "explanation": "Superlative exaggeration conflicts with NovaPulse's empirical voice guideline.",
                "suggestedReplacement": "delivers structured workflow optimization",
                "active": True,
                "scope": "all"
            }
        ],
        "evidenceRecords": [
            {
                "id": "EVD-NP-01",
                "claim": "Benchmark of 50 enterprise beta customers demonstrated an average 25% reduction in task cycle times.",
                "sourceCitation": "NovaPulse Technical Whitepaper 2026, Section 4.2 (Supervised Customer Cohort).",
                "dateAdded": "2026-09-01T00:00:00Z",
                "expirationDate": "2027-09-01T00:00:00Z",
                "verified": True
            },
            {
                "id": "EVD-NP-02",
                "claim": "Enterprise uptime SLA delivers 99.99% availability backed by SOC2 Type II compliance.",
                "sourceCitation": "NovaPulse SOC2 Security & Trust Portal, Audit Period Q2 2026.",
                "dateAdded": "2026-08-15T00:00:00Z",
                "expirationDate": "2027-08-15T00:00:00Z",
                "verified": True
            }
        ],
        "createdAt": "2026-09-01T09:00:00Z",
        "updatedAt": "2026-10-22T10:15:00Z",
        "isDemonstration": True
    }
