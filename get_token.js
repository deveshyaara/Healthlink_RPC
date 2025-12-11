import('./middleware-api/src/controllers/auth.controller.js').then(async (m) => {
  const r = {body: {email: 'doctor1@healthlink.com', password: 'Doctor@123'}};
  const s = {status: c => ({json: d => {if (d.data?.token) console.log(d.data.token); return s;}})};
  await m.default.login(r, s);
}).catch(e => console.error('Error:', e.message));
