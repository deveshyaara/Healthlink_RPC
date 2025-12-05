import React, { useEffect, useState } from 'react';
import { doctorsApi } from '../lib/api-client';

const DoctorDetail = ({ doctorId }) => {
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    doctorsApi.getDoctor(doctorId)
      .then(setDoctor)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [doctorId]);

  if (loading) {return <div>Loading doctor details...</div>;}
  if (error) {return <div style={{ color: 'red' }}>Error: {error}</div>;}
  if (!doctor) {return <div>No doctor found.</div>;}

  return (
    <div>
      <h2>Doctor Details</h2>
      <p><strong>Name:</strong> {doctor.name}</p>
      <p><strong>Specialization:</strong> {doctor.specialization}</p>
      <p><strong>License Number:</strong> {doctor.licenseNumber}</p>
      {/* Add more fields as needed */}
    </div>
  );
};

export default DoctorDetail;
