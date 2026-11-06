// apps/web/src/services/sis/auth.ts
// JWT Token Generation, Verification & Role Scoping for OpenTimetable SIS

import crypto from 'node:crypto';
import { SisRole } from './roles';

export interface JwtUserPayload {
  userId: string;
  username: string;
  role: SisRole;
  scope?: string[];
  [key: string]: unknown;
}

export interface JwtVerifyResult {
  valid: boolean;
  payload?: JwtUserPayload;
  error?: string;
  expired?: boolean;
}

export class JwtAuthManager {
  private secret: string;

  constructor(secret = 'opentimetable_jwt_secret_key_super_secure_2026') {
    this.secret = secret;
  }

  generateToken(payload: JwtUserPayload, expiresInSec = 3600): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const fullPayload = {
      ...payload,
      iat: now,
      exp: now + expiresInSec,
    };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', this.secret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  verifyToken(token: string): JwtVerifyResult {
    if (!token || typeof token !== 'string') {
      return { valid: false, error: 'Token missing or invalid' };
    }
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Malformed JWT structure' };
    }

    const [encodedHeader, encodedPayload, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', this.secret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');

    if (signature !== expectedSig) {
      return { valid: false, error: 'Invalid JWT signature' };
    }

    let payload: JwtUserPayload & { exp?: number; iat?: number };
    try {
      payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    } catch {
      return { valid: false, error: 'Corrupt payload decoding' };
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return { valid: false, error: 'Token has expired', expired: true };
    }

    return { valid: true, payload };
  }
}
