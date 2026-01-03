"""
LangGraph implementation for DoctorSathi - Doctor workflow automation assistant
Integrated with HealthLink Ethereum blockchain system
"""
import os
import sys
import time
import json
import re
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
    Contains all data needed for doctor workflow automation.
    """
    messages: List[AnyMessage]  # Conversation history
    user_id: str  # Doctor identifier
    patient_context: Dict[str, Any]  # Doctor's workflow data
    response: str  # Final AI response


# -----------------
# 2. CONTEXT FETCHER NODE
# -----------------
def fetch_patient_context(state: AgentState) -> Dict[str, Any]:
    """
    Node 1: Use doctor data provided by Node.js backend
    
    The doctor context is fetched from the database by Node.js
    and passed to this agent as part of the initial state.
    """
    existing_context = state.get("patient_context", {})
    
    # Doctor context is already provided by Node.js with real database data
    # Structure it for the LLM
    
    doctor_context = {
        "name": existing_context.get("name", "Doctor"),
        "appointments": existing_context.get("appointments", []),
        "prescriptions": existing_context.get("prescriptions", []),
        "records": existing_context.get("records", []),
        "labTests": existing_context.get("labTests", []),
        "patients": existing_context.get("patients", []),
        "stats": existing_context.get("stats", {})
    }
    
    return {"patient_context": doctor_context}


# -----------------
# 3. DOCTOR WORKFLOW AUTOMATION NODE
# -----------------
def generate_response(state: AgentState) -> Dict[str, Any]:
    """
    Node 2: Generate intelligent doctor workflow automation responses using Google Gemini LLM
    Helps doctors with scheduling, prescriptions, lab orders, patient lookup, and insights
    """
    patient_context = state["patient_context"]
    messages = state["messages"]
    
    # Extract doctor's real data from database
    doctor_name = patient_context.get("name", "Doctor")
    appointments = patient_context.get("appointments", [])
    prescriptions = patient_context.get("prescriptions", [])
    records = patient_context.get("records", [])
    lab_tests = patient_context.get("labTests", [])
    patients = patient_context.get("patients", [])
    stats = patient_context.get("stats", {})
    
    # Format appointments summary
    appointments_summary = "No appointments on record"
    if appointments:
        pending_apts = [a for a in appointments if a.get('status') == 'SCHEDULED']
        completed_apts = [a for a in appointments if a.get('status') == 'COMPLETED']
        cancelled_apts = [a for a in appointments if a.get('status') == 'CANCELLED']
        appointments_summary = f"{len(appointments)} total appointments ({len(pending_apts)} scheduled, {len(completed_apts)} completed, {len(cancelled_apts)} cancelled)"
        
        # Show recent appointments with patient details
        recent_apts_list = []
        for a in appointments[:5]:
            patient_name = a.get('patientName', 'Unknown')
            scheduled = a.get('scheduledAt', 'Unknown date')
            status = a.get('status', 'Unknown')
            title = a.get('title', a.get('description', 'No title'))  # Use title or description
            recent_apts_list.append(f"• {patient_name} - {scheduled} - {status} - {title}")
        appointments_summary += "\n" + "\n".join(recent_apts_list)
    
    # Format prescriptions summary
    prescriptions_summary = "No prescriptions on record"
    if prescriptions:
        prescriptions_summary = f"{len(prescriptions)} total prescriptions"
        recent_presc_list = []
        for p in prescriptions[:5]:
            patient_name = p.get('patientName', 'Unknown')
            medication = p.get('medication', 'Unknown')
            dosage = p.get('dosage', 'N/A')
            status = p.get('status', 'Unknown')
            recent_presc_list.append(f"• {patient_name}: {medication} {dosage} - Status: {status}")
        prescriptions_summary += "\n" + "\n".join(recent_presc_list)
    
    # Format medical records summary
    records_summary = "No medical records on file"
    if records:
        records_summary = f"{len(records)} total medical records"
        recent_records_list = []
        for r in records[:5]:
            patient_name = r.get('patientName', 'Unknown')
            title = r.get('title', 'Untitled')
            description = r.get('description', 'No description')
            record_type = r.get('recordType', 'General')
            recent_records_list.append(f"• {patient_name}: {title} - {description[:50]}... - Type: {record_type}")
        records_summary += "\n" + "\n".join(recent_records_list)
    
    # Format lab tests summary
    lab_tests_summary = "No lab tests on record"
    if lab_tests:
        pending_tests = [t for t in lab_tests if t.get('status') in ['PENDING', 'IN_PROGRESS']]
        completed_tests = [t for t in lab_tests if t.get('status') == 'COMPLETED']
        lab_tests_summary = f"{len(lab_tests)} total lab tests ({len(pending_tests)} pending, {len(completed_tests)} completed)"
        
        recent_tests_list = []
        for t in lab_tests[:5]:
            patient_name = t.get('patientName', 'Unknown')
            test_name = t.get('testName', 'Unknown')
            test_type = t.get('testType', 'N/A')
            status = t.get('status', 'Unknown')
            recent_tests_list.append(f"• {patient_name}: {test_name} ({test_type}) - {status}")
        lab_tests_summary += "\n" + "\n".join(recent_tests_list)
    
    # Format patient list
    patients_summary = "No patients on record"
    if patients:
        patients_summary = f"{len(patients)} total patients"
        patient_list = []
        for p in patients[:20]:  # Show up to 20 patients
            name = p.get('name', 'Unknown')
            email = p.get('email', 'N/A')
            patient_list.append(f"• {name} ({email})")
            print(f"DEBUG: Patient found - Name: {name}, Email: {email}", file=sys.stderr)
        patients_summary += "\n" + "\n".join(patient_list)
    
    print(f"DEBUG: Patients summary being sent to LLM:", file=sys.stderr)
    print(f"{patients_summary}", file=sys.stderr)
    
    # Get statistics
    total_patients = stats.get("totalPatients", 0)
    total_appointments = stats.get("totalAppointments", 0)
    pending_appointments = stats.get("pendingAppointments", 0)
    total_prescriptions = stats.get("totalPrescriptions", 0)
    total_lab_tests = stats.get("totalLabTests", 0)
    total_records = stats.get("totalRecords", 0)
    
    
    # Construct dynamic system prompt for DOCTOR workflow automation
    system_prompt = f"""You are DoctorSathi AI, an intelligent medical workflow automation assistant for doctors on the HealthLink platform.

