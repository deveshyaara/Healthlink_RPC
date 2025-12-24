import HealthcareController from '../src/controllers/healthcare.controller.js';

(async () => {
  const controller = new HealthcareController();
  const req = { body: {}, user: { id: 'doc1', role: 'doctor' } };
  const res = {
    status(code) { this._status = code; return this; },
    json(obj) { this._body = obj; return this; }
  };

  const next = (err) => { if (err) { console.error('next called with error:', err); } };

  await controller.createMedicalRecord(req, res, next);
  console.log('status:', res._status);
  console.log('body:', res._body);
  process.exit(0);
})();