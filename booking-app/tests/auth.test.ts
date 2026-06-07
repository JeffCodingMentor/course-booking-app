/**
 * @jest-environment node
 */
import { POST as loginPost } from '../app/api/auth/login/route';
import { POST as registerPost } from '../app/api/auth/register/route';
import { GET as validateGet } from '../app/api/auth/validate-companion/route';
import { getDB } from '../lib/db';

describe('Auth API Routes', () => {
  beforeEach(async () => {
    const db = getDB();
    await db.del('student:張三:20180815');
    await db.srem('registered_students', '張三');
  });

  it('should fail login if student is not registered', async () => {
    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '張三', birthday: '20180815', parentPhone: '0912345678' })
    });
    const res = await loginPost(req);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe('not_registered');
  });

  it('should register a new student and then succeed login', async () => {
    const regReq = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '張三', birthday: '20180815', parentPhone: '0912345678' })
    });
    const regRes = await registerPost(regReq);
    const regData = await regRes.json();
    expect(regData.success).toBe(true);

    const logReq = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '張三', birthday: '20180815', parentPhone: '0912345678' })
    });
    const logRes = await loginPost(logReq);
    const logData = await logRes.json();
    expect(logData.success).toBe(true);
    expect(logData.user.name).toBe('張三');
  });

  it('should validate if companion is registered', async () => {
    // Validate non-registered companion
    const valReq1 = new Request('http://localhost/api/auth/validate-companion?name=張三');
    const valRes1 = await validateGet(valReq1);
    const valData1 = await valRes1.json();
    expect(valData1.valid).toBe(false);

    // Register companion
    const regReq = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '張三', birthday: '20180815', parentPhone: '0912345678' })
    });
    await registerPost(regReq);

    // Validate registered companion
    const valReq2 = new Request('http://localhost/api/auth/validate-companion?name=張三');
    const valRes2 = await validateGet(valReq2);
    const valData2 = await valRes2.json();
    expect(valData2.valid).toBe(true);
  });
});
