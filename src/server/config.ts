/**
 * Centralized server configuration.
 *
 * Environment variables are read and validated once here, instead of being
 * re-derived in every route module. This removes the duplicated JWT_SECRET
 * blocks that previously lived in each router and gives a single place to
 * reason about required-vs-optional config.
 */

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Secret used to sign/verify auth JWTs. In production it must be provided;
 * outside production we fall back to a well-known dev value for convenience.
 */
export const JWT_SECRET: string = (() => {
  const secret = process.env.JWT_SECRET || (isProduction ? '' : 'super-secret-key-for-dev');
  if (!secret) {
    throw new Error('JWT_SECRET is required in production');
  }
  return secret;
})();

export { isProduction };
