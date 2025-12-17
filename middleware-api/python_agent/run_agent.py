#!/usr/bin/env python3
"""
Entry point for running the HealthLink AI agent from Node.js
This script is invoked by Express via child_process.spawn()

Usage:
    python run_agent.py <user_id> <user_name> <message> [thread_id]

Input:
    - user_id: Patient/user identifier
    - user_name: Patient/user display name
    - message: User's question
    - thread_id (optional): Conversation thread ID

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
        if len(sys.argv) < 4:
            raise ValueError("Usage: python run_agent.py <user_id> <user_name> <message> [thread_id]")
        
        user_id = sys.argv[1]
        user_name = sys.argv[2]
        message = sys.argv[3]
        thread_id = sys.argv[4] if len(sys.argv) > 4 else None
        
        # Invoke the LangGraph agent
        result = invoke_agent(
            user_id=user_id,
            user_name=user_name,
            message=message,
            thread_id=thread_id
        )
        
        # Output JSON response to stdout (Node.js will capture this)
        print(json.dumps(result, ensure_ascii=False))
        sys.exit(0)
        
    except Exception as e:
        # Output error as JSON to stdout
        error_response = {
            "error": str(e),
            "success": False
        }
        print(json.dumps(error_response, ensure_ascii=False))
        sys.exit(1)


if __name__ == "__main__":
    main()
