// Shared base64url / text helpers for auth (Worker WebCrypto compatible).

export function base64UrlToBytes(input) {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function bytesToBase64Url(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64UrlToString(input) {
  return new TextDecoder().decode(base64UrlToBytes(input));
}

export function stringToBase64Url(input) {
  return bytesToBase64Url(new TextEncoder().encode(input));
}

export function decodeJwtPart(part) {
  try {
    return JSON.parse(base64UrlToString(part));
  } catch (e) {
    return null;
  }
}
