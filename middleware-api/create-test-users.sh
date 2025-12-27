# HealthLink - Test User Creation Script

# Purpose: Create test users for all Phase 1 roles
# Run AFTER applying critical_fixes.sql

# Prerequisites:
# 1. Server running on http://localhost:4000
# 2. Critical fixes applied
# 3. curl installed

BASE_URL="http://localhost:4000/api"

echo "🧪 Creating Phase 1 Test Users..."
echo ""

# ============================================================================
# 1. Create Admin User
# ============================================================================
echo "📝 Creating Admin User..."
curl -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@healthlink.com",
    "password": "Admin123!@#",
    "fullName": "System Administrator",
    "role": "admin"
  }' | jq .

echo ""
echo "✅ Admin created: admin@healthlink.com / Admin123!@#"
echo ""

# ============================================================================
# 2. Create Pharmacist User
# ============================================================================
echo "📝 Creating Pharmacist User..."
curl -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "pharmacist@healthlink.com",
    "password": "Pharma123!@#",
    "fullName": "John Pharmacist",
    "role": "pharmacist"
  }' | jq .

echo ""
echo "✅ Pharmacist created: pharmacist@healthlink.com / Pharma123!@#"
echo ""

# ============================================================================
# 3. Create Hospital Admin User
# ============================================================================
echo "📝 Creating Hospital Admin User..."
curl -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "hospital.admin@healthlink.com",
    "password": "Hospital123!@#",
    "fullName": "Sarah Hospital Admin",
    "role": "hospital_admin"
  }' | jq .

echo ""
echo "✅ Hospital Admin created: hospital.admin@healthlink.com / Hospital123!@#"
echo ""

# ============================================================================
# 4. Create Insurance User
# ============================================================================
echo "📝 Creating Insurance User..."
curl -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "insurance@healthlink.com",
    "password": "Insurance123!@#",
    "fullName": "Mike Insurance Agent",
    "role": "insurance"
  }' | jq .

echo ""
echo "✅ Insurance user created: insurance@healthlink.com / Insurance123!@#"
echo ""

# ============================================================================
# 5. Create Doctor User
# ============================================================================
echo "📝 Creating Doctor User..."
curl -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor@healthlink.com",
    "password": "Doctor123!@#",
    "fullName": "Dr. Emily Watson",
    "role": "doctor"
  }' | jq .

echo ""
echo "✅ Doctor created: doctor@healthlink.com / Doctor123!@#"
echo ""

# ============================================================================
# 6. Create Patient User
# ============================================================================
echo "📝 Creating Patient User..."
curl -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@healthlink.com",
    "password": "Patient123!@#",
    "fullName": "Alex Patient",
    "role": "patient"
  }' | jq .

echo ""
echo "✅ Patient created: patient@healthlink.com / Patient123!@#"
echo ""

# ============================================================================
# Summary
# ============================================================================
echo "================================================================"
echo "✅ Test Users Created Successfully!"
echo "================================================================"
echo ""
echo "Login Credentials:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "👑 Admin:          admin@healthlink.com          / Admin123!@#"
echo "💊 Pharmacist:     pharmacist@healthlink.com     / Pharma123!@#"
echo "🏥 Hospital Admin: hospital.admin@healthlink.com / Hospital123!@#"
echo "🛡️  Insurance:      insurance@healthlink.com      / Insurance123!@#"
echo "👨‍⚕️  Doctor:         doctor@healthlink.com         / Doctor123!@#"
echo "🧑 Patient:        patient@healthlink.com        / Patient123!@#"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Frontend URLs:"
echo "  • Login: http://localhost:9002/signin"
echo "  • Pharmacy: http://localhost:9002/dashboard/pharmacy"
echo "  • Hospital: http://localhost:9002/dashboard/hospital"
echo "  • Insurance: http://localhost:9002/dashboard/insurance"
echo ""
echo "================================================================"
