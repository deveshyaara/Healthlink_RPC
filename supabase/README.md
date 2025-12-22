# HealthLink Database Setup

This directory contains the complete database schema and setup for the HealthLink application.

## 📁 Structure

```
supabase/
├── migrations/
│   ├── 001_initial_schema.sql    # Core tables and relationships
│   └── 002_rls_policies.sql      # Row Level Security policies
├── setup.sh                      # Automated setup script
└── README.md                     # This file
```

## 🚀 Quick Setup

### Prerequisites

1. **Supabase CLI**: Install globally
   ```bash
   npm install -g supabase
   ```

2. **Supabase Project**: Create a project at [supabase.com](https://supabase.com)

3. **Environment Variables**: Copy `.env.example` to `.env.local` and fill in your values:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

### Automated Setup

Run the setup script from the project root:

```bash
chmod +x supabase/setup.sh
./supabase/setup.sh
```

This will:
- ✅ Apply all database migrations
- ✅ Set up Row Level Security policies
- ✅ Generate TypeScript types

## 📊 Database Schema

### Core Tables

- **`patients`**: Patient records with email uniqueness
- **`medical_records`**: Medical records linked to patients
- **`appointments`**: Appointment scheduling
- **`prescriptions`**: Medication prescriptions
- **`doctors`**: Doctor profiles and verification
- **`consents`**: Patient consent management
- **`user_roles`**: Role-based access control
- **`audit_logs`**: Compliance and audit trail

### Key Features

- **UUID Primary Keys**: For security and scalability
- **Email Uniqueness**: Patients identified by email, not wallet address
- **IPFS Integration**: All sensitive data stored on IPFS
- **Comprehensive RLS**: Secure access control for all operations
- **Audit Trail**: Complete logging for compliance

## 🔒 Security Model

### Row Level Security (RLS)

The database uses Supabase's RLS to ensure:

1. **Service Role Access**: Backend can bypass RLS for API operations
2. **Patient Privacy**: Patients only see their own data
3. **Doctor Access**: Doctors only access patients with consent
4. **Admin Oversight**: Admins can manage all data
5. **Audit Compliance**: All access is logged

### Access Patterns

- **Patients**: View/update own data, manage consents
- **Doctors**: Access patients with explicit consent, create records
- **Admins**: Full system access for management
- **Backend**: Service role for API operations

## 🛠 Manual Setup (Alternative)

If you prefer manual setup:

```bash
# Initialize Supabase (if not done)
supabase init

# Link to your remote project
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push

# Generate types
supabase gen types typescript --local > types/supabase.ts
```

## 🔧 Environment Variables

Required environment variables for the frontend:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Pinata IPFS
PINATA_API_KEY=your-pinata-api-key
PINATA_SECRET_API_KEY=your-pinata-secret-key

# Other configs...
```

## 📝 Migration Guidelines

When adding new features:

1. **Create Migration**: Add SQL file in `migrations/` with timestamp prefix
2. **Test Locally**: Run `supabase db reset` to test migrations
3. **Update Types**: Regenerate TypeScript types after schema changes
4. **Document Changes**: Update this README with new features

## 🐛 Troubleshooting

### Migration Errors
```bash
# Reset database and reapply all migrations
supabase db reset
```

### RLS Issues
```bash
# Check current policies
supabase db inspect --db-url
```

### Type Generation
```bash
# Regenerate types after schema changes
supabase gen types typescript --local > types/supabase.ts
```

## 📞 Support

For issues with database setup:
1. Check Supabase dashboard for errors
2. Verify environment variables are correct
3. Ensure service role key has proper permissions
4. Check migration files for syntax errors