-- ===========================================
-- Row Level Security (RLS) Policies
-- Configure secure access control for all tables
-- ===========================================

-- Enable RLS on all tables
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- PATIENTS TABLE POLICIES
-- ===========================================

-- Service role can do all operations (bypasses RLS completely)
DROP POLICY IF EXISTS "service_role_patients_all" ON patients;
CREATE POLICY "service_role_patients_all" ON patients
FOR ALL USING (auth.role() = 'service_role');

-- Patients can view their own data
DROP POLICY IF EXISTS "patients_select_own" ON patients;
CREATE POLICY "patients_select_own" ON patients
FOR SELECT USING (
    auth.uid()::text = id::text OR
    wallet_address = (SELECT wallet_address FROM doctors WHERE user_id = auth.uid())
);

-- Patients can update their own data
DROP POLICY IF EXISTS "patients_update_own" ON patients;
CREATE POLICY "patients_update_own" ON patients
FOR UPDATE USING (auth.uid()::text = id::text);

-- Doctors can view patients they have appointments with or have treated
DROP POLICY IF EXISTS "doctors_view_patients" ON patients;
CREATE POLICY "doctors_view_patients" ON patients
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM appointments a
        WHERE a.patient_id = patients.id
        AND a.doctor_id = auth.uid()
    ) OR
    EXISTS (
        SELECT 1 FROM medical_records mr
        WHERE mr.patient_id = patients.id
        AND mr.doctor_id = auth.uid()
    ) OR
    EXISTS (
        SELECT 1 FROM prescriptions p
        WHERE p.patient_id = patients.id
        AND p.doctor_id = auth.uid()
    )
);

-- Admins can view all patients
DROP POLICY IF EXISTS "admins_patients_all" ON patients;
CREATE POLICY "admins_patients_all" ON patients
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role = 'admin'
    )
);

-- ===========================================
-- MEDICAL RECORDS TABLE POLICIES
-- ===========================================

-- Service role can do all operations
DROP POLICY IF EXISTS "service_role_medical_records_all" ON medical_records;
CREATE POLICY "service_role_medical_records_all" ON medical_records
FOR ALL USING (auth.role() = 'service_role');

-- Patients can view their own records
DROP POLICY IF EXISTS "patients_view_own_records" ON medical_records;
CREATE POLICY "patients_view_own_records" ON medical_records
FOR SELECT USING (patient_id::text = auth.uid()::text);

-- Doctors can view records for patients they have consent for
DROP POLICY IF EXISTS "doctors_view_records_with_consent" ON medical_records;
CREATE POLICY "doctors_view_records_with_consent" ON medical_records
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM consents c
        WHERE c.patient_id = medical_records.patient_id
        AND c.doctor_id = auth.uid()
        AND c.granted = true
        AND (c.expires_at IS NULL OR c.expires_at > NOW())
    )
);

-- Doctors can create records for patients they have consent for
DROP POLICY IF EXISTS "doctors_create_records" ON medical_records;
CREATE POLICY "doctors_create_records" ON medical_records
FOR INSERT WITH CHECK (
    doctor_id = auth.uid() AND
    EXISTS (
        SELECT 1 FROM consents c
        WHERE c.patient_id = medical_records.patient_id
        AND c.doctor_id = auth.uid()
        AND c.granted = true
        AND (c.expires_at IS NULL OR c.expires_at > NOW())
    )
);

-- ===========================================
-- APPOINTMENTS TABLE POLICIES
-- ===========================================

-- Service role can do all operations
DROP POLICY IF EXISTS "service_role_appointments_all" ON appointments;
CREATE POLICY "service_role_appointments_all" ON appointments
FOR ALL USING (auth.role() = 'service_role');

-- Patients can view their own appointments
DROP POLICY IF EXISTS "patients_view_own_appointments" ON appointments;
CREATE POLICY "patients_view_own_appointments" ON appointments
FOR SELECT USING (patient_id::text = auth.uid()::text);

-- Patients can create appointments for themselves
DROP POLICY IF EXISTS "patients_create_appointments" ON appointments;
CREATE POLICY "patients_create_appointments" ON appointments
FOR INSERT WITH CHECK (patient_id::text = auth.uid()::text);

-- Doctors can view appointments they created
DROP POLICY IF EXISTS "doctors_view_own_appointments" ON appointments;
CREATE POLICY "doctors_view_own_appointments" ON appointments
FOR SELECT USING (doctor_id = auth.uid());

-- Doctors can create appointments
DROP POLICY IF EXISTS "doctors_create_appointments" ON appointments;
CREATE POLICY "doctors_create_appointments" ON appointments
FOR INSERT WITH CHECK (doctor_id = auth.uid());

