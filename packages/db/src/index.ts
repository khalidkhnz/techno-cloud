export * from "./schema.js";
export * from "./client.js";

// Re-export common query operators so consumers don't need a direct drizzle-orm dep.
export { eq, and, or, ne, inArray, desc, asc, sql } from "drizzle-orm";
