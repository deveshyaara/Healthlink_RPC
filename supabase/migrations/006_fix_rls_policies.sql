-- ===========================================
-- Fix RLS Policies for Patient Data Access
-- Updates all policies to use the new user_id linkage
-- CORRECTED FOR ACTUAL DATABASE SCHEMA (patient_wallet_mappings)
-- ===========================================

-- ===========================================
-- PATIENT_WALLET_MAPPINGS TABLE POLICIES
-- ===========================================

-- Enable RLS if not already enabled
ALTER TABLE patient_wallet_mappings ENABLE ROW LEVEL SECURITY;

-- Service role can do all operations (bypasses RLS completely)
DROP POLICY IF EXISTS "service_role_patient_wallet_mappings_all" ON patient_wallet_mappings;
CREATE POLICY "service_role_patient_wallet_mappings_all" ON patient_wallet_mappings
FOR ALL USING (auth.role() = 'service_role');

-- Patients can view their own data using user_id
DROP POLICY IF EXISTS "patients_select_own" ON patient_wallet_mappings;
CREATE POLICY "patients_select_own" ON patient_wallet_mappings
FOR SELECT USING (auth.uid() = user_id);

-- Patients can update their own data using user_id
DROP POLICY IF EXISTS "patients_update_own" ON patient_wallet_mappings;
CREATE POLICY "patients_update_own" ON patient_wallet_mappings
FOR UPDATE USING (auth.uid() = user_id);

-- Doctors can view patient records they have access to
DROP POLICY IF EXISTS "doctors_view_patients" ON patient_wallet_mappings;
CREATE POLICY "doctors_view_patients" ON patient_wallet_mappings
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM appointments a
        WHERE a.patient_id = patient_wallet_mappings.id
        AND a.doctor_id = auth.uid()
    ) OR
    EXISTS (
        SELECT 1 FROM medical_records mr
        WHERE mr.patient_id = patient_wallet_mappings.id
        AND mr.doctor_id = auth.uid()
    ) OR
    EXISTS (
        SELECT 1 FROM prescriptions p
        WHERE p.patient_id = patient_wallet_mappings.id
        AND p.doctor_id = auth.uid()
    )
);

-- ===========================================
-- MEDICAL RECORDS TABLE POLICIES (UPDATED)
-- ===========================================

-- Enable RLS if not already enabled
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;

-- Service role can do all operations
DROP POLICY IF EXISTS "service_role_medical_records_all" ON medical_records;
CREATE POLICY "service_role_medical_records_all" ON medical_records
FOR ALL USING (auth.role() = 'service_role');

-- Patients can view their own records (via JOIN with patient_wallet_mappings table)
DROP POLICY IF EXISTS "patients_view_own_records" ON medical_records;
CREATE POLICY "patients_view_own_records" ON medical_records
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM patient_wallet_mappings pwm 
        WHERE pwm.id = medical_records.patient_id 
        AND pwm.user_id = auth.uid()
    )
);

-- Doctors can view records they created or have access to
DROP POLICY IF EXISTS "doctors_view_records" ON medical_records;
CREATE POLICY "doctors_view_records" ON medical_records
FOR SELECT USING (doctor_id = auth.uid());

-- Doctors can create records
DROP POLICY IF EXISTS "doctors_create_records" ON medical_records;
CREATE POLICY "doctors_create_records" ON medical_records
FOR INSERT WITH CHECK (doctor_id = auth.uid());

-- ===========================================
-- APPOINTMENTS TABLE POLICIES (UPDATED)
-- ===========================================

-- Enable RLS if not already enabled
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Service role can do all operations
DROP POLICY IF EXISTS "service_role_appointments_all" ON appointments;
CREATE POLICY "service_role_appointments_all" ON appointments
FOR ALL USING (auth.role() = 'service_role');

-- Patients can view their own appointments (via JOIN with patient_wallet_mappings table)
DROP POLICY IF EXISTS "patients_view_own_appointments" ON appointments;
CREATE POLICY "patients_view_own_appointments" ON appointments
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM patient_wallet_mappings pwm 
        WHERE pwm.id = appointments.patient_id 
        AND pwm.user_id = auth.uid()
    )
);

-- Patients can create appointments for themselves (via JOIN with patient_wallet_mappings table)
DROP POLICY IF EXISTS "patients_create_appointments" ON appointments;
CREATE POLICY "patients_create_appointments" ON appointments
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM patient_wallet_mappings pwm 
        WHERE pwm.id = appointments.patient_id 
        AND pwm.user_id = auth.uid()
    )
);

