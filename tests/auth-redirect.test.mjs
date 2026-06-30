import test from "node:test";
import assert from "node:assert/strict";
import { shouldAttemptAutoLogin } from "../src/frontend/lib/auth-redirect.js";

test("does not auto-redirect when only a Supabase session exists", () => {
  assert.equal(shouldAttemptAutoLogin(true, false), false);
});

test("auto-redirects when both Supabase and server sessions are available", () => {
  assert.equal(shouldAttemptAutoLogin(true, true), true);
});
