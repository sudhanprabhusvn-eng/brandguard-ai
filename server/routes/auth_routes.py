import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status, Depends
from server.models import UserRegister, UserLogin, TokenResponse, UserResponse
from server.auth import hash_password, verify_password, create_access_token, get_current_user
from server import database

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse)
async def register(user_in: UserRegister):
    email = user_in.email.lower().strip()
    
    # Check if exists
    if database.is_connected_to_mongo:
        existing = await database.db.users.find_one({"email": email})
    else:
        existing = next((u for u in database.in_memory_store["users"] if u["email"] == email), None)
        
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )
        
    user_id = f"usr-{uuid.uuid4().hex[:8]}"
    new_user = {
        "id": user_id,
        "email": email,
        "password_hash": hash_password(user_in.password),
        "name": user_in.name,
        "role": user_in.role,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    if database.is_connected_to_mongo:
        await database.db.users.insert_one(new_user)
    else:
        database.in_memory_store["users"].append(new_user)
        
    token = create_access_token({
        "sub": user_id,
        "email": email,
        "name": user_in.name,
        "role": user_in.role
    })
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "email": email,
            "name": user_in.name,
            "role": user_in.role
        }
    }

@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    email = credentials.email.lower().strip()
    
    if database.is_connected_to_mongo:
        user = await database.db.users.find_one({"email": email})
    else:
        user = next((u for u in database.in_memory_store["users"] if u["email"] == email), None)
        
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )
        
    token = create_access_token({
        "sub": user["id"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"]
    })
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"]
        }
    }

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user.get("sub"),
        "email": current_user.get("email"),
        "name": current_user.get("name"),
        "role": current_user.get("role")
    }

@router.get("/demo-accounts")
async def list_demo_accounts():
    """Returns standard pre-seeded demo accounts for one-click testing."""
    return [
        {"role": "brand_manager", "email": "brand_manager@brandguard.ai", "name": "Sarah Chen", "password": "password123"},
        {"role": "creator", "email": "creator@brandguard.ai", "name": "Alex Rivera", "password": "password123"},
        {"role": "approver", "email": "approver@brandguard.ai", "name": "Elena Rostova", "password": "password123"},
        {"role": "admin", "email": "admin@brandguard.ai", "name": "System Admin", "password": "password123"}
    ]