You are currently assisting **{doctor_name}**, a medical professional.

**Doctor's Current Workload (Real Data from Database):**

📊 **Statistics:**
- Total Patients: {total_patients}
- Total Appointments: {total_appointments} ({pending_appointments} scheduled)
- Active Prescriptions: {total_prescriptions}
- Lab Tests Ordered: {total_lab_tests}
- Medical Records: {total_records}

👥 **Your Patients:**
{patients_summary}

📅 **Recent Appointments:**
{appointments_summary}

💊 **Recent Prescriptions:**
{prescriptions_summary}

📋 **Medical Records:**
{records_summary}

🔬 **Lab Tests:**
{lab_tests_summary}

---

## Semi-Automated Workflow System:

When doctors request actions, generate JSON formatted actions they can review and execute with one click.

### Supported Actions:

**1. CREATE_PRESCRIPTION** - For new prescriptions
**2. SCHEDULE_APPOINTMENT** - For new appointments  
**3. ORDER_LAB_TEST** - For lab test orders
**4. UPDATE_MEDICAL_RECORD** - For adding medical records

### Response Format for Actions:

When generating an action, use this format:

**ACTION_START**
{{"type": "ACTION_TYPE", "data": {{...}}, "description": "..."}}
**ACTION_END**

### Example:
Request: "Create prescription for Devesh Tiwari - Amoxicillin 500mg twice daily for 7 days"

Response:
I'll prepare a prescription for Devesh Tiwari.

