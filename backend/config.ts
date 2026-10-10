function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

/** Central validated environment access; throws on missing secrets. */
export const config = {
  get nodeEnv() {
    return process.env.NODE_ENV ?? 'development';
  },
  get databaseUrl() {
    return required('DATABASE_URL');
  },
  get jwtAccessSecret() {
    return required('JWT_ACCESS_SECRET');
  },
  get jwtRefreshSecret() {
    return required('JWT_REFRESH_SECRET');
  },
  get jwtAccessTtl() {
    return process.env.JWT_ACCESS_TTL ?? '15m';
  },
  get jwtRefreshTtl() {
    return process.env.JWT_REFRESH_TTL ?? '7d';
  },
  get jwtApplicantAccessSecret() {
    return required('JWT_APPLICANT_ACCESS_SECRET');
  },
  get jwtApplicantRefreshSecret() {
    return required('JWT_APPLICANT_REFRESH_SECRET');
  },
  get jwtApplicantAccessTtl() {
    return process.env.JWT_APPLICANT_ACCESS_TTL ?? '2h';
  },
  get jwtApplicantRefreshTtl() {
    return process.env.JWT_APPLICANT_REFRESH_TTL ?? '7d';
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
        // the portals, by subdomain, in development (browsers resolve *.localhost locally)
        ...['staff', 'grades', 'cms', 'management', 'teachers', 'students', 'lms'].map(
          (p) => `http://${p}.localhost:5173`,
        ),
      ];
    }
    return raw
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
  },
};
