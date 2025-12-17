"""
Pydantic models for chat request/response validation
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any


class ChatRequest(BaseModel):
    """Request model for chat endpoint"""
    user_id: str = Field(..., description="Unique identifier for the patient/user")
    message: str = Field(..., description="User's message/question")
    thread_id: Optional[str] = Field(None, description="Optional thread ID for conversation continuity")


class ChatResponse(BaseModel):
    """Response model for chat endpoint"""
    response: str = Field(..., description="AI-generated response")
    user_id: str = Field(..., description="User ID from request")
    thread_id: str = Field(..., description="Thread ID for conversation tracking")
    patient_context: Optional[Dict[str, Any]] = Field(None, description="Patient context used for response generation")