-- Doctors can update appointment status
DROP POLICY IF EXISTS "doctors_update_appointments" ON appointments;
CREATE POLICY "doctors_update_appointments" ON appointments
FOR UPDATE USING (doctor_id = auth.uid());

-- ===========================================
-- PRESCRIPTIONS TABLE POLICIES
-- ===========================================

-- Service role can do all operations
DROP POLICY IF EXISTS "service_role_prescriptions_all" ON prescriptions;
CREATE POLICY "service_role_prescriptions_all" ON prescriptions
FOR ALL USING (auth.role() = 'service_role');

-- Patients can view their own prescriptions
DROP POLICY IF EXISTS "patients_view_own_prescriptions" ON prescriptions;
CREATE POLICY "patients_view_own_prescriptions" ON prescriptions
FOR SELECT USING (patient_id::text = auth.uid()::text);

-- Doctors can view prescriptions they created
DROP POLICY IF EXISTS "doctors_view_own_prescriptions" ON prescriptions;
CREATE POLICY "doctors_view_own_prescriptions" ON prescriptions
FOR SELECT USING (doctor_id = auth.uid());

-- Doctors can create prescriptions for patients they have consent for
DROP POLICY IF EXISTS "doctors_create_prescriptions" ON prescriptions;
CREATE POLICY "doctors_create_prescriptions" ON prescriptions
FOR INSERT WITH CHECK (
    doctor_id = auth.uid() AND
    EXISTS (
        SELECT 1 FROM consents c
        WHERE c.patient_id = prescriptions.patient_id
        AND c.doctor_id = auth.uid()
        AND c.granted = true
        AND (c.expires_at IS NULL OR c.expires_at > NOW())
    )
);

-- ===========================================
-- DOCTORS TABLE POLICIES
-- ===========================================

-- Service role can do all operations
DROP POLICY IF EXISTS "service_role_doctors_all" ON doctors;
CREATE POLICY "service_role_doctors_all" ON doctors
FOR ALL USING (auth.role() = 'service_role');

-- Everyone can view verified doctors
DROP POLICY IF EXISTS "view_verified_doctors" ON doctors;
CREATE POLICY "view_verified_doctors" ON doctors
FOR SELECT USING (is_verified = true);

-- Doctors can view and update their own profile
DROP POLICY IF EXISTS "doctors_manage_own_profile" ON doctors;
CREATE POLICY "doctors_manage_own_profile" ON doctors
FOR ALL USING (user_id = auth.uid());

-- Admins can manage all doctors
DROP POLICY IF EXISTS "admins_manage_doctors" ON doctors;
CREATE POLICY "admins_manage_doctors" ON doctors
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role = 'admin'
    )
);

-- ===========================================
-- CONSENTS TABLE POLICIES
-- ===========================================

-- Service role can do all operations
DROP POLICY IF EXISTS "service_role_consents_all" ON consents;
CREATE POLICY "service_role_consents_all" ON consents
FOR ALL USING (auth.role() = 'service_role');

-- Patients can view consents for their data
DROP POLICY IF EXISTS "patients_view_own_consents" ON consents;
CREATE POLICY "patients_view_own_consents" ON consents
FOR SELECT USING (patient_id::text = auth.uid()::text);

-- Patients can grant/revoke consent for their data
DROP POLICY IF EXISTS "patients_manage_own_consents" ON consents;
CREATE POLICY "patients_manage_own_consents" ON consents
FOR ALL USING (patient_id::text = auth.uid()::text);

-- Doctors can view consents they have requested
DROP POLICY IF EXISTS "doctors_view_requested_consents" ON consents;
CREATE POLICY "doctors_view_requested_consents" ON consents
FOR SELECT USING (doctor_id = auth.uid());

-- ===========================================
-- AUDIT LOGS TABLE POLICIES
-- ===========================================

-- Service role can do all operations
DROP POLICY IF EXISTS "service_role_audit_logs_all" ON audit_logs;
CREATE POLICY "service_role_audit_logs_all" ON audit_logs
FOR ALL USING (auth.role() = 'service_role');

-- Only admins can view audit logs
DROP POLICY IF EXISTS "admins_view_audit_logs" ON audit_logs;
CREATE POLICY "admins_view_audit_logs" ON audit_logs
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role = 'admin'
    )
);

-- Service role can insert audit logs
DROP POLICY IF EXISTS "service_role_insert_audit_logs" ON audit_logs;
CREATE POLICY "service_role_insert_audit_logs" ON audit_logs
FOR INSERT WITH CHECK (auth.role() = 'service_role');