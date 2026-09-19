/**
 * Minimal server-side logging helper.
 *
 * Route handlers historically swallowed errors and returned a bare 500, which
 * made production issues impossible to diagnose. `logError` gives every catch
 * block a consistent, greppable log line that includes the operation context
 * and the underlying error.
 *
 * This is intentionally console-based so it works unchanged in both the
 * long-lived dev server and Vercel's serverless environment (where stderr is
 * captured into the function logs). It can later be swapped for a structured
 * logger without touching call sites.
 */
export const logError = (context: string, error: unknown): void => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  console.error(`[error] ${context}:`, message);
};
