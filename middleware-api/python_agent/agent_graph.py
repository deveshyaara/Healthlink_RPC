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
    Node 1: Use patient data provided by Node.js backend
    
    The patient context is now fetched from the database by Node.js
    and passed to this agent as part of the initial state.
    """
    existing_context = state.get("patient_context", {})
    
    # Patient context is already provided by Node.js with real database data
    # No need to query again - just structure it for the LLM
    
    patient_context = {
        "name": existing_context.get("name", "Patient"),
        "age": existing_context.get("age", "Unknown"),
        "gender": existing_context.get("gender", "Not specified"),
        "email": existing_context.get("email", "Not provided"),
        "appointments": existing_context.get("appointments", []),
        "prescriptions": existing_context.get("prescriptions", []),
        "records": existing_context.get("records", []),
        "diagnoses": existing_context.get("diagnoses", []),
        "medications": existing_context.get("medications", []),
        "last_visit": existing_context.get("last_visit", "N/A"),
        "stats": existing_context.get("stats", {})
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
    
    # Extract patient details from real database data
    name = patient_context.get("name", "Patient")
    age = patient_context.get("age", "Unknown")
    gender = patient_context.get("gender", "Not specified")
    
    # Real data from database
    appointments = patient_context.get("appointments", [])
    prescriptions = patient_context.get("prescriptions", [])
    records = patient_context.get("records", [])
    diagnoses = patient_context.get("diagnoses", [])
    medications = patient_context.get("medications", [])
    
    # Format medical history from records
    medical_history = "No medical records on file"
    if records:
        recent_records = records[:3]  # Most recent 3
        medical_history = "; ".join([
            f"{r.get('diagnosis', 'Unknown diagnosis')} (treated with {r.get('treatment', 'N/A')})"
            for r in recent_records
        ])
    
    # Format recent appointments
    recent_appointments = "No recent appointments"
    if appointments:
        recent_apts = appointments[:2]
        recent_appointments = "; ".join([
            f"{a.get('scheduledAt', 'Unknown date')} - {a.get('status', 'Unknown status')}"
            for a in recent_apts
        ])
    
    # Format current medications from prescriptions
    current_meds = "None on record"
    if medications:
        current_meds = ", ".join(medications)
    elif prescriptions:
        current_meds = ", ".join([p.get('medication', 'Unknown') for p in prescriptions[:5]])
    
    diagnoses_str = ", ".join(diagnoses) if diagnoses else "None on record"
    
    # Construct dynamic system prompt with REAL patient context
    system_prompt = f"""You are a helpful and empathetic medical assistant AI for HealthLink, an Ethereum-based healthcare platform.

You are currently speaking to **{name}**, who is **{age} years old** and identifies as **{gender}**.

**Patient Medical Context (Real Data from Database):**
- **Recent Medical History:** {medical_history}
- **Current Diagnoses:** {diagnoses_str}
- **Current Medications:** {current_meds}
- **Recent Appointments:** {recent_appointments}
- **Total Prescriptions on File:** {len(prescriptions)}
- **Total Medical Records:** {len(records)}

**Important Guidelines:**
1. Provide personalized advice based on the patient's ACTUAL medical context shown above
2. Always be empathetic and supportive in your tone
3. DO NOT provide medical diagnoses or prescribe new medications
4. Reference their specific conditions, medications, and appointments when relevant
5. If the question requires immediate medical attention, advise the patient to contact their healthcare provider
6. Be clear that you are an AI assistant and not a replacement for professional medical advice
7. Use the patient's name naturally in conversation

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
def invoke_agent(user_id: str, user_name: str, message: str, thread_id: str = None, patient_context: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Helper function to invoke the healthcare agent.
    
    Args:
        user_id: Patient/user identifier
        user_name: Patient/user display name
        message: User's question/message
        thread_id: Optional thread ID for conversation tracking
        patient_context: Patient medical context from Node.js (real database data)
        
    Returns:
        Dictionary containing response and metadata
    """
    try:
        # Prepare config with thread ID
        config = {"configurable": {"thread_id": thread_id or f"thread-{user_id}"}}
        
        # Merge provided patient context with user name
        initial_patient_context = {"name": user_name}
        if patient_context:
            initial_patient_context.update(patient_context)
        
        # Prepare initial state
        initial_state = {
            "messages": [HumanMessage(content=message)],
            "user_id": user_id,
            "patient_context": initial_patient_context,
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