-- Doctors can view their appointments
DROP POLICY IF EXISTS "doctors_view_appointments" ON appointments;
CREATE POLICY "doctors_view_appointments" ON appointments
FOR SELECT USING (doctor_id = auth.uid());

-- Doctors can update their appointments
DROP POLICY IF EXISTS "doctors_update_appointments" ON appointments;
CREATE POLICY "doctors_update_appointments" ON appointments
FOR UPDATE USING (doctor_id = auth.uid());

-- ===========================================
-- PRESCRIPTIONS TABLE POLICIES (UPDATED)
-- ===========================================

-- Enable RLS if not already enabled
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

-- Service role can do all operations
DROP POLICY IF EXISTS "service_role_prescriptions_all" ON prescriptions;
CREATE POLICY "service_role_prescriptions_all" ON prescriptions
FOR ALL USING (auth.role() = 'service_role');

-- Patients can view their own prescriptions (via JOIN with patient_wallet_mappings table)
DROP POLICY IF EXISTS "patients_view_own_prescriptions" ON prescriptions;
CREATE POLICY "patients_view_own_prescriptions" ON prescriptions
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM patient_wallet_mappings pwm 
        WHERE pwm.id = prescriptions.patient_id 
        AND pwm.user_id = auth.uid()
    )
);

-- Doctors can view prescriptions they created
DROP POLICY IF EXISTS "doctors_view_prescriptions" ON prescriptions;
CREATE POLICY "doctors_view_prescriptions" ON prescriptions
FOR SELECT USING (doctor_id = auth.uid());

-- Doctors can create prescriptions
DROP POLICY IF EXISTS "doctors_create_prescriptions" ON prescriptions;
CREATE POLICY "doctors_create_prescriptions" ON prescriptions
FOR INSERT WITH CHECK (doctor_id = auth.uid());

-- ===========================================
-- LAB TESTS TABLE POLICIES (NEW)
-- ===========================================

-- Enable RLS if not already enabled
ALTER TABLE lab_tests ENABLE ROW LEVEL SECURITY;

-- Service role can do all operations
DROP POLICY IF EXISTS "service_role_lab_tests_all" ON lab_tests;
CREATE POLICY "service_role_lab_tests_all" ON lab_tests
FOR ALL USING (auth.role() = 'service_role');

-- Patients can view their own lab tests
DROP POLICY IF EXISTS "patients_view_own_lab_tests" ON lab_tests;
CREATE POLICY "patients_view_own_lab_tests" ON lab_tests
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM patient_wallet_mappings pwm 
        WHERE pwm.id = lab_tests.patient_id 
        AND pwm.user_id = auth.uid()
    )
);

-- Doctors can view lab tests they ordered
DROP POLICY IF EXISTS "doctors_view_lab_tests" ON lab_tests;
CREATE POLICY "doctors_view_lab_tests" ON lab_tests
FOR SELECT USING (doctor_id = auth.uid());

-- ===========================================
-- CONSENT REQUESTS TABLE POLICIES (NEW)
-- ===========================================

-- Enable RLS if not already enabled
ALTER TABLE consent_requests ENABLE ROW LEVEL SECURITY;

-- Service role can do all operations
DROP POLICY IF EXISTS "service_role_consent_requests_all" ON consent_requests;
CREATE POLICY "service_role_consent_requests_all" ON consent_requests
FOR ALL USING (auth.role() = 'service_role');

-- Patients can view consent requests for their data
DROP POLICY IF EXISTS "patients_view_own_consent_requests" ON consent_requests;
CREATE POLICY "patients_view_own_consent_requests" ON consent_requests
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM patient_wallet_mappings pwm 
        WHERE pwm.id = consent_requests.patient_id 
        AND pwm.user_id = auth.uid()
    )
);

-- Patients can manage consent requests for their data
DROP POLICY IF EXISTS "patients_manage_own_consent_requests" ON consent_requests;
CREATE POLICY "patients_manage_own_consent_requests" ON consent_requests
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM patient_wallet_mappings pwm 
        WHERE pwm.id = consent_requests.patient_id 
        AND pwm.user_id = auth.uid()
    )
);

-- Requesters (doctors) can view consent requests they made
DROP POLICY IF EXISTS "requesters_view_consent_requests" ON consent_requests;
CREATE POLICY "requesters_view_consent_requests" ON consent_requests
FOR SELECT USING (requester_id = auth.uid());
