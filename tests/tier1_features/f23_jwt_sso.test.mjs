// opentimetable/tests/tier1_features/f23_jwt_sso.test.mjs
// Tier 1 - Feature 23: JWT & SSO Integration (Min 5 tests)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { JwtAuthManager, SisRoles } from '../helpers/sis-engine.mjs';

describe('Tier 1 - Feature 23: JWT & SSO Integration', () => {
  const jwt = new JwtAuthManager('test_secret_for_jwt_sso_suite');

  it('T1.F23.1: Generates valid HS256 signed JWT token', () => {
    const payload = { sub: 'usr_101', role: SisRoles.ADMIN, org: 'Faculty of Sciences' };
    const token = jwt.generateToken(payload, 3600);
    assert.strictEqual(typeof token, 'string');
    assert.strictEqual(token.split('.').length, 3);
  });

  it('T1.F23.2: Verifies valid JWT token and decodes payload correctly', () => {
    const payload = { sub: 'usr_102', role: SisRoles.TEACHER, teacherId: 'T_1001' };
    const token = jwt.generateToken(payload, 3600);
    const result = jwt.verifyToken(token);

    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.payload.sub, 'usr_102');
    assert.strictEqual(result.payload.role, SisRoles.TEACHER);
  });

  it('T1.F23.3: Rejects JWT token with tampered signature', () => {
    const payload = { sub: 'usr_103', role: SisRoles.STUDENT };
    const token = jwt.generateToken(payload, 3600);
    const tampered = token.slice(0, -5) + 'AAAAA';
    const result = jwt.verifyToken(tampered);

    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.error, 'Invalid JWT signature');
  });

  it('T1.F23.4: Rejects expired JWT token', () => {
    const payload = { sub: 'usr_104', role: SisRoles.STAFF };
    // Set expiration to negative seconds (already expired)
    const expiredToken = jwt.generateToken(payload, -10);
    const result = jwt.verifyToken(expiredToken);

    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.expired, true);
  });

  it('T1.F23.5: Validates SSO claims mapping (sub, email, roles, issuer)', () => {
    const ssoPayload = {
      iss: 'https://auth.university.edu/oidc',
      sub: 'saml_univ_user_9921',
      email: 'ahmed.alami@univ.edu',
      role: SisRoles.DEPT_HEAD,
      deptId: 'DEPT_MATH',
    };
    const token = jwt.generateToken(ssoPayload, 1800);
    const result = jwt.verifyToken(token);

    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.payload.iss, 'https://auth.university.edu/oidc');
    assert.strictEqual(result.payload.deptId, 'DEPT_MATH');
  });
});
