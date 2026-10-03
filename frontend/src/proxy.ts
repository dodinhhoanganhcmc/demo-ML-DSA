import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Per-request Content-Security-Policy (security-review §5, squirrelscan
 * security/csp).
 *
 * script-src carries a fresh nonce + 'strict-dynamic' and deliberately does
 * NOT contain 'unsafe-inline'/'unsafe-eval' in production — inline framework
 * scripts receive the nonce automatically during dynamic rendering.
 *
 * style-src keeps 'unsafe-inline' on purpose: React renders inline style
 * attributes (the --active / --chip custom properties that color-code the
 * ML-DSA lines) and a nonce cannot cover style attributes. Style injection is
 * not an execution vector; script injection is, and that is what this header
 * locks down.
 */
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${
      isDev ? " 'unsafe-eval'" : ""
    }`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    // Browser talks to the FastAPI backend on :8000; dev needs its ws:// too.
    "connect-src 'self' http://127.0.0.1:8000 http://localhost:8000 ws://127.0.0.1:3000 ws://localhost:3000",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("Content-Security-Policy", csp);

  return response;
}

export const config = {
  // Static assets never execute app scripts; skip them for speed.
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|og.png).*)",
    },
  ],
};
