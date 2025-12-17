"""
LangGraph implementation for healthcare chatbot with patient context
Integrated with HealthLink Ethereum blockchain system
"""
import os
from typing import TypedDict, List, Dict, Any
from dotenv import load_dotenv

from langchain_core.messages import AnyMessage, SystemMessage, HumanMessage, AIMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import StateGraph, END

# Load environment variables
load_dotenv()


# -----------------
# 1. DEFINE THE AGENT STATE
# -----------------
class AgentState(TypedDict):
    """
    State object that flows through the graph nodes.
    Contains all data needed for personalized medical responses.
    """
    messages: List[AnyMessage]  # Conversation history
    user_id: str  # Patient/user identifier
    patient_context: Dict[str, Any]  # Fetched patient data
    response: str  # Final AI response


# -----------------
# 2. CONTEXT FETCHER NODE
# -----------------
def fetch_patient_context(state: AgentState) -> Dict[str, Any]:
    """
    Node 1: Fetch patient data from database and blockchain
    
    NOTE: Currently returns mock data. In production, this should:
    - Query Supabase/PostgreSQL for basic patient info
    - Query Ethereum contracts for medical records
    - Integrate with middleware-api endpoints
    """
    user_id = state["user_id"]
    
    patient_context = {}
    
    try:
        # TODO: Replace with actual API calls to middleware-api
        # Example:
        # response = requests.get(f"http://localhost:3001/api/patients/{user_id}")
        # patient_data = response.json()
        
        # MOCK DATA (temporary)
        patient_context["name"] = "Patient"
        patient_context["age"] = "N/A"
        patient_context["email"] = "patient@example.com"
        patient_context["medical_history"] = "No data available"
        patient_context["diagnoses"] = []
        patient_context["medications"] = []
        patient_context["allergies"] = ["None known"]
        patient_context["last_visit"] = "N/A"
        
    except Exception as e:
        # Provide minimal fallback context
        patient_context = {
            "name": "Patient",
            "age": "Unknown",
            "medical_history": "No data available",
            "error": str(e)
        }
    
    return {"patient_context": patient_context}


# -----------------
# 3. CHATBOT NODE (LLM Response Generation)
# -----------------
def generate_response(state: AgentState) -> Dict[str, Any]:
    """
    Node 2: Generate personalized medical response using Google Gemini LLM
    """
    patient_context = state["patient_context"]
    messages = state["messages"]
    
    # Extract patient details
    name = patient_context.get("name", "Patient")
    age = patient_context.get("age", "Unknown")
    medical_history = patient_context.get("medical_history", "No medical history available")
    diagnoses = ", ".join(patient_context.get("diagnoses", []))
    medications = ", ".join(patient_context.get("medications", []))
    allergies = ", ".join(patient_context.get("allergies", ["None known"]))
    
    # Construct dynamic system prompt with patient context
    system_prompt = f"""You are a helpful and empathetic medical assistant AI for HealthLink, an Ethereum-based healthcare platform.

You are currently speaking to **{name}**, who is **{age} years old**.

**Patient Medical Context:**
- **Medical History:** {medical_history}
- **Current Diagnoses:** {diagnoses or "None on record"}
- **Current Medications:** {medications or "None on record"}
- **Known Allergies:** {allergies}

**Important Guidelines:**
1. Provide personalized advice based on the patient's specific medical context
2. Always be empathetic and supportive in your tone
3. DO NOT provide medical diagnoses or prescribe medications
4. If the question requires immediate medical attention, advise the patient to contact their healthcare provider
5. Reference their specific conditions and medications when relevant
6. Be clear that you are an AI assistant and not a replacement for professional medical advice

Answer the patient's question based on their medical context while following these guidelines."""

    try:
        # Initialize Google Gemini LLM
        llm = ChatGoogleGenerativeAI(
            model=os.getenv("GEMINI_MODEL", "gemini-2.0-flash-exp"),
            temperature=float(os.getenv("LLM_TEMPERATURE", "0.2")),
            google_api_key=os.getenv("GEMINI_API_KEY")
        )
        
        # Construct full message history with system prompt
        full_messages = [SystemMessage(content=system_prompt)] + messages
        
        # Invoke LLM
        response = llm.invoke(full_messages)
        ai_response = response.content
        
        # Update messages with AI response
        updated_messages = messages + [AIMessage(content=ai_response)]
        
        return {
            "messages": updated_messages,
            "response": ai_response
        }
        
    except Exception as e:
        error_response = "I apologize, but I'm having trouble processing your request right now. Please try again or contact your healthcare provider if this is urgent."
        
        return {
            "messages": messages + [AIMessage(content=error_response)],
            "response": error_response
        }


# -----------------
# 4. BUILD THE LANGGRAPH
# -----------------
def create_healthcare_agent() -> StateGraph:
    """
    Creates and compiles the LangGraph workflow for the healthcare chatbot.
    
    Flow: START -> fetch_patient_context -> generate_response -> END
    """
    # Initialize the graph with AgentState
    workflow = StateGraph(AgentState)
    
    # Add nodes
    workflow.add_node("fetch_patient_context", fetch_patient_context)
    workflow.add_node("generate_response", generate_response)
    
    # Define the flow
    workflow.set_entry_point("fetch_patient_context")
    workflow.add_edge("fetch_patient_context", "generate_response")
    workflow.add_edge("generate_response", END)
    
    # Compile the graph
    app = workflow.compile()
    
    return app


# -----------------
# 5. INITIALIZE THE AGENT (Module-level)
# -----------------
healthcare_agent = create_healthcare_agent()


# -----------------
# 6. HELPER FUNCTION FOR EASY INVOCATION
# -----------------
def invoke_agent(user_id: str, message: str, thread_id: str = None) -> Dict[str, Any]:
    """
    Helper function to invoke the healthcare agent.
    
    Args:
        user_id: Patient/user identifier
        message: User's question/message
        thread_id: Optional thread ID for conversation tracking
        
    Returns:
        Dictionary containing response and metadata
    """
    try:
        # Prepare config with thread ID
        config = {"configurable": {"thread_id": thread_id or f"thread-{user_id}"}}
        
        # Prepare initial state
        initial_state = {
            "messages": [HumanMessage(content=message)],
            "user_id": user_id,
            "patient_context": {},
            "response": ""
        }
        
        # Invoke the agent
        final_state = healthcare_agent.invoke(initial_state, config)
        
        return {
            "response": final_state.get("response", ""),
            "user_id": user_id,
            "thread_id": config["configurable"]["thread_id"],
            "patient_context": final_state.get("patient_context", {})
        }
        
    except Exception as e:
        raise Exception(f"Error invoking agent: {str(e)}")
