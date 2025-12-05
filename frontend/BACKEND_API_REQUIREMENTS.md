# Backend API Requirements Report - HealthLink Pro

## Overview
This report details the missing backend APIs required to implement complete authentication, user management, and role-based access control features in the HealthLink Pro healthcare platform.

## Current Backend API Status
✅ **Implemented APIs:**
- `/auth/register` - User registration
- `/auth/login` - User authentication
- `/auth/logout` - User logout
- `/auth/me` - Get current user info
- `/auth/refresh` - Token refresh

❌ **Missing APIs (Critical for Production):**

## 1. User Management APIs (Admin Only)

### GET /api/admin/users
**Purpose:** Retrieve all users for admin management
**Method:** GET
**Authentication:** Required (Admin role only)
**Response:**
```json
{
  "users": [
    {
      "id": "string",
      "name": "string",
      "email": "string",
      "role": "patient|doctor|admin",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "lastLogin": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

### POST /api/admin/users
**Purpose:** Create new user (admin functionality)
**Method:** POST
**Authentication:** Required (Admin role only)
**Request Body:**
```json
{
  "name": "string",
  "email": "string",
  "password": "string",
  "role": "patient|doctor|admin"
}
```

### PUT /api/admin/users/{userId}
**Purpose:** Update user information
**Method:** PUT
**Authentication:** Required (Admin role only)
**Request Body:**
```json
{
  "name": "string",
  "email": "string",
  "role": "patient|doctor|admin",
  "isActive": true
}
```

### DELETE /api/admin/users/{userId}
**Purpose:** Deactivate/delete user
**Method:** DELETE
**Authentication:** Required (Admin role only)

## 2. User Profile Management APIs

### GET /api/users/profile
**Purpose:** Get current user's profile
**Method:** GET
**Authentication:** Required
**Response:**
```json
{
  "id": "string",
  "name": "string",
  "email": "string",
  "role": "patient|doctor|admin",
  "avatar": "string",
  "phone": "string",
  "dateOfBirth": "1990-01-01",
  "address": {
    "street": "string",
    "city": "string",
    "state": "string",
    "zipCode": "string"
  },
  "emergencyContact": {
    "name": "string",
    "phone": "string",
    "relationship": "string"
  }
}
```

### PUT /api/users/profile
**Purpose:** Update user profile
**Method:** PUT
**Authentication:** Required
**Request Body:**
```json
{
  "name": "string",
  "phone": "string",
  "dateOfBirth": "1990-01-01",
  "address": {
    "street": "string",
    "city": "string",
    "state": "string",
    "zipCode": "string"
  },
  "emergencyContact": {
    "name": "string",
    "phone": "string",
    "relationship": "string"
  }
}
```

### PUT /api/users/change-password
**Purpose:** Change user password
**Method:** PUT
**Authentication:** Required
**Request Body:**
```json
{
  "currentPassword": "string",
  "newPassword": "string"
}
```

## 3. Password Reset APIs

### POST /api/auth/forgot-password
**Purpose:** Initiate password reset
**Method:** POST
**Authentication:** None
**Request Body:**
```json
{
  "email": "string"
}
```

### POST /api/auth/reset-password
**Purpose:** Reset password with token
**Method:** POST
**Authentication:** None
**Request Body:**
```json
{
  "token": "string",
  "newPassword": "string"
}
```

## 4. Role-Based Access Control APIs

### GET /api/admin/roles
**Purpose:** Get all available roles and permissions
**Method:** GET
**Authentication:** Required (Admin role only)
**Response:**
```json
{
  "roles": [
    {
      "name": "admin",
      "displayName": "Administrator",
      "permissions": ["user.manage", "system.admin", "audit.view"]
    },
    {
      "name": "doctor",
      "displayName": "Healthcare Professional",
      "permissions": ["patient.records.read", "patient.records.write", "prescription.write"]
    },
    {
      "name": "patient",
      "displayName": "Patient",
      "permissions": ["own.records.read", "consent.manage"]
    }
  ]
}
```

### PUT /api/admin/users/{userId}/role
**Purpose:** Change user role
**Method:** PUT
**Authentication:** Required (Admin role only)
**Request Body:**
```json
{
  "role": "patient|doctor|admin"
}
```

## 5. Enhanced Authentication APIs

### POST /api/auth/verify-email
**Purpose:** Verify user email
**Method:** POST
**Authentication:** None
**Request Body:**
```json
{
  "token": "string"
}
```

### POST /api/auth/resend-verification
**Purpose:** Resend email verification
**Method:** POST
**Authentication:** Required
**Request Body:**
```json
{
  "email": "string"
}
```

## 6. Session Management APIs

### GET /api/auth/sessions
**Purpose:** Get active sessions for current user
**Method:** GET
**Authentication:** Required
**Response:**
```json
{
  "sessions": [
    {
      "id": "string",
      "device": "Chrome on Windows",
      "ip": "192.168.1.1",
      "lastActivity": "2024-01-01T00:00:00Z",
      "current": true
    }
  ]
}
```

### DELETE /api/auth/sessions/{sessionId}
**Purpose:** Terminate specific session
**Method:** DELETE
**Authentication:** Required

## Database Schema Requirements

### Users Table Enhancement
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS (
  phone VARCHAR(20),
  date_of_birth DATE,
  address JSONB,
  emergency_contact JSONB,
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  email_verification_token VARCHAR(255),
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMP,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Roles and Permissions Tables
```sql
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INTEGER REFERENCES roles(id),
  permission_id INTEGER REFERENCES permissions(id),
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  session_token VARCHAR(255) UNIQUE NOT NULL,
  device_info JSONB,
  ip_address INET,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Security Considerations

1. **Rate Limiting:** Implement rate limiting on authentication endpoints
2. **Password Policies:** Enforce strong password requirements
3. **Session Management:** Implement proper session timeout and cleanup
4. **Audit Logging:** Log all user management actions
5. **Input Validation:** Validate all user inputs thoroughly
6. **CSRF Protection:** Implement CSRF tokens for state-changing operations

## Implementation Priority

### High Priority (Required for MVP)
1. User profile management APIs
2. Password change functionality
3. Basic user management for admins

### Medium Priority (Enhanced UX)
1. Password reset flow
2. Email verification
3. Session management

### Low Priority (Advanced Features)
1. Role-based permissions system
2. Advanced user analytics
3. Bulk user operations

## Testing Requirements

1. **Unit Tests:** Test all API endpoints with various scenarios
2. **Integration Tests:** Test complete user workflows
3. **Security Tests:** Test authentication bypass attempts
4. **Performance Tests:** Test concurrent user management operations

## Next Steps

1. Implement the high-priority APIs first
2. Update the frontend API client with new endpoints
3. Add proper error handling and validation
4. Implement comprehensive testing
5. Add API documentation (Swagger/OpenAPI)

---

**Report Generated:** November 18, 2025
**Frontend Developer:** AI Assistant
**Platform:** HealthLink Pro - Digital Health Exchange