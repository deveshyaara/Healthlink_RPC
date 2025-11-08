#!/bin/bash

# HealthLink Pro - API Test Script
# Tests all 54 API endpoints

set -e

echo "════════════════════════════════════════════════════════════"
echo "  🧪 HealthLink Pro - Complete API Test Suite"
echo "  Testing 54 REST API Endpoints"
echo "════════════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Counters
TOTAL=0
PASSED=0
FAILED=0

# Base URL
API_URL="http://localhost:4000"

# Generate timestamp for unique IDs
TIMESTAMP=$(date +%s)

# Test function
test_api() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local expected="$5"
    
    TOTAL=$((TOTAL + 1))
    echo -n "  [$TOTAL] $name... "
    
    if [ "$method" = "GET" ]; then
        RESPONSE=$(curl -s -X GET "$API_URL$endpoint")
    else
        RESPONSE=$(curl -s -X "$method" "$API_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi
    
    if echo "$RESPONSE" | grep -q "$expected"; then
        echo -e "${GREEN}PASS${NC}"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${RED}FAIL${NC}"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

# Check if server is running
echo "🔍 Checking API server..."
if ! curl -s http://localhost:4000 > /dev/null 2>&1; then
    echo -e "${RED}❌ API server is not running!${NC}"
    echo "Please run ./start.sh first"
    exit 1
fi
echo -e "${GREEN}✅ Server is running${NC}"
echo ""

# ============================================================
# PHASE 1: MEDICAL RECORDS API (10 tests)
# ============================================================
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  MEDICAL RECORDS API (10 tests)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

# Test 1: Create Medical Record
test_api "CreateMedicalRecord" "POST" "/api/medical-records" \
    "{\"recordId\":\"MR${TIMESTAMP}\",\"patientId\":\"P${TIMESTAMP}\",\"doctorId\":\"D${TIMESTAMP}\",\"recordType\":\"consultation\",\"ipfsHash\":\"QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG\",\"description\":\"Test record\",\"isConfidential\":false,\"tags\":[\"test\"]}" \
    "success"

# Save the record ID for later tests
RECORD_ID="MR${TIMESTAMP}"
PATIENT_ID="P${TIMESTAMP}"
DOCTOR_ID="D${TIMESTAMP}"

# Test 2: Get Medical Record
test_api "GetMedicalRecord" "GET" "/api/medical-records/${RECORD_ID}" "recordId"

# Test 3: Update Medical Record
test_api "UpdateMedicalRecord" "PATCH" "/api/medical-records/${RECORD_ID}" \
    "{\"patientId\":\"${PATIENT_ID}\",\"ipfsHash\":\"QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG\",\"description\":\"Updated description\"}" \
    "success"

# Test 4: Get Records by Patient
test_api "GetRecordsByPatient" "GET" "/api/patient/${PATIENT_ID}/records" "recordId"

# Test 5: Get Records by Doctor
test_api "GetRecordsByDoctor" "GET" "/api/doctor/${DOCTOR_ID}/records" "recordId"

# Test 6: Share Record
test_api "ShareRecord" "POST" "/api/medical-records/${RECORD_ID}/share" \
    "{\"recipientId\":\"DOC123\",\"reason\":\"consultation\"}" \
    "success"

# Test 7: Access Record (logs access)
test_api "AccessRecord" "POST" "/api/medical-records/${RECORD_ID}/access" \
    "{\"accessorId\":\"${PATIENT_ID}\",\"reason\":\"review\"}" \
    "accessLog"

# Test 8: Get Access History
test_api "GetAccessHistory" "GET" "/api/medical-records/${RECORD_ID}/access-history" "accessLog"

# Test 9: Revoke Access
test_api "RevokeAccess" "POST" "/api/medical-records/${RECORD_ID}/revoke" \
    "{\"recipientId\":\"DOC123\"}" \
    "success"

# Test 10: Delete Record (soft delete)
test_api "DeleteRecord" "DELETE" "/api/medical-records/${RECORD_ID}" "success"

echo ""

# ============================================================
# PHASE 2: DOCTOR CREDENTIALS API (11 tests)
# ============================================================
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  DOCTOR CREDENTIALS API (11 tests)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

# Test 11: Register Doctor
test_api "RegisterDoctor" "POST" "/api/doctors" \
    "{\"doctorId\":\"DR${TIMESTAMP}\",\"name\":\"Dr. Test\",\"specialization\":\"Cardiology\",\"licenseNumber\":\"LIC${TIMESTAMP}\",\"hospital\":\"Test Hospital\",\"email\":\"test@example.com\",\"phone\":\"1234567890\"}" \
    "success"

DR_ID="DR${TIMESTAMP}"

# Test 12: Get Doctor
test_api "GetDoctor" "GET" "/api/doctors/${DR_ID}" "doctorId"

# Test 13: Verify Doctor
test_api "VerifyDoctor" "POST" "/api/doctors/${DR_ID}/verify" \
    "{\"isVerified\":true,\"verifiedBy\":\"ADMIN001\"}" \
    "success"

# Test 14: Get Verified Doctors
test_api "GetVerifiedDoctors" "GET" "/api/doctors/verified" "doctorId"

# Test 15: Add Doctor Review
test_api "AddDoctorReview" "POST" "/api/doctors/${DR_ID}/reviews" \
    "{\"patientId\":\"${PATIENT_ID}\",\"rating\":5,\"comment\":\"Excellent doctor\"}" \
    "success"

# Test 16: Get Doctor Reviews
test_api "GetDoctorReviews" "GET" "/api/doctors/${DR_ID}/reviews" "rating"

# Test 17: Update Doctor Profile
test_api "UpdateDoctorProfile" "PUT" "/api/doctors/${DR_ID}/profile" \
    "{\"phone\":\"9876543210\",\"email\":\"updated@example.com\"}" \
    "success"

# Test 18: Get Doctors by Specialization
test_api "GetDoctorsBySpecialization" "GET" "/api/doctors/specialization/Cardiology" \
    "specialization"

# Test 19: Get Doctors by Hospital
test_api "GetDoctorsByHospital" "GET" "/api/doctors/hospital/Test%20Hospital" "hospital"

# Test 20: Search Doctors
test_api "SearchDoctors" "POST" "/api/doctors/search" \
    "{\"specialization\":\"Cardiology\",\"hospital\":\"Test Hospital\"}" \
    "doctorId"

# Test 21: Suspend Doctor
test_api "SuspendDoctor" "POST" "/api/doctors/${DR_ID}/suspend" \
    "{\"reason\":\"Test suspension\",\"suspendedBy\":\"ADMIN001\"}" \
    "success"

echo ""

# ============================================================
# PHASE 3: CONSENT MANAGEMENT API (6 tests)
# ============================================================
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  CONSENT MANAGEMENT API (6 tests)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

# Test 22: Create Consent
test_api "CreateConsent" "POST" "/api/consents" \
    "{\"consentId\":\"CON${TIMESTAMP}\",\"patientId\":\"${PATIENT_ID}\",\"providerId\":\"${DR_ID}\",\"purpose\":\"treatment\",\"scope\":[\"medical_records\"],\"expiryDate\":\"2026-12-31\"}" \
    "success"

CONSENT_ID="CON${TIMESTAMP}"

# Test 23: Get Consent
test_api "GetConsent" "GET" "/api/consents/${CONSENT_ID}" "consentId"

# Test 24: Get Patient Consents
test_api "GetPatientConsents" "GET" "/api/patient/${PATIENT_ID}/consents" "consentId"

# Test 25: Update Consent
test_api "UpdateConsent" "PATCH" "/api/consents/${CONSENT_ID}" \
    "{\"scope\":[\"medical_records\",\"prescriptions\"]}" \
    "success"

# Test 26: Revoke Consent
test_api "RevokeConsent" "PATCH" "/api/consents/${CONSENT_ID}/revoke" \
    "{\"reason\":\"Patient request\"}" \
    "success"

# Test 27: Verify Consent Status
test_api "VerifyConsentStatus" "GET" "/api/consents/${CONSENT_ID}" "revoked"

echo ""

# ============================================================
# PHASE 4: APPOINTMENTS API (14 tests)
# ============================================================
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  APPOINTMENTS API (14 tests)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

# Test 28: Schedule Appointment
test_api "ScheduleAppointment" "POST" "/api/appointments" \
    "{\"appointmentId\":\"APT${TIMESTAMP}\",\"patientId\":\"PAT${TIMESTAMP}\",\"doctorId\":\"DOC${TIMESTAMP}\",\"appointmentDate\":\"2025-12-01\",\"startTime\":\"10:00\",\"endTime\":\"11:00\",\"reason\":\"{\\\"purpose\\\":\\\"General checkup\\\",\\\"symptoms\\\":[\\\"routine\\\"]}\"}" \
    "success"

APT_ID="APT${TIMESTAMP}"
APT_PATIENT="PAT${TIMESTAMP}"
APT_DOCTOR="DOC${TIMESTAMP}"

# Test 29: Get Appointment
test_api "GetAppointment" "GET" "/api/appointments/${APT_ID}" "appointmentId"

# Test 30: Update Appointment Status
test_api "UpdateAppointmentStatus" "PATCH" "/api/appointments/${APT_ID}/status" \
    "{\"status\":\"confirmed\"}" \
    "success"

# Test 31: Get Patient Appointments
test_api "GetPatientAppointments" "GET" "/api/appointments/patient/${APT_PATIENT}" "appointmentId"

# Test 32: Get Doctor Appointments
test_api "GetDoctorAppointments" "GET" "/api/appointments/doctor/${APT_DOCTOR}" "appointmentId"

# Test 33: Get Appointments by Date
test_api "GetAppointmentsByDate" "GET" "/api/appointments/date/2025-12-01" "appointmentDate"

# Test 34: Get Appointments by Status
test_api "GetAppointmentsByStatus" "GET" "/api/appointments/status/confirmed" "status"

# Test 35: Reschedule Appointment
test_api "RescheduleAppointment" "PATCH" "/api/appointments/${APT_ID}/reschedule" \
    "{\"appointmentDate\":\"2025-12-02\",\"startTime\":\"14:00\",\"endTime\":\"15:00\"}" \
    "success"

# Test 36: Add Appointment Notes
test_api "AddAppointmentNotes" "POST" "/api/appointments/${APT_ID}/notes" \
    "{\"notes\":\"Patient arrived on time\"}" \
    "success"

# Test 37: Complete Appointment
test_api "CompleteAppointment" "PATCH" "/api/appointments/${APT_ID}/complete" \
    "{\"notes\":\"Appointment completed successfully\"}" \
    "success"

# Test 38: Get Appointment History
test_api "GetAppointmentHistory" "GET" "/api/appointments/${APT_ID}/history" "appointmentId"

# Test 39: Check Doctor Availability
test_api "CheckDoctorAvailability" "GET" "/api/appointments/doctor/${APT_DOCTOR}/availability?date=2025-12-03" \
    "available"

# Test 40: Cancel Appointment
test_api "CancelAppointment" "PATCH" "/api/appointments/${APT_ID}/cancel" \
    "{\"reason\":\"Patient request\"}" \
    "success"

# Test 41: Get Cancelled Appointments
test_api "GetCancelledAppointments" "GET" "/api/appointments/status/cancelled" "cancelled"

echo ""

# ============================================================
# PHASE 5: PRESCRIPTIONS API (13 tests)
# ============================================================
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  PRESCRIPTIONS API (13 tests)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

# Test 42: Create Prescription
test_api "CreatePrescription" "POST" "/api/prescriptions" \
    "{\"prescriptionId\":\"RX${TIMESTAMP}\",\"patientId\":\"${APT_PATIENT}\",\"doctorId\":\"${APT_DOCTOR}\",\"diagnosis\":\"Hypertension\",\"medications\":\"[{\\\"name\\\":\\\"Lisinopril\\\",\\\"dosage\\\":\\\"10mg\\\",\\\"frequency\\\":\\\"once daily\\\",\\\"duration\\\":\\\"30 days\\\"}]\"}" \
    "success"

RX_ID="RX${TIMESTAMP}"

# Test 43: Get Prescription
test_api "GetPrescription" "GET" "/api/prescriptions/${RX_ID}" "prescriptionId"

# Test 44: Get Patient Prescriptions
test_api "GetPatientPrescriptions" "GET" "/api/prescriptions/patient/${APT_PATIENT}" "prescriptionId"

# Test 45: Get Doctor Prescriptions
test_api "GetDoctorPrescriptions" "GET" "/api/prescriptions/doctor/${APT_DOCTOR}" "prescriptionId"

# Test 46: Verify Prescription
test_api "VerifyPrescription" "POST" "/api/prescriptions/${RX_ID}/verify" \
    "{\"pharmacyId\":\"PHM001\"}" \
    "success"

# Test 47: Dispense Prescription
test_api "DispensePrescription" "POST" "/api/prescriptions/${RX_ID}/dispense" \
    "{\"pharmacyId\":\"PHM001\",\"dispensedBy\":\"PHARM001\"}" \
    "success"

# Test 48: Get Prescription Status
test_api "GetPrescriptionStatus" "GET" "/api/prescriptions/${RX_ID}/status" "status"

# Test 49: Add Refill
test_api "AddPrescriptionRefill" "POST" "/api/prescriptions/${RX_ID}/refill" \
    "{\"authorizedBy\":\"${APT_DOCTOR}\",\"refillCount\":1}" \
    "success"

# Test 50: Get Prescription History
test_api "GetPrescriptionHistory" "GET" "/api/prescriptions/${RX_ID}/history" "prescriptionId"

# Test 51: Search Prescriptions
test_api "SearchPrescriptions" "POST" "/api/prescriptions/search" \
    "{\"patientId\":\"${APT_PATIENT}\",\"startDate\":\"2025-01-01\",\"endDate\":\"2025-12-31\"}" \
    "prescriptionId"

# Test 52: Update Prescription
test_api "UpdatePrescription" "PATCH" "/api/prescriptions/${RX_ID}" \
    "{\"notes\":\"Updated prescription notes\"}" \
    "success"

# Test 53: Revoke Prescription
test_api "RevokePrescription" "POST" "/api/prescriptions/${RX_ID}/revoke" \
    "{\"reason\":\"Medical review\",\"revokedBy\":\"${APT_DOCTOR}\"}" \
    "success"

# Test 54: Get Active Prescriptions
test_api "GetActivePrescriptions" "GET" "/api/prescriptions/patient/${APT_PATIENT}/active" \
    "prescriptionId"

echo ""

# ============================================================
# TEST SUMMARY
# ============================================================
echo "════════════════════════════════════════════════════════════"
echo "  📊 TEST SUMMARY"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "  Total Tests:    $TOTAL"
echo -e "  Passed:         ${GREEN}$PASSED${NC}"
echo -e "  Failed:         ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    PERCENTAGE=100
else
    PERCENTAGE=$((PASSED * 100 / TOTAL))
fi

echo "  Success Rate:   ${PERCENTAGE}%"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  ✅ ALL TESTS PASSED! 🎉${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
    exit 0
else
    echo -e "${YELLOW}════════════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}  ⚠️  SOME TESTS FAILED${NC}"
    echo -e "${YELLOW}════════════════════════════════════════════════════════════${NC}"
    exit 1
fi
