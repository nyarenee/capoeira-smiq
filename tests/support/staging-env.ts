function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Integration/E2E tests run against the staging environment — ` +
        `populate .env.staging-test (see README.md "Staging") and run via npm run test:integration / test:e2e.`
    );
  }
  return value;
}

export const STAGING_URL = required("STAGING_URL").replace(/\/$/, "");
export const STAGING_DATABASE_URL = required("STAGING_DATABASE_URL");
export const STAGING_API_AUTH_TOKEN = required("STAGING_API_AUTH_TOKEN");
