function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

/** A PEM key from the env; env files hold one line, so `\n` stands for a line break. */
function pem(name: string): string {
  return required(name).replace(/\\n/g, '\n');
}

/** Central validated environment access; throws on missing secrets. */
export const config = {
  get nodeEnv() {
    return process.env.NODE_ENV ?? 'development';
  },
  get databaseUrl() {
    return required('DATABASE_URL');
  },
  /** Signs access tokens (ES256). Only this service holds it. */
  get jwtAccessPrivateKey() {
    return pem('JWT_ACCESS_PRIVATE_KEY');
  },
  /** Names the signing key in each token's `kid`, so a key can be rotated. */
  get jwtAccessKid() {
    return required('JWT_ACCESS_KID');
  },
  /**
   * The public keys access tokens verify against, by `kid`: the current key,
   * plus the previous one while its tokens are still alive after a rotation.
   * Every service that verifies tokens (the LMS too) holds the same set.
   */
  get jwtAccessPublicKeys(): ReadonlyMap<string, string> {
    const keys = new Map([[this.jwtAccessKid, pem('JWT_ACCESS_PUBLIC_KEY')]]);
    const previousKid = process.env.JWT_ACCESS_PREVIOUS_KID;
    if (previousKid)
      keys.set(previousKid, pem('JWT_ACCESS_PREVIOUS_PUBLIC_KEY'));
    return keys;
  },
  get jwtRefreshSecret() {
    return required('JWT_REFRESH_SECRET');
  },
  /** Turns on the LMS's publication and replicator role; unset, neither is made. */
  get lmsReplicationPassword(): string | undefined {
    return process.env.LMS_REPLICATION_PASSWORD || undefined;
  },
  get jwtAccessTtl() {
    return process.env.JWT_ACCESS_TTL ?? '15m';
  },
  get jwtRefreshTtl() {
    return process.env.JWT_REFRESH_TTL ?? '7d';
  },
  /**
   * Whether auth cookies carry the Secure flag. Defaults to true in
   * production; override with COOKIE_SECURE=false for plain-http deploys
   * (browsers and curl refuse Secure cookies over http).
   */
  get cookieSecure() {
    if (process.env.COOKIE_SECURE !== undefined) {
      return process.env.COOKIE_SECURE === 'true';
    }
    return this.nodeEnv === 'production';
  },
  /**
   * Origins allowed to call the API: every sign-in portal's host and the public
   * website. Comma-separated in CORS_ORIGINS; the defaults cover local development.
   */
  get corsOrigins(): string[] {
    const raw = process.env.CORS_ORIGINS;
    if (!raw?.trim()) {
      return [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:3000',
        'http://localhost:4000',
        // the LMS front end
        'http://localhost:5180',
        // the portals, by subdomain, in development (browsers resolve *.localhost locally)
        ...[
          'staff',
          'grades',
          'cms',
          'management',
          'teachers',
          'students',
          'lms',
        ].map((p) => `http://${p}.localhost:5173`),
      ];
    }
    return raw
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
  },
};
