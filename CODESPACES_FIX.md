# GitHub Codespaces Port Configuration Fix

## Problem
You're getting "Failed to fetch" error because the frontend (running in your browser) can't connect to `localhost:3000` - that's the Codespace's localhost, not your browser's localhost.

## Solution: Make Ports Public in Codespaces

### Step 1: Open Ports Tab
1. In VS Code, look at the bottom panel
2. Click on the **"PORTS"** tab (next to Terminal, Problems, Output, etc.)
3. You should see ports 3000 and 9002 listed

### Step 2: Make Ports Public
For **each** of these ports (3000, 4001, 9002):

1. Right-click on the port number
2. Select **"Port Visibility"** → **"Public"**
3. Confirm the change

Your ports should look like this:
```
Port    | Forwarded Address                                        | Visibility
--------|------------------------------------------------------|----------
3000    | https://super-computing-machine-x5rr6vgqvgwrc6r5r-3000.app.github.dev | Public
4001    | https://super-computing-machine-x5rr6vgqvgwrc6r5r-4001.app.github.dev | Public
9002    | https://super-computing-machine-x5rr6vgqvgwrc6r5r-9002.app.github.dev | Public
```

### Step 3: Access Your Application

After making ports public, access your app using the **Codespace URL** (not localhost):

**Frontend URL:**
```
https://super-computing-machine-x5rr6vgqvgwrc6r5r-9002.app.github.dev
```

**To find your URL:**
1. Go to the PORTS tab
2. Look for port 9002
3. Hover over the "Forwarded Address" column
4. Click the 🌐 globe icon or copy the URL

## What We Fixed

### 1. Auto-Detection of Codespace Environment
Updated `/frontend/src/lib/env-utils.ts` to automatically detect when running in Codespaces and construct the correct API URL:

```typescript
// Automatically detects if hostname is *.app.github.dev
// and constructs: https://CODESPACE_NAME-3000.app.github.dev
```

### 2. CORS Configuration
Updated `/middleware-api/src/config/index.js` to allow all GitHub Codespace domains:

```javascript
// Now accepts: https://*.app.github.dev
```

### 3. Environment Configuration
Updated `/frontend/.env.local` with instructions for manual configuration if needed.

## Testing

### Quick Test:
```bash
./test_integration.sh
```

### Manual Test:
1. Open the forwarded URL for port 9002 in your browser
2. Go to `/signup` page
3. Try creating an account
4. Open Browser Console (F12) - you should see:
   ```
   [API Client] Making request to: https://YOUR-CODESPACE-3000.app.github.dev/api/auth/register
   ```

## Troubleshooting

### If still getting "Failed to fetch":

1. **Check Ports are Public**
   - Go to PORTS tab
   - Verify "Visibility" column shows "Public" for ports 3000, 4001, 9002
   - If it says "Private", right-click → Port Visibility → Public

2. **Verify Backend is Accessible**
   Test from your local browser:
   ```
   https://YOUR-CODESPACE-NAME-3000.app.github.dev/health
   ```
   Should return: `{"status":"UP",...}`

3. **Check Browser Console**
   - Open DevTools (F12)
   - Console tab
   - Look for the URL being called by `[API Client]`
   - It should be `https://...app.github.dev`, not `http://localhost`

4. **Clear Browser Cache**
   - Press Ctrl+Shift+Delete (Windows/Linux) or Cmd+Shift+Delete (Mac)
   - Clear cached images and files
   - Reload the page

### If ports are not showing:

Run this to restart with proper port forwarding:
```bash
cd /workspaces/Healthlink_RPC
./start.sh
```

Then manually make ports public in the PORTS tab.

## Alternative: Manual URL Configuration

If auto-detection doesn't work, you can manually set the URL:

1. Edit `/frontend/.env.local`:
   ```bash
   nano /workspaces/Healthlink_RPC/frontend/.env.local
   ```

2. Update with your Codespace name:
   ```env
   NEXT_PUBLIC_API_URL=https://YOUR-CODESPACE-NAME-3000.app.github.dev
   NEXT_PUBLIC_WS_URL=wss://YOUR-CODESPACE-NAME-4001.app.github.dev
   ```

3. Restart frontend:
   ```bash
   pkill -f "next dev"
   cd /workspaces/Healthlink_RPC/frontend
   npm run dev
   ```

## Important Notes

- ⚠️ **Never use `localhost` URLs when accessing from browser in Codespaces**
- ✅ **Always use the forwarded `*.app.github.dev` URLs**
- 🔒 **Ports must be "Public" for the frontend to access the backend**
- 🔄 **After changing port visibility, refresh your browser**

## Quick Commands

**Restart everything:**
```bash
cd /workspaces/Healthlink_RPC
./start.sh
```

**Check services:**
```bash
curl http://localhost:3000/health
curl http://localhost:9002
```

**View logs:**
```bash
tail -f /tmp/middleware.log
tail -f /tmp/frontend.log
```
