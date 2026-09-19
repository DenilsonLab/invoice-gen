import helmet from 'helmet';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Application-wide security headers.
 *
 * The Content-Security-Policy is intentionally split by environment:
 * - In development, Vite's dev server and HMR require 'unsafe-inline' and
 *   'unsafe-eval' for injected scripts/styles, plus websocket/connect access.
 * - In production, the SPA is a pre-built static bundle, so we can drop
 *   'unsafe-eval'. 'unsafe-inline' for styles is kept because Tailwind and
 *   inline style attributes (e.g. brand color) are used throughout the UI.
 *
 * Notes:
 * - img-src allows data: URIs because logos are stored/rendered as base64.
 * - connect-src allows Google's OAuth/userinfo endpoints (called server-side,
 *   but kept permissive for any client-side calls) and the Vite HMR websocket
 *   in development.
 */
const scriptSrc = isProduction
  ? ["'self'"]
  : ["'self'", "'unsafe-inline'", "'unsafe-eval'"];

const styleSrc = ["'self'", "'unsafe-inline'"];

const connectSrc = isProduction
  ? ["'self'", 'https://oauth2.googleapis.com', 'https://www.googleapis.com']
  : ["'self'", 'ws:', 'wss:', 'https://oauth2.googleapis.com', 'https://www.googleapis.com'];

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc,
      styleSrc,
      imgSrc: ["'self'", 'data:', 'blob:'],
      fontSrc: ["'self'", 'data:'],
      connectSrc,
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      // Only upgrade to HTTPS in production; localhost dev uses http.
      upgradeInsecureRequests: isProduction ? [] : null,
    },
  },
  // HSTS is only meaningful over HTTPS; enable it in production.
  strictTransportSecurity: isProduction
    ? { maxAge: 15552000, includeSubDomains: true }
    : false,
  // The OAuth popup flow relies on window.opener + postMessage, so the
  // browsing-context isolation added by COOP would break window.close().
  crossOriginOpenerPolicy: false,
});
