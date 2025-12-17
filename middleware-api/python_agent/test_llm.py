import os
import sys
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage

# Load environment
load_dotenv()

print(f"GEMINI_API_KEY present: {bool(os.getenv('GEMINI_API_KEY'))}")
print(f"GOOGLE_API_KEY present: {bool(os.getenv('GOOGLE_API_KEY'))}")
print(f"GEMINI_MODEL: {os.getenv('GEMINI_MODEL', 'NOT SET')}")

try:
    # Try to initialize LLM
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    print(f"\nUsing API key: {api_key[:20]}..." if api_key else "NO API KEY")
    
    llm = ChatGoogleGenerativeAI(
        model=os.getenv("GEMINI_MODEL", "gemini-1.5-flash"),
        temperature=0.2,
        google_api_key=api_key
    )
    
    print("LLM initialized successfully!")
    
    # Test a simple message
    response = llm.invoke([HumanMessage(content="Say hello")])
    print(f"\nResponse: {response.content}")
    
except Exception as e:
    print(f"\nError: {type(e).__name__}: {str(e)}")
    import traceback
    traceback.print_exc()
