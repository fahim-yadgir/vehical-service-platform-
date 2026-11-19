import { getCloudflareContext } from "@opennextjs/cloudflare";

// Binding names wrangler.jsonc ke "binding" se match hone chahiye.
export function getCentreDb(): D1Database {
  return getCloudflareContext().env.CENTRE_DB;
}

export function getCustomerDb(): D1Database {
  return getCloudflareContext().env.CUSTOMER_DB;
}