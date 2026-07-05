import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveSigningSecret } from '../src/backend/auth/session.js';

test('resolveSigningSecret uses JWT_SECRET when provided', () => {
  assert.equal(resolveSigningSecret({ JWT_SECRET: 'abc123' }), 'abc123');
});

test('resolveSigningSecret falls back to JWT when JWT_SECRET is missing', () => {
  assert.equal(resolveSigningSecret({ JWT: 'fallback-secret' }), 'fallback-secret');
});
