#!/bin/bash

# HealthLink Pro - Phase 2 API Test Suite
# Tests all 27 Appointment and Prescription endpoints
# Permanent implementation with comprehensive test coverage

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

API_URL="http://localhost:4000"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Generate unique IDs for test data
TIMESTAMP=$(date +%s%N | cut -b1-13)
APPOINTMENT_ID="APT-${TIMESTAMP}"
APPOINTMENT_ID_2="APT-${TIMESTAMP}-2"
PRESCRIPTION_ID="RX-${TIMESTAMP}"
PRESCRIPTION_ID_2="RX-${TIMESTAMP}-2"
PATIENT_ID="PAT-${TIMESTAMP}"
DOCTOR_ID="DOC-${TIMESTAMP}"
PHARMACY_ID="PHM-${TIMESTAMP}"

print_header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
}

print_test() {
    echo -e "${CYAN}► Test $1: $2${NC}"
}

print_success() {
    ((TESTS_PASSED++))
    echo -e "${GREEN}✓ PASS: $1${NC}"
}

print_fail() {
    ((TESTS_FAILED++))
    echo -e "${RED}✗ FAIL: $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ WARNING: $1${NC}"
}

run_test() {
    ((TESTS_RUN++))
    local test_name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local expected_code="$5"
    
    print_test "$TESTS_RUN" "$test_name"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" -X GET "$API_URL$endpoint")
    elif [ "$method" = "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    elif [ "$method" = "PUT" ]; then
        response=$(curl -s -w "\n%{http_code}" -X PUT "$API_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "$expected_code" ]; then
        print_success "$test_name (HTTP $http_code)"
        echo "  Response: $(echo $body | jq -c '.' 2>/dev/null || echo $body | cut -c1-100)"
    else
        print_fail "$test_name - Expected HTTP $expected_code, got $http_code"
        echo "  Response: $body"
    fi
    
    echo ""
}

# Wait for server to be ready
wait_for_server() {
    print_header "Waiting for API Server"
    for i in {1..30}; do
        if curl -s "$API_URL/api/health" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ API Server is ready${NC}"
            return 0
        fi
        echo "Waiting for server... ($i/30)"
        sleep 2
    done
    echo -e "${RED}✗ API Server did not start in time${NC}"
    exit 1
}

# Main test execution
main() {
    print_header "HealthLink Pro - Phase 2 API Test Suite"
    echo "Testing 27 Appointment and Prescription endpoints"
    echo "Test Data:"
    echo "  Appointment ID: $APPOINTMENT_ID"
    echo "  Appointment ID 2: $APPOINTMENT_ID_2"
    echo "  Prescription ID: $PRESCRIPTION_ID"
    echo "  Prescription ID 2: $PRESCRIPTION_ID_2"
    echo "  Patient ID: $PATIENT_ID"
    echo "  Doctor ID: $DOCTOR_ID"
    echo "  Pharmacy ID: $PHARMACY_ID"
    
    wait_for_server
    
    # ========================================================================
    # APPOINTMENT ENDPOINTS (14 tests)
    # ========================================================================
    
    print_header "APPOINTMENT ENDPOINTS (14 tests)"
    
    # Test 1: Schedule an appointment
    run_test \
        "Schedule new appointment" \
        "POST" \
        "/api/appointments" \
        '{
            "appointmentId": "'"$APPOINTMENT_ID"'",
            "patientId": "'"$PATIENT_ID"'",
            "doctorId": "'"$DOCTOR_ID"'",
            "appointmentDate": "2025-11-10",
            "startTime": "10:00",
            "endTime": "10:30",
            "reason": {
                "purpose": "Regular checkup",
                "symptoms": ["General health review"],
                "notes": "Annual physical examination",
                "urgency": "normal"
            }
        }' \
        "201"
    
    # Test 2: Get appointment details
    run_test \
        "Get appointment by ID" \
        "GET" \
        "/api/appointments/$APPOINTMENT_ID" \
        "" \
        "200"
    
    # Test 3: Confirm appointment
    run_test \
        "Confirm appointment" \
        "POST" \
        "/api/appointments/$APPOINTMENT_ID/confirm" \
        '{}' \
        "200"
    
    # Test 4: Get patient's appointments
    run_test \
        "Get patient's appointments" \
        "GET" \
        "/api/patients/$PATIENT_ID/appointments" \
        "" \
        "200"
    
    # Test 5: Get doctor's appointments
    run_test \
        "Get doctor's appointments" \
        "GET" \
        "/api/doctors/$DOCTOR_ID/appointments" \
        "" \
        "200"
    
    # Test 6: Get doctor's schedule
    run_test \
        "Get doctor's schedule for date" \
        "GET" \
        "/api/doctors/$DOCTOR_ID/schedule/2025-11-10" \
        "" \
        "200"
    
    # Test 7: Schedule second appointment (for rescheduling test)
    run_test \
        "Schedule second appointment" \
        "POST" \
        "/api/appointments" \
        '{
            "appointmentId": "'"$APPOINTMENT_ID_2"'",
            "patientId": "'"$PATIENT_ID"'",
            "doctorId": "'"$DOCTOR_ID"'",
            "appointmentDate": "2025-11-15",
            "startTime": "14:00",
            "endTime": "14:30",
            "reason": {
                "purpose": "Follow-up visit",
                "symptoms": [],
                "notes": "Follow-up from previous consultation",
                "urgency": "normal"
            }
        }' \
        "201"
    
    # Test 8: Search appointments
    run_test \
        "Search appointments by status" \
        "POST" \
        "/api/appointments/search" \
        '{
            "criteria": {
                "status": "confirmed"
            }
        }' \
        "200"
    
    # Test 9: Get appointments by date range
    run_test \
        "Get appointments by date range" \
        "POST" \
        "/api/appointments/date-range" \
        '{
            "startDate": "2025-11-01",
            "endDate": "2025-11-30",
            "doctorId": "'"$DOCTOR_ID"'"
        }' \
        "200"
    
    # Test 10: Add reminder to appointment
    run_test \
        "Add reminder to appointment" \
        "POST" \
        "/api/appointments/$APPOINTMENT_ID/reminders" \
        '{
            "type": "24-hour",
            "sentAt": "2025-11-09T10:00:00Z",
            "method": "sms"
        }' \
        "200"
    
    # Test 11: Complete appointment
    run_test \
        "Complete appointment" \
        "POST" \
        "/api/appointments/$APPOINTMENT_ID/complete" \
        '{
            "diagnosis": "Patient is in good health",
            "notes": "All vital signs normal. Recommended annual follow-up.",
            "prescriptionIds": [],
            "labTestIds": []
        }' \
        "200"
    
    # Test 12: Reschedule appointment
    run_test \
        "Reschedule appointment" \
        "POST" \
        "/api/appointments/$APPOINTMENT_ID_2/reschedule" \
        '{
            "newDate": "2025-11-16",
            "newStartTime": "15:00",
            "newEndTime": "15:30",
            "reason": "Patient requested different time"
        }' \
        "200"
    
    # Test 13: Get appointment history
    run_test \
        "Get appointment history" \
        "GET" \
        "/api/appointments/$APPOINTMENT_ID_2/history" \
        "" \
        "200"
    
    # Test 14: Cancel appointment
    run_test \
        "Cancel appointment" \
        "POST" \
        "/api/appointments/$APPOINTMENT_ID_2/cancel" \
        '{
            "reason": "Patient rescheduled externally",
            "cancelledBy": "patient"
        }' \
        "200"
    
    # ========================================================================
    # PRESCRIPTION ENDPOINTS (13 tests)
    # ========================================================================
    
    print_header "PRESCRIPTION ENDPOINTS (13 tests)"
    
    # Test 15: Create prescription
    run_test \
        "Create new prescription" \
        "POST" \
        "/api/prescriptions" \
        '{
            "prescriptionId": "'"$PRESCRIPTION_ID"'",
            "patientId": "'"$PATIENT_ID"'",
            "doctorId": "'"$DOCTOR_ID"'",
            "medications": [
                {
                    "medicationName": "Amoxicillin",
                    "genericName": "Amoxicillin",
                    "dosage": "500mg",
                    "frequency": "3 times daily",
                    "duration": "7 days",
                    "quantity": 21,
                    "refillsAllowed": 0,
                    "instructions": "Take with food",
                    "warnings": ["May cause stomach upset"],
                    "substitutionAllowed": true
                }
            ],
            "diagnosis": {
                "condition": "Bacterial infection",
                "icdCode": "A49.9",
                "notes": "Upper respiratory tract infection"
            },
            "appointmentId": "'"$APPOINTMENT_ID"'"
        }' \
        "201"
    
    # Test 16: Get prescription by ID
    run_test \
        "Get prescription by ID" \
        "GET" \
        "/api/prescriptions/$PRESCRIPTION_ID" \
        "" \
        "200"
    
    # Test 17: Verify prescription
    run_test \
        "Verify prescription authenticity" \
        "GET" \
        "/api/prescriptions/$PRESCRIPTION_ID/verify" \
        "" \
        "200"
    
    # Test 18: Get patient's prescriptions
    run_test \
        "Get patient's prescriptions" \
        "GET" \
        "/api/patients/$PATIENT_ID/prescriptions" \
        "" \
        "200"
    
    # Test 19: Get doctor's prescriptions
    run_test \
        "Get doctor's prescriptions" \
        "GET" \
        "/api/doctors/$DOCTOR_ID/prescriptions" \
        "" \
        "200"
    
    # Test 20: Get active prescriptions
    run_test \
        "Get active prescriptions for patient" \
        "GET" \
        "/api/patients/$PATIENT_ID/prescriptions/active" \
        "" \
        "200"
    
    # Test 21: Dispense prescription
    run_test \
        "Dispense prescription at pharmacy" \
        "POST" \
        "/api/prescriptions/$PRESCRIPTION_ID/dispense" \
        '{
            "pharmacyId": "'"$PHARMACY_ID"'",
            "dispensedBy": "Pharmacist-001",
            "quantitiesDispensed": [21],
            "notes": "Full prescription dispensed"
        }' \
        "200"
    
    # Test 22: Get pharmacy's prescriptions
    run_test \
        "Get pharmacy's dispensed prescriptions" \
        "GET" \
        "/api/pharmacies/$PHARMACY_ID/prescriptions" \
        "" \
        "200"
    
    # Test 23: Add notes to prescription
    run_test \
        "Add pharmacist notes to prescription" \
        "POST" \
        "/api/prescriptions/$PRESCRIPTION_ID/notes" \
        '{
            "note": "Patient advised about potential side effects",
            "addedBy": "Pharmacist-001"
        }' \
        "200"
    
    # Test 24: Create prescription with refills
    run_test \
        "Create prescription with refills" \
        "POST" \
        "/api/prescriptions" \
        '{
            "prescriptionId": "'"$PRESCRIPTION_ID_2"'",
            "patientId": "'"$PATIENT_ID"'",
            "doctorId": "'"$DOCTOR_ID"'",
            "medications": [
                {
                    "medicationName": "Lisinopril",
                    "genericName": "Lisinopril",
                    "dosage": "10mg",
                    "frequency": "Once daily",
                    "duration": "30 days",
                    "quantity": 30,
                    "refillsAllowed": 3,
                    "instructions": "Take in the morning",
                    "warnings": ["Monitor blood pressure"],
                    "substitutionAllowed": true
                }
            ],
            "diagnosis": {
                "condition": "Hypertension",
                "icdCode": "I10",
                "notes": "Blood pressure management"
            }
        }' \
        "201"
    
    # Test 25: Search by medication
    run_test \
        "Search prescriptions by medication name" \
        "GET" \
        "/api/prescriptions/search/medication/Lisinopril" \
        "" \
        "200"
    
    # Test 26: Refill prescription
    run_test \
        "Process prescription refill" \
        "POST" \
        "/api/prescriptions/$PRESCRIPTION_ID_2/refill" \
        '{
            "pharmacyId": "'"$PHARMACY_ID"'",
            "dispensedBy": "Pharmacist-002",
            "quantitiesDispensed": [30],
            "notes": "First refill dispensed"
        }' \
        "200"
    
    # Test 27: Get prescription history
    run_test \
        "Get prescription history" \
        "GET" \
        "/api/prescriptions/$PRESCRIPTION_ID/history" \
        "" \
        "200"
    
    # ========================================================================
    # TEST SUMMARY
    # ========================================================================
    
    print_header "TEST SUMMARY"
    echo -e "${CYAN}Total Tests Run:    ${NC}$TESTS_RUN"
    echo -e "${GREEN}Tests Passed:       ${NC}$TESTS_PASSED"
    echo -e "${RED}Tests Failed:       ${NC}$TESTS_FAILED"
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo ""
        echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║     ✓ ALL PHASE 2 TESTS PASSED SUCCESSFULLY!             ║${NC}"
        echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
        echo ""
        echo "Phase 2 Implementation Complete:"
        echo "  ✓ 14 Appointment endpoints tested"
        echo "  ✓ 13 Prescription endpoints tested"
        echo "  ✓ 27 total endpoints working perfectly"
        echo ""
        echo "Next Steps:"
        echo "  1. Review test results in deployment.log"
        echo "  2. Check RPC server logs for any warnings"
        echo "  3. Proceed to Phase 3 (Lab Tests & Insurance Claims)"
        exit 0
    else
        echo ""
        echo -e "${RED}╔═══════════════════════════════════════════════════════════╗${NC}"
        echo -e "${RED}║     ✗ SOME TESTS FAILED                                   ║${NC}"
        echo -e "${RED}╚═══════════════════════════════════════════════════════════╝${NC}"
        echo ""
        echo "Please review failed tests and check:"
        echo "  1. Are all contracts deployed? (./verify-system.sh)"
        echo "  2. Is the RPC server running? (lsof -i:4000)"
        echo "  3. Check server logs: tail -f my-project/rpc-server/rpc-server.log"
        exit 1
    fi
}

# Run tests
main
