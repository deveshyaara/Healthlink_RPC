# API Contract Testing - Quick Reference Card

**Print this and keep it near your desk!**

---

## 🚀 Quick Start (30 seconds)

```bash
# Test backend contracts
node test_contracts.js

# Spy on frontend (paste in Chrome DevTools Console)
cat frontend_spy.js | pbcopy  # or copy manually
```

---

## ✅ Pre-Deployment Checklist

Before merging any API changes:

- [ ] Run `node test_contracts.js` - all tests pass
- [ ] Test in browser with `frontend_spy.js` active
- [ ] Verify blockchain TX IDs returned (if applicable)
- [ ] Check error responses are 400/401/403, not 500
- [ ] All dates use `.toISOString()` format
- [ ] Review [API_GOLDEN_RULES.md](./API_GOLDEN_RULES.md)

---

## 🎯 The 3 Most Critical Rules

### 1. Blockchain TX ID is Mandatory
```javascript
// ❌ BAD
res.json({ id: record.id, title: record.title });

// ✅ GOOD
res.json({ 
  id: record.id, 
  title: record.title,
  transactionId: txId  // ← Must have this!
});
```

### 2. Dates = ISO 8601 Only
```javascript
// ❌ BAD
createdAt: new Date().toLocaleDateString()  // "12/12/2025"

// ✅ GOOD
createdAt: new Date().toISOString()  // "2025-12-12T10:30:45.123Z"
```

### 3. Errors = 400, Not 500
```javascript
// ❌ BAD - Server crashes on validation error
app.post('/api/prescriptions', (req, res) => {
  const dosage = req.body.dosage;
  // Crashes if dosage is undefined
  const prescription = { dosage: dosage.toUpperCase() };
});

// ✅ GOOD - Returns 400 with clear message
app.post('/api/prescriptions', (req, res) => {
  if (!req.body.dosage) {
    return res.status(400).json({
      error: "VALIDATION_ERROR",
      message: "Missing required field: dosage",
      statusCode: 400
    });
  }
  // ...
});
```

---

## 🐛 Common Errors & Fixes

| Error | Fix |
|-------|-----|
| `❌ Field 'transactionId' - Invalid` | Add `transactionId: result.getTransactionId()` |
| `❌ Response is not an array` | Return `res.json(doctors)` not `res.json({ doctors })` |
| `❌ Field 'createdAt' - ISO date format` | Use `.toISOString()` not `.toLocaleDateString()` |
| `❌ Server crashed (500) on bad input` | Add Zod validation, return 400 |
| `❌ CORS headers missing` | Check `config/index.js` CORS settings |

---

## 📋 Expected Response Schemas

### Login/Register
```json
{
  "token": "eyJhbGci...",
  "user": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "role": "doctor"
  }
}
```

### Create Medical Record
```json
{
  "id": "rec_abc123",
  "title": "Blood Test",
  "transactionId": "a1b2c3d4e5f6...",  ← REQUIRED!
  "createdAt": "2025-12-12T10:30:45.123Z"
}
```

### List Doctors
```json
[
  {
    "id": "doc_def456",
    "firstName": "Alice",
    "lastName": "Smith",
    "specialization": "Cardiology",
    "licenseId": "MD-12345"
  }
]
```
*(Array, not `{ doctors: [...] }`)*

### Error Response
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Missing required field: dosage",
  "statusCode": 400,
  "details": { "field": "dosage" }
}
```

---

## 🎨 Frontend Spy Color Guide

When you paste `frontend_spy.js` in DevTools:

- **🔵 BLUE** = Outgoing request (shows what frontend is sending)
- **🟢 GREEN** = Successful response (200-299)
- **🔴 RED** = Error response (400-599)
- **🟠 ORANGE** = Schema validation warning (missing fields)

---

## 🧪 Test Commands

```bash
# Full contract test suite
node test_contracts.js

# Test specific endpoint manually
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test123"}'

# Verify services running
./verify_deployment.sh

# Check middleware health
curl http://localhost:3000/health | jq
```

---

## 📞 When Tests Fail

1. **Check if services are running**
   ```bash
   ./verify_deployment.sh
   ```

2. **Read the error message**
   ```
   ❌ Field 'transactionId' - Invalid (got: undefined)
   ```
   → Add transactionId to response

3. **Check API_GOLDEN_RULES.md**
   → Section "Common Violations & Fixes"

4. **Use frontend spy to see actual requests**
   → Compare with expected schema

---

## 🎓 For New Developers

1. Read [API_GOLDEN_RULES.md](./API_GOLDEN_RULES.md) (15 min)
2. Run `node test_contracts.js` to see current state
3. Open frontend, paste `frontend_spy.js`, perform actions
4. Watch for RED errors in console
5. Fix violations before committing

---

## 🔗 Resources

- **Full Rules**: [API_GOLDEN_RULES.md](./API_GOLDEN_RULES.md)
- **Test Script**: [test_contracts.js](./test_contracts.js)
- **Browser Spy**: [frontend_spy.js](./frontend_spy.js)
- **Manual Testing**: [MANUAL_TEST_PLAN.md](./MANUAL_TEST_PLAN.md)

---

## 💡 Pro Tips

- Run contract tests in CI/CD pipeline
- Keep `frontend_spy.js` active during development
- Add custom schemas: `window.healthlinkSpy.addSchema('/api/endpoint', ['field1'])`
- Test edge cases: missing fields, invalid tokens, duplicate resources

---

**Remember:** These tests catch bugs BEFORE they reach production. Use them! 🚀

---

*Last Updated: December 12, 2025*  
*Questions? Review API_GOLDEN_RULES.md or ask in #healthlink-dev*
