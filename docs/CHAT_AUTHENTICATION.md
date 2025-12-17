# Chat Authentication Implementation

## Overview
The HealthLink AI chatbot is now secured with JWT authentication, ensuring only logged-in users can access the chat feature.

## Security Measures Implemented

### 1. Backend Authentication (Already Existed)
- **Route Protection**: The `POST /api/chat` route uses `authenticateJWT` middleware
- **Token Validation**: Bearer tokens are validated in `auth.middleware.js`
- **User Context**: Authenticated user information is available via `req.user`

### 2. Frontend Authentication (Enhanced)

#### Conditional Rendering
- **Chat widget only visible to authenticated users**
- Unauthenticated users won't see the chat button at all
- Location: `ChatWidget.tsx` lines 138-150

```tsx
if (!isOpen) {
  // Only show chat button for authenticated users
  if (!isAuthenticated) {
    return null;
  }
  return <button>...</button>;
}
```

#### 401 Error Handling
- **Token expiration detection**: Catches 401 responses from the backend
- **User-friendly messages**: Shows clear error when session expires
- **Graceful degradation**: Doesn't crash, shows helpful message
- Location: `ChatWidget.tsx` lines 77-87

```tsx
if (response.status === 401) {
  toast.error('Your session has expired. Please log in again.');
  // Show message in chat
  return;
}
```

#### Authentication Headers
- **Bearer token**: Automatically sent with every request
- **Authorization header**: `Authorization: Bearer ${token}`
- Location: `ChatWidget.tsx` lines 67-72

### 3. User Personalization

#### Backend Updates
- **User name extraction**: Gets name from `req.user.name`
- **Pass to Python agent**: Includes user name in spawn arguments
- Location: `chat.controller.js` lines 22-30

```javascript
const userId = req.user?.userId || 'anonymous';
const userName = req.user?.name || 'User';

const args = [
  pythonScriptPath,
  userId.toString(),
  userName,  // NEW: Pass user name
  message,
];
```

#### Python Agent Updates
- **Accepts user name**: Updated `run_agent.py` to accept 4 arguments
- **Personalized responses**: AI addresses user by name
- **Context preservation**: User name passed to agent graph
- Location: `run_agent.py`, `agent_graph.py`

```python
# run_agent.py
user_id = sys.argv[1]
user_name = sys.argv[2]  # NEW
message = sys.argv[3]
thread_id = sys.argv[4] if len(sys.argv) > 4 else None

# agent_graph.py
initial_state = {
    "messages": [HumanMessage(content=message)],
    "user_id": user_id,
    "patient_context": {"name": user_name},  # NEW
    "response": ""
}
```

## Authentication Flow

### Successful Flow
1. User logs in → receives JWT token
2. Token stored in auth context
3. Chat widget becomes visible
4. User clicks chat → opens widget
5. User sends message → includes `Authorization: Bearer <token>`
6. Backend validates token → extracts user info
7. Python agent receives user name → personalizes response
8. Response returned to user

### Expired Token Flow
1. User's token expires
2. User tries to send message
3. Backend returns 401 Unauthorized
4. Frontend catches 401 error
5. Shows "Your session has expired" message
6. User can log in again to continue

### Unauthenticated User Flow
1. User not logged in
2. Chat widget not visible
3. User cannot access chat feature
4. Must log in to see chat

## Security Benefits

1. **Access Control**: Only authenticated users can chat
2. **Token Validation**: Every request validated on backend
3. **Session Management**: Expired tokens handled gracefully
4. **User Context**: AI knows who it's talking to (via userId and userName)
5. **Error Handling**: Clear feedback when authentication fails

## Testing Checklist

- [ ] Logged out user: Chat widget not visible
- [ ] Logged in user: Chat widget visible and functional
- [ ] Token expiration: Shows "session expired" message
- [ ] User name: AI uses correct name in responses
- [ ] 401 handling: Doesn't crash, shows user-friendly error
- [ ] Multiple users: Each gets personalized responses

## Configuration Requirements

### Environment Variables
No new environment variables required. Uses existing:
- `JWT_SECRET`: For token validation
- `NEXT_PUBLIC_API_URL`: For API endpoint

### Backend Requirements
- Middleware: `authenticateJWT` (already implemented)
- User object: `req.user` must have `userId` and `name`

### Frontend Requirements
- Auth context: `useAuth()` hook providing `user`, `token`, `isAuthenticated`
- Toast notifications: `useToast()` for error messages

## Future Enhancements

1. **Role-Based Access**: Different chat capabilities for patients vs doctors
2. **Real Patient Data**: Fetch actual medical history from blockchain
3. **Conversation History**: Store and retrieve past chat threads
4. **Rate Limiting**: Prevent API abuse by authenticated users
5. **Audit Logging**: Track who accessed chat and when

## API Documentation

### POST /api/chat

**Authentication**: Required (JWT Bearer token)

**Headers**:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "message": "What are the symptoms of diabetes?",
  "thread_id": "thread-user123" // optional
}
```

**Success Response** (200):
```json
{
  "status": "success",
  "data": {
    "response": "Hello John! Here are the common symptoms...",
    "thread_id": "thread-user123",
    "user_id": "user123"
  }
}
```

**Error Responses**:
- **401 Unauthorized**: Token missing or invalid
  ```json
  {
    "status": "error",
    "message": "Authentication required",
    "error": {
      "code": "AUTH_TOKEN_MISSING"
    }
  }
  ```

- **400 Bad Request**: Message missing
  ```json
  {
    "status": "error",
    "message": "Message is required",
    "error": {
      "code": "MISSING_MESSAGE"
    }
  }
  ```

- **504 Gateway Timeout**: AI agent timeout
  ```json
  {
    "status": "error",
    "message": "Agent response timeout",
    "error": {
      "code": "TIMEOUT"
    }
  }
  ```

## Files Modified

1. **Frontend**:
   - `frontend/src/components/ChatWidget.tsx`
     - Added conditional rendering based on `isAuthenticated`
     - Added 401 error handling
     - Improved error messages

2. **Backend**:
   - `middleware-api/src/controllers/chat.controller.js`
     - Extract user name from `req.user`
     - Pass user name to Python agent

3. **Python Agent**:
   - `middleware-api/python_agent/run_agent.py`
     - Accept user_name as command-line argument
     - Pass to agent_graph

   - `middleware-api/python_agent/agent_graph.py`
     - Updated `invoke_agent()` to accept user_name
     - Pre-populate patient_context with user name
     - Preserve user name in context fetcher

## Commit Information

- **Commit**: dd74135
- **Branch**: main
- **Date**: 2024-01-XX
- **Message**: "feat: Add authentication enforcement and personalization to chat"
- **Files Changed**: 4 files, 35 insertions, 11 deletions

## Support

If you encounter authentication issues:
1. Check JWT_SECRET is configured correctly
2. Verify token is being sent in Authorization header
3. Check browser console for 401 errors
4. Ensure user object has `userId` and `name` properties
5. Check backend logs for authentication failures
