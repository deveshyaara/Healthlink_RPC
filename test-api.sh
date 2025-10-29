#!/bin/bash

# A script to run a series of tests against the HealthLink Pro API.
# Assumes the server is running on localhost:4000.

# --- Configuration ---
BASE_URL="http://localhost:4000"
PATIENT_ID="patient-$(date +%s)" # Use timestamp to ensure uniqueness
CONSENT_ID="consent-$(date +%s)"
GRANTEE_ID="hospital-abc"
TX_ID=""

# --- Helper Functions ---
# Function to print a header for each test case
print_header() {
    echo ""
    echo "================================================="
    echo "  TEST CASE: $1"
    echo "================================================="
}

# --- Test Cases ---

# 1. Create a new consent
print_header "Create a new consent"
RESPONSE=$(curl -s -X POST "${BASE_URL}/api/consents" \
-H "Content-Type: application/json" \
-d '{
    "consentId": "'$CONSENT_ID'",
    "patientId": "'$PATIENT_ID'",
    "granteeId": "'$GRANTEE_ID'",
    "scope": "view_records",
    "purpose": "emergency_care",
    "validUntil": "2026-12-31T23:59:59Z"
}')

echo "$RESPONSE" | jq .
TX_ID=$(echo "$RESPONSE" | jq -r '.txId')


# 2. Get the newly created consent by its ID
print_header "Get the new consent by ID"
curl -s "${BASE_URL}/api/consents/${CONSENT_ID}" | jq .


# 3. Get all consents for the patient
print_header "Get all consents for patient: ${PATIENT_ID}"
curl -s "${BASE_URL}/api/patient/${PATIENT_ID}/consents" | jq .


# 4. Revoke the consent
print_header "Revoke the consent"
curl -s -X PATCH "${BASE_URL}/api/consents/${CONSENT_ID}/revoke" | jq .


# 5. Verify the consent is now revoked
print_header "Verify the consent status is 'revoked'"
curl -s "${BASE_URL}/api/consents/${CONSENT_ID}" | jq .


# 6. Get the audit record for the creation transaction
print_header "Get the audit record for the creation transaction"
if [ -z "$TX_ID" ] || [ "$TX_ID" == "null" ]; then
    echo "!!! SKIPPING AUDIT TEST: Could not capture Transaction ID from consent creation."
else
    echo "--> Using captured TX_ID: $TX_ID"
    curl -s "${BASE_URL}/api/audit/${TX_ID}" | jq .
fi

echo ""
echo "--- Test run complete ---"