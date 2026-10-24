import uuid
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, HTTPException, status, Depends
from server.models import BrandProfileModel
from server.auth import get_current_user
from server import database

router = APIRouter(prefix="/profiles", tags=["Brand Profiles"])

@router.get("", response_model=List[dict])
async def list_profiles():
    if database.is_connected_to_mongo:
        cursor = database.db.profiles.find({}, {"_id": 0})
        profiles = await cursor.to_list(length=100)
    else:
        profiles = database.in_memory_store["profiles"]
    return profiles

@router.get("/{profile_id}")
async def get_profile(profile_id: str):
    if database.is_connected_to_mongo:
        profile = await database.db.profiles.find_one({"id": profile_id}, {"_id": 0})
    else:
        profile = next((p for p in database.in_memory_store["profiles"] if p["id"] == profile_id), None)
    if not profile:
        raise HTTPException(status_code=404, detail="Brand profile not found")
    return profile

@router.post("", response_model=dict)
async def create_profile(profile_data: BrandProfileModel, current_user: dict = Depends(get_current_user)):
    profile_dict = profile_data.model_dump()
    if not profile_dict.get("id"):
        profile_dict["id"] = f"brand-{uuid.uuid4().hex[:8]}"
    profile_dict["createdAt"] = datetime.now(timezone.utc).isoformat()
    profile_dict["updatedAt"] = profile_dict["createdAt"]
    
    if database.is_connected_to_mongo:
        await database.db.profiles.insert_one(profile_dict)
    else:
        database.in_memory_store["profiles"].append(profile_dict)
        
    return profile_dict

@router.put("/{profile_id}", response_model=dict)
async def update_profile(profile_id: str, profile_data: BrandProfileModel, current_user: dict = Depends(get_current_user)):
    profile_dict = profile_data.model_dump()
    profile_dict["updatedAt"] = datetime.now(timezone.utc).isoformat()
    
    if database.is_connected_to_mongo:
        res = await database.db.profiles.update_one({"id": profile_id}, {"$set": profile_dict})
        if res.matched_count == 0:
            raise HTTPException(status_code=404, detail="Brand profile not found")
    else:
        idx = next((i for i, p in enumerate(database.in_memory_store["profiles"]) if p["id"] == profile_id), None)
        if idx is None:
            raise HTTPException(status_code=404, detail="Brand profile not found")
        database.in_memory_store["profiles"][idx] = profile_dict
        
    return profile_dict

@router.post("/reset-baseline", response_model=dict)
async def reset_baseline(current_user: dict = Depends(get_current_user)):
    seed = database.get_seed_novapulse_profile()
    if database.is_connected_to_mongo:
        await database.db.profiles.delete_many({})
        await database.db.profiles.insert_one(seed)
    else:
        database.in_memory_store["profiles"] = [seed]
    return seed
