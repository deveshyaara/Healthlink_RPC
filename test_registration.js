const http = require('http');

function request(method, path, data) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {'Content-Type': 'application/json'},
      timeout: 5000
    };
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function test() {
  console.log('\n🧪 Testing User Registration (without blockchain wallet)...\n');
  
  // Try registering a new patient
  try {
    const result = await request('POST', '/api/auth/register', {
      email: 'patient2@healthlink.com',
      password: 'Patient@456',
      name: 'Jane Smith',
      role: 'patient'
    });
    
    if (result.status === 201) {
      console.log('✅ Registration successful!');
      console.log('   User:', result.data.data.user.name);
      console.log('   Role:', result.data.data.user.role);
      console.log('   Token received:', result.data.data.token ? 'Yes' : 'No');
    } else if (result.status === 409) {
      console.log('ℹ️  User already exists (expected if running test multiple times)');
    } else {
      console.log('❌ Registration failed:', result.data.message);
    }
  } catch (e) {
    console.log('❌ Error:', e.message);
  }
}

test();
