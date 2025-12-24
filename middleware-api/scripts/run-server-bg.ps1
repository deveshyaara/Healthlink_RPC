$env:DATABASE_URL = 'postgresql://postgres.wpmgqueyuwuvdcavzthg:xwr5w2%24JgH%3Fx%40YF@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
$env:JWT_SECRET = 'healthlink-production-secret-change-this-to-secure-random-string'
node src/server.js > server.log 2>&1