# HealthLink AI Agent Setup Guide

## Overview
The HealthLink AI Agent is powered by Google Gemini and LangGraph, integrated directly into the Express.js backend. It provides personalized health assistance to users through a chat interface.

## Architecture
- **Frontend**: React ChatWidget component (floating chat button)
- **Backend**: Express.js controller with Node.js `child_process` integration
- **AI Engine**: Python LangGraph agent with Google Gemini LLM
- **Communication**: Inter-process communication via stdin/stdout

## Prerequisites

### 1. Python Installation
Ensure Python 3.8+ is installed and accessible in your system PATH:
```bash
python --version
```

### 2. Install Python Dependencies
Navigate to the middleware-api directory and install required packages:
```bash
cd middleware-api
pip install -r python_agent/requirements.txt
```

**Recommended**: Use a virtual environment:
```bash
# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Linux/Mac)
source venv/bin/activate

# Install dependencies
pip install -r python_agent/requirements.txt
```

### 3. Google Gemini API Key
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key

### 4. Environment Configuration
Add the following to your `middleware-api/.env` file:
```env
# AI Agent Configuration
GEMINI_API_KEY=your-actual-gemini-api-key-here
GEMINI_MODEL=gemini-2.0-flash-exp
LLM_TEMPERATURE=0.2
```

## Project Structure
```
middleware-api/
├── python_agent/
│   ├── agent_graph.py       # LangGraph workflow definition
│   ├── models.py            # Pydantic data models
│   ├── run_agent.py         # Entry point for Node.js
│   └── requirements.txt     # Python dependencies
├── src/
│   ├── controllers/
│   │   └── chat.controller.js   # Express chat controller
│   └── routes/
│       └── chat.routes.js       # Chat API routes
└── .env
```

## API Endpoints

### POST /api/chat
Send a message to the AI agent.

**Authentication**: Required (JWT token)

**Request Body**:
```json
{
  "message": "What should I eat for better blood sugar control?",
  "thread_id": "optional-thread-id-for-conversation-continuity"
}
```

**Response**:
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Message processed successfully",
  "data": {
    "response": "Based on your Type 2 Diabetes diagnosis...",
    "thread_id": "thread-patient-12345",
    "user_id": "patient-12345",
    "patient_context": {
      "name": "Patient",
      "age": "N/A",
      "medical_history": "..."
    }
  }
}
```

### GET /api/chat/health
Check if the Python agent is accessible.

**Authentication**: Not required

**Response**:
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Chat agent is healthy",
  "data": {
    "python_version": "Python 3.11.5",
    "gemini_configured": true
  }
}
```

## Testing the Integration

### 1. Test Python Agent Standalone
```bash
cd middleware-api
python python_agent/run_agent.py "test-user-123" "Hello, what can you help me with?"
```

Expected output (JSON):
```json
{
  "response": "Hello! I'm your HealthLink AI assistant...",
  "user_id": "test-user-123",
  "thread_id": "thread-test-user-123",
  "patient_context": {...}
}
```

### 2. Test Health Check Endpoint
```bash
curl http://localhost:4000/api/chat/health
```

### 3. Test Chat Endpoint
```bash
curl -X POST http://localhost:4000/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"message": "What are the symptoms of diabetes?"}'
```

### 4. Test Frontend Chat Widget
1. Start the backend: `cd middleware-api && npm run dev`
2. Start the frontend: `cd frontend && npm run dev`
3. Log in to the application
4. Click the blue chat button in the bottom-right corner
5. Send a message to the AI assistant

## Troubleshooting

### Error: "Python is not available"
- Ensure Python is installed and in your system PATH
- Test: `python --version` or `python3 --version`
- On some systems, use `python3` instead of `python`

### Error: "GEMINI_API_KEY not configured"
- Check that `.env` file contains `GEMINI_API_KEY=...`
- Restart the Express server after updating `.env`
- Verify API key at [Google AI Studio](https://aistudio.google.com/app/apikey)

### Error: "ModuleNotFoundError: No module named 'langgraph'"
- Install Python dependencies: `pip install -r python_agent/requirements.txt`
- If using virtual environment, ensure it's activated

### Error: "Failed to parse agent response"
- Check Python script output for syntax errors
- Review `stderr` logs in server console
- Ensure Python script prints valid JSON to stdout

### Frontend Chat Not Appearing
- Verify you're logged in (chat requires authentication)
- Check browser console for errors
- Ensure backend is running on correct port (default: 4000)
- Verify `NEXT_PUBLIC_API_URL` environment variable in frontend

## Future Enhancements

### Integration with Backend APIs
Currently, the agent uses mock patient data. To integrate with real data:

1. Update `fetch_patient_context()` in `agent_graph.py`:
```python
import requests

def fetch_patient_context(state: AgentState) -> Dict[str, Any]:
    user_id = state["user_id"]
    
    # Query middleware-api for patient data
    response = requests.get(
        f"http://localhost:4000/api/patients/{user_id}",
        headers={"Authorization": f"Bearer {get_admin_token()}"}
    )
    patient_data = response.json()
    
    # Extract relevant fields
    patient_context = {
        "name": patient_data.get("name"),
        "age": patient_data.get("age"),
        # ... more fields
    }
    
    return {"patient_context": patient_context}
```

2. Add Ethereum blockchain integration for medical records
3. Implement conversation history persistence (database)
4. Add multi-language support
5. Implement user feedback mechanism

## Security Considerations

1. **API Key Protection**: Never commit `.env` file with real API keys
2. **Authentication**: Chat endpoint requires valid JWT token
3. **Rate Limiting**: Consider adding rate limits to prevent abuse
4. **Input Validation**: Agent validates user input before processing
5. **Error Handling**: Sensitive error details are not exposed to frontend

## Performance Optimization

1. **Caching**: Consider caching patient context for frequent users
2. **Connection Pooling**: Reuse Python process if possible (advanced)
3. **Async Processing**: For heavy workloads, use queue system (Bull/RabbitMQ)
4. **Response Streaming**: Implement streaming for real-time responses (advanced)

## Support
For issues or questions, contact the HealthLink development team.
