#!/usr/bin/env python3
"""
Entry point for running the DoctorSathi AI agent from Node.js
This script is invoked by Express via child_process.spawn()

Usage:
    python run_agent.py <user_id> <user_name> <message> <thread_id> <doctor_context_json>

Input:
    - user_id: Doctor identifier
    - user_name: Doctor display name
    - message: Doctor's command/question
    - thread_id: Conversation thread ID
    - doctor_context_json: JSON string with doctor's workflow context (appointments, prescriptions, etc.)

Output:
    - Prints JSON response to stdout for Node.js to capture
"""
import sys
import json
import os
from agent_graph import invoke_agent

def main():
    try:
        # Parse command-line arguments
        user_id = sys.argv[1] if len(sys.argv) > 1 else "unknown"
        user_name = sys.argv[2] if len(sys.argv) > 2 else "Doctor"
        message = sys.argv[3] if len(sys.argv) > 3 else "Hello"
        thread_id = sys.argv[4] if len(sys.argv) > 4 else None
        doctor_context_str = sys.argv[5] if len(sys.argv) > 5 else "{}"  # JSON string of doctor's data
        
        # Parse doctor context from JSON
        try:
            doctor_context = json.loads(doctor_context_str)
            
            # Debug logging to stderr (won't interfere with JSON stdout)
            print(f"DEBUG: Received doctor context with:", file=sys.stderr)
            print(f"  - Patients: {len(doctor_context.get('patients', []))}", file=sys.stderr)
            print(f"  - Appointments: {len(doctor_context.get('appointments', []))}", file=sys.stderr)
            print(f"  - Prescriptions: {len(doctor_context.get('prescriptions', []))}", file=sys.stderr)
            print(f"  - Records: {len(doctor_context.get('records', []))}", file=sys.stderr)
            print(f"  - Lab Tests: {len(doctor_context.get('labTests', []))}", file=sys.stderr)
            print(f"DEBUG: Message from user: '{message}'", file=sys.stderr)
        except json.JSONDecodeError:
            doctor_context = {}
            print("DEBUG: Failed to parse doctor context JSON!", file=sys.stderr)
        
        # Invoke the LangGraph agent with doctor workflow context
        result = invoke_agent(
            user_id=user_id,
            user_name=user_name,
            message=message,
            thread_id=thread_id,
            patient_context=doctor_context  # Pass doctor's workflow data
        )
        
        # Output JSON response to stdout (Node.js will capture this)
        print(json.dumps(result))
        sys.exit(0)
        
    except Exception as e:
        # Print full traceback to stderr for debugging
        import traceback
        print(f"ERROR: {str(e)}", file=sys.stderr)
        print("Full traceback:", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        
        # Output error as JSON to stdout
        error_response = {
            "success": False,
            "error": f"Error invoking agent: {str(e)}"
        }
        print(json.dumps(error_response))
        sys.exit(1)


if __name__ == "__main__":
    main()
