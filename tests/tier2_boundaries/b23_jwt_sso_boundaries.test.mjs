// opentimetable/tests/tier2_boundaries/b23_jwt_sso_boundaries.test.mjs
// Tier 2 - Boundary & Corner Cases: Feature 23 (JWT & SSO Integration)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { JwtAuthManager } from '../helpers/sis-engine.mjs';

describe('Tier 2 - Boundary: Feature 23 (JWT & SSO Integration)', () => {
  const jwt = new JwtAuthManager('boundary_test_secret_key');

  it('T2.B23.1: Exact expiration boundary: token expired by 1 second fails validation', () => {
    // Generate token with negative expiresInSec (-1)
    const expiredToken = jwt.generateToken({ sub: 'user_1', role: 'STUDENT' }, -1);
    const result = jwt.verifyToken(expiredToken);

    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.expired, true);
    assert.match(result.error, /expired/i);
  });

  it('T2.B23.2: Valid future token passes validation and extracts correct claims', () => {
    const validToken = jwt.generateToken({ sub: 'admin_1', role: 'ADMIN', schoolId: 'SCH_001' }, 3600);
    const result = jwt.verifyToken(validToken);

    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.payload.sub, 'admin_1');
    assert.strictEqual(result.payload.role, 'ADMIN');
  });

  it('T2.B23.3: Secret mismatch boundary: token signed with foreign secret fails verification', () => {
    const foreignJwt = new JwtAuthManager('foreign_attacker_secret');
    const foreignToken = foreignJwt.generateToken({ sub: 'admin_imposter', role: 'ADMIN' }, 3600);

    const result = jwt.verifyToken(foreignToken);
    assert.strictEqual(result.valid, false);
    assert.match(result.error, /invalid jwt signature/i);
  });

  it('T2.B23.4: Structural format boundary: rejects tokens missing dot-delimited segments', () => {
    assert.strictEqual(jwt.verifyToken('only_one_part').valid, false);
    assert.strictEqual(jwt.verifyToken('header.payload').valid, false); // missing signature
    assert.strictEqual(jwt.verifyToken('a.b.c.d').valid, false); // 4 parts
  });

  it('T2.B23.5: Payload corruption boundary: malformed base64url payload segment handled safely', () => {
    const validToken = jwt.generateToken({ sub: 'user_1' }, 3600);
    const [header, , sig] = validToken.split('.');
    const corruptedToken = `${header}.%%%corrupted_not_json%%%.${sig}`;

    const result = jwt.verifyToken(corruptedToken);
    assert.strictEqual(result.valid, false);
    assert.ok(result.error !== undefined);
  });
});
