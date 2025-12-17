import os
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables
load_dotenv()

# Get API key
api_key = os.getenv('GOOGLE_API_KEY') or os.getenv('GEMINI_API_KEY')
print(f"Using API key: {api_key[:20]}...")

# Configure genai
genai.configure(api_key=api_key)

# List all available models
print("\nAvailable models:")
for model in genai.list_models():
    if 'generateContent' in model.supported_generation_methods:
        print(f"  - {model.name}")
        print(f"    Display name: {model.display_name}")
        print(f"    Description: {model.description}")
        print()
