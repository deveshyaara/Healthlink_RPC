# 🚨 Production Chat Not Working - Fix Guide

## Problem Identified

The chatbot cannot send messages in production deployment because **Python dependencies are not installed on Render**.

## Root Cause

Render was only running `npm install` but NOT installing Python dependencies required for the AI agent (LangGraph, Google Gemini, etc.).

## ✅ Solution

### Step 1: Update Render Build Command

Go to your Render dashboard and update the **Build Command**:

```bash
npm install && python3 -m pip install --upgrade pip && python3 -m pip install -r python_agent/requirements.txt
```

#### Via Render Dashboard:
1. Go to https://dashboard.render.com
2. Select your `healthlink-middleware-api` service
3. Go to **Settings** tab
4. Find **Build Command** field
5. Replace with the command above
6. Click **Save Changes**
7. **Manually deploy** from the dashboard

#### Via render.yaml (Recommended):
1. The `render.yaml` file has been created in `middleware-api/render.yaml`
2. Commit and push to GitHub:
   ```bash
   git add middleware-api/render.yaml
   git commit -m "feat: Add Render deployment configuration with Python support"
   git push origin main
   ```
3. Render will automatically detect and use this configuration

### Step 2: Verify Python Installation on Render

After deployment, check the build logs:
- Look for: `Successfully installed langgraph langchain-core langchain-google-genai`
- Python version should be 3.11+

### Step 3: Verify Environment Variables

Make sure these are set in Render dashboard:

#### Critical for Chat:
```bash
GEMINI_API_KEY=AIzaSyDWCu4AJb6BhuLctd_7ne4HIBDbgRBui_g
GEMINI_MODEL=gemini-2.5-flash
LLM_TEMPERATURE=0.2
```

#### Test it:
```bash
curl https://healthlink-rpc.onrender.com/api/chat/health
```

Expected response:
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Chat agent is healthy",
  "data": {
    "python_version": "Python 3.11.2",
    "gemini_configured": true
  }
}
```

## Why This Happened

1. **Render's Node runtime** doesn't automatically install Python packages
2. The build command only ran `npm install`
3. When a user sends a chat message, the backend tries to spawn Python process
4. Python dependencies are missing → chat fails

## Testing After Fix

### 1. Check Backend Health
```bash
curl https://healthlink-rpc.onrender.com/api/chat/health
```
Should return `"gemini_configured": true`

### 2. Test Frontend Connection
1. Go to https://healthlink-rpc.vercel.app
2. Log in to your account
3. Chat widget should appear in bottom-right
4. Send a test message
5. Should receive AI response

### 3. Check for Errors

#### Frontend (Browser Console):
- Press F12 → Console tab
- Look for any red errors when sending messages
- Should see successful POST to `/api/chat`

#### Backend (Render Logs):
- Go to Render dashboard → Logs tab
- Send a chat message
- Look for Python process spawn
- Should NOT see "Module not found" or "No module named langgraph"

## Common Issues After Fix

### Issue: Still getting timeout errors
**Cause**: Python dependencies installed but Gemini API key missing
**Fix**: Set `GEMINI_API_KEY` in Render dashboard

### Issue: "Module not found: langgraph"
**Cause**: Build command didn't run Python pip install
**Fix**: 
1. Check Build Command includes pip install
2. Manually trigger redeploy
3. Check build logs for Python installation

### Issue: Chat works locally but not in production
**Cause**: Environment variable mismatch
**Fix**: Compare `.env.production` with Render environment variables

### Issue: 401 Unauthorized
**Cause**: User not logged in
**Fix**: This is expected - log in first before using chat

## Verification Checklist

- [ ] `render.yaml` created and pushed to GitHub
- [ ] Render build command updated (either via dashboard or yaml)
- [ ] Manually triggered redeploy on Render
- [ ] Build logs show Python packages installed successfully
- [ ] `/api/chat/health` returns `gemini_configured: true`
- [ ] Environment variables set in Render dashboard
- [ ] Frontend deployed on Vercel with correct `NEXT_PUBLIC_API_URL`
- [ ] CORS configured to allow Vercel domain
- [ ] Tested chat with logged-in user
- [ ] AI responds to messages successfully

## Files Modified

- ✅ Created: `middleware-api/render.yaml`
- ✅ Already exists: `middleware-api/python_agent/requirements.txt`
- ✅ Already configured: Frontend `vercel.json` with correct API URL
- ✅ Already configured: Backend CORS for Vercel domain

## Next Steps

1. **Commit render.yaml**:
   ```bash
   cd C:\Users\deves\Desktop\HealthLink\Healthlink_RPC
   git add middleware-api/render.yaml
   git commit -m "feat: Add Render config with Python dependencies"
   git push origin main
   ```

2. **Wait for Render Auto-Deploy** (or manually trigger)

3. **Test the chat**:
   - Go to https://healthlink-rpc.vercel.app
   - Log in
   - Send a message
   - Should work! 🎉

## Monitoring

### Check Backend Status
```bash
curl https://healthlink-rpc.onrender.com/health
```

### Check Chat Agent Health
```bash
curl https://healthlink-rpc.onrender.com/api/chat/health
```

### View Render Logs
1. Go to Render dashboard
2. Select service
3. Click "Logs" tab
4. Watch for Python process spawns when messages are sent

---

**Issue**: Chat not working in production
**Cause**: Python dependencies not installed on Render
**Fix**: Update build command to install Python packages
**Status**: render.yaml created ✅ Ready to deploy
