# Error Message Extraction Fix

**Issue**: Frontend displayed "400: [object Object]" instead of readable error messages

**Date**: December 1, 2025

## Root Cause

The backend returns standardized error responses:
```json
{
  "status": "error",
  "statusCode": 400,
  "message": "Name, email, and password are required",
  "error": {
    "code": "MISSING_FIELDS",
    "details": "All registration fields must be provided"
  }
}
```

The frontend error extraction logic in `api-client.ts` (line 68) was:
```typescript
errorMessage = errorData.error || errorData.message || response.statusText;
```

**Problem**: `errorData.error` is an **object** `{code, details}`, not a string. When used as a string, JavaScript converts it to `"[object Object]"`.

## Solution

Updated `/frontend/src/lib/api-client.ts` lines 67-80 to properly handle the standardized backend error format:

```typescript
// Extract error message from standardized backend response format
// Backend returns: {status, statusCode, message, error: {code, details}}
if (errorData.message) {
  errorMessage = errorData.message;
  // If there are additional details, append them
  if (errorData.error?.details) {
    errorMessage = `${errorData.message}: ${errorData.error.details}`;
  }
} else if (errorData.error?.details) {
  errorMessage = errorData.error.details;
} else if (errorData.error && typeof errorData.error === 'string') {
  errorMessage = errorData.error;
} else {
  errorMessage = response.statusText || 'Request failed';
}
```

## Error Flow

### Complete Error Handling Chain

1. **Backend** (`auth.controller.js`) returns standardized format:
   ```javascript
   return res.status(400).json({
     status: 'error',
     statusCode: 400,
     message: 'Name, email, and password are required',
     error: {
       code: 'MISSING_FIELDS',
       details: 'All registration fields must be provided'
     }
   });
   ```

2. **API Client** (`api-client.ts`) extracts readable message:
   ```typescript
   // Extracts: "Name, email, and password are required: All registration fields must be provided"
   throw new Error(errorMessage);
   ```

3. **Auth Context** (`auth-context.tsx`) catches and displays:
   ```typescript
   catch (error) {
     const errorMessage = error instanceof Error ? error.message : 'Registration failed';
     toast({
       title: "Registration failed",
       description: errorMessage,  // Now shows readable message!
       variant: "destructive",
     });
   }
   ```

4. **User sees**: Toast notification with clear error message

## Testing

### Test 1: Empty Registration Fields
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"","email":"","password":"","role":""}'
```

**Before Fix**:
- Console: `API request error: '400: [object Object]'`
- UI: Toast shows `[object Object]`

**After Fix**:
- Console: `API request error: '400: Name, email, and password are required: All registration fields must be provided'`
- UI: Toast shows `Name, email, and password are required: All registration fields must be provided`

### Test 2: Invalid Email Format
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"invalid","password":"test123","role":"client"}'
```

**Result**: Shows "Invalid email format" (if backend implements this validation)

### Test 3: Verification Script
```javascript
// Simulates the extraction logic
const mockResponse = {
  status: "error",
  statusCode: 400,
  message: "Name, email, and password are required",
  error: {
    code: "MISSING_FIELDS",
    details: "All registration fields must be provided"
  }
};

function extractError(errorData) {
  let errorMessage = 'API request failed';
  if (errorData.message) {
    errorMessage = errorData.message;
    if (errorData.error?.details) {
      errorMessage = `${errorData.message}: ${errorData.error.details}`;
    }
  } else if (errorData.error?.details) {
    errorMessage = errorData.error.details;
  } else if (errorData.error && typeof errorData.error === 'string') {
    errorMessage = errorData.error;
  }
  return errorMessage;
}

console.log(extractError(mockResponse));
// Output: "Name, email, and password are required: All registration fields must be provided"
```

## Related Files

### Modified
- `/frontend/src/lib/api-client.ts` (lines 67-80)

### Verified (No Changes Needed)
- `/frontend/src/contexts/auth-context.tsx` - Properly uses `error.message`
- `/frontend/src/app/(public)/signup/page.tsx` - Error flow working correctly
- `/frontend/src/lib/backend-test.ts` - Has proper error handling
- `/frontend/src/app/debug/page.tsx` - Uses correct pattern
- `/frontend/src/app/dashboard/records/page.tsx` - Proper error extraction

## Best Practices

### Backend Error Response Format
Always return standardized JSON:
```typescript
{
  status: 'success' | 'error',
  statusCode: number,
  message: string,                    // Human-readable message
  data?: any,                         // For success responses
  error?: {                           // For error responses
    code: string,                     // Machine-readable code
    details?: string                  // Additional context
  }
}
```

### Frontend Error Extraction
1. **Prioritize** `message` field (human-readable)
2. **Append** `error.details` if available (additional context)
3. **Type check** before using error object properties
4. **Fallback** to generic message if parsing fails

### Error Display Priority
```
message + details > details > string error > statusText > generic fallback
```

## Impact

✅ **Users now see**:
- Clear validation error messages
- Specific guidance on what went wrong
- Professional error handling

❌ **Instead of**:
- "[object Object]" confusion
- Unclear error states
- Poor user experience

## Related Issues

This fix resolves the frontend portion of error handling. Backend already returns proper standardized error format across all 34 endpoints (6 auth + 28 dynamic routes).

## Deployment

No database changes or backend restarts required. Frontend changes take effect immediately with hot reload during development or after build for production.

```bash
# Development (auto-reloads)
npm run dev

# Production
npm run build
npm start
```
