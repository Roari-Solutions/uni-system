function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const config = {
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
};
