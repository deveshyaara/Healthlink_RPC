import React, { useState } from 'react';
import { doctorsApi } from '../lib/api-client';

const RegisterDoctorForm = () => {
  const [form, setForm] = useState({
    doctorId: '',
    name: '',
    specialization: '',
    licenseNumber: '',
    hospital: '',
    credentials: { degree: '' },
    contact: { email: '', phone: '' },
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('credentials.')) {
      setForm((f) => ({
        ...f,
        credentials: { ...f.credentials, [name.split('.')[1]]: value },
      }));
    } else if (name.startsWith('contact.')) {
      setForm((f) => ({
        ...f,
        contact: { ...f.contact, [name.split('.')[1]]: value },
      }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  };

  const handleSubmit = async (e) => { 
    e.preventDefault(); 
    setLoading(true);
    try { 
      await doctorsApi.registerDoctor(form); 
      setSuccess('Doctor registered successfully!'); 
      setForm({ 
        doctorId: '', 
        name: '', 
        specialization: '', 
        licenseNumber: '', 
        hospital: '', 
        credentials: { degree: '' }, 
        contact: { email: '', phone: '' }, 
      }); 
    } catch (err) { 
      setError(err.message); 
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Register Doctor</h2>
      <input name="doctorId" value={form.doctorId} onChange={handleChange} placeholder="Doctor ID" required />
      <input name="name" value={form.name} onChange={handleChange} placeholder="Name" required />
      <input name="specialization" value={form.specialization} onChange={handleChange} placeholder="Specialization" required />
      <input name="licenseNumber" value={form.licenseNumber} onChange={handleChange} placeholder="License Number" required />
      <input name="hospital" value={form.hospital} onChange={handleChange} placeholder="Hospital" required />
      <input name="credentials.degree" value={form.credentials.degree} onChange={handleChange} placeholder="Degree" required />
      <input name="contact.email" value={form.contact.email} onChange={handleChange} placeholder="Email" required />
      <input name="contact.phone" value={form.contact.phone} onChange={handleChange} placeholder="Phone" required />
      <button type="submit" disabled={loading}>{loading ? 'Registering...' : 'Register'}</button>
      {success && <div style={{ color: 'green' }}>{success}</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
    </form>
  );
};

export default RegisterDoctorForm;
