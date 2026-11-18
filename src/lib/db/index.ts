import type { DataStore } from "./store";
import { demoStore } from "./demo-store";
import { SupabaseStore } from "./supabase-store";

interface GlobalWithDb {
  __mozoutDb?: DataStore;
}

function createStore(): DataStore {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (url && serviceKey) {
    return new SupabaseStore(url, serviceKey);
  }
  return demoStore;
}

const g = globalThis as GlobalWithDb;
if (!g.__mozoutDb) g.__mozoutDb = createStore();

export const db: DataStore = g.__mozoutDb;

export function dataMode(): "demo" | "supabase" {
  return db.mode;
}