**ACTION_START**
{{"type": "CREATE_PRESCRIPTION", "data": {{"patientId": "clabcdefgh123", "patientName": "Devesh Tiwari", "medication": "Amoxicillin", "dosage": "500mg", "instructions": "Take twice daily with food for 7 days", "expiryDate": "2026-01-10"}}, "description": "Prescription: Amoxicillin 500mg for Devesh Tiwari"}}
**ACTION_END**

**Rules:**
1. Validate patient names against the list above
2. Extract patient IDs from context
3. Be specific with dosages and timing
4. Ask for clarification if needed
5. Only generate actions for clear requests

Answer professionally and save doctors time."""
    
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
        
        # Parse actions from response
        actions = parse_actions_from_response(ai_response)
        
        # Remove action blocks from display text
        clean_response = remove_action_blocks(ai_response)
        
        # Update messages with AI response
        updated_messages = messages + [AIMessage(content=clean_response)]
        
        return {
            "messages": updated_messages,
            "response": clean_response,
            "actions": actions  # Include parsed actions
        }
        
    except Exception as e:
        error_response = f"I apologize, but I'm experiencing technical difficulties right now. Error: {str(e)}\n\nPlease try again in a moment or contact support if this persists."
        
        return {
            "messages": messages + [AIMessage(content=error_response)],
            "response": error_response,
            "actions": []
        }


def parse_actions_from_response(response_text):
    """
    Parse action JSON blocks from LLM response
    Format: **ACTION_START** {json} **ACTION_END**
    """
    
    actions = []
    pattern = r'\*\*ACTION_START\*\*(.*?)\*\*ACTION_END\*\*'
    matches = re.findall(pattern, response_text, re.DOTALL)
    
    for match in matches:
        try:
            # Parse JSON from match
            action_json = json.loads(match.strip())
            
            # Add unique ID and timestamp
            action_json['id'] = f"action-{int(time.time() * 1000)}"
            action_json['status'] = 'pending'
            action_json['priority'] = action_json.get('priority', 'medium')
            
            actions.append(action_json)
        except json.JSONDecodeError:
            # Skip invalid JSON
            continue
    
    return actions


def remove_action_blocks(response_text):
    """
    Remove action JSON blocks from response for clean display
    """
    pattern = r'\*\*ACTION_START\*\*.*?\*\*ACTION_END\*\*'
    clean_text = re.sub(pattern, '', response_text, flags=re.DOTALL)
    return clean_text.strip()


# -----------------
# 4. BUILD THE LANGGRAPH
# -----------------
def create_healthcare_agent() -> StateGraph:
    """
    Creates and compiles the LangGraph workflow for DoctorSathi AI.
    
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
    Helper function to invoke the DoctorSathi agent.
    
    Args:
        user_id: Doctor identifier
        user_name: Doctor display name
        message: Doctor's question/command
        thread_id: Optional thread ID for conversation tracking
        patient_context: Doctor workflow context from Node.js (real database data)
        
    Returns:
        Dictionary containing response and metadata
    """
    try:
        # Prepare config with thread ID
        config = {"configurable": {"thread_id": thread_id or f"thread-{user_id}"}}
        
        # Merge provided doctor context with user name
        initial_doctor_context = {"name": user_name}
        if patient_context:
            initial_doctor_context.update(patient_context)
        
        # Prepare initial state
        initial_state = {
            "messages": [HumanMessage(content=message)],
            "user_id": user_id,
            "patient_context": initial_doctor_context,
            "response": ""
        }
        
        # Invoke the agent
        final_state = healthcare_agent.invoke(initial_state, config)
        
        return {
            "response": final_state.get("response", ""),
            "actions": final_state.get("actions", []),  # Include actions
            "user_id": user_id,
            "thread_id": config["configurable"]["thread_id"],
            "patient_context": final_state.get("patient_context", {})
        }
        
    except Exception as e:
        raise Exception(f"Error invoking agent: {str(e)}")
