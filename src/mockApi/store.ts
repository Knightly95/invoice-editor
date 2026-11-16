import { createSeedDb } from './seed'
import type { DbStore, MockDb } from './types'

const STORAGE_KEY = 'invoice-editor:mock-db:v1'

/** Volatile store — used by tests and as a fallback when storage is blocked. */
export function createMemoryStore(initial: MockDb = createSeedDb()): DbStore {
  let db = initial
  return {
    read: () => db,
    write: (next) => {
      db = next
    },
  }
}

/**
 * Store persisted in `localStorage`, so data created in the demo survives a
 * page reload. Falls back to memory if storage is unavailable or corrupt.
 */
export function createLocalStorageStore(): DbStore {
  const memory = createMemoryStore()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) memory.write(JSON.parse(raw) as MockDb)
  } catch {
    // ignore — the seeded in-memory db is used instead
  }
  return {
    read: memory.read,
    write: (next) => {
      memory.write(next)
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // ignore — data stays in memory for this session
      }
    },
  }
}

/** Wipes persisted demo data; the next page load starts from the seed. */
export function resetMockDb(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
