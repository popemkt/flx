import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from '../src/db/schema.js'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { mkdirSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dbPath = process.env.FLX_DB_PATH
  ? resolve(process.cwd(), process.env.FLX_DB_PATH)
  : resolve(__dirname, '..', 'data', 'flx.db')

mkdirSync(dirname(dbPath), { recursive: true })

const client = createClient({
  url: `file:${dbPath}`,
})

async function ensureDbReady() {
  await client.execute('PRAGMA foreign_keys = ON')
  await client.execute(`
    CREATE TABLE IF NOT EXISTS canvases (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      viewport_x REAL NOT NULL DEFAULT 0,
      viewport_y REAL NOT NULL DEFAULT 0,
      viewport_zoom REAL NOT NULL DEFAULT 1,
      snap_to_grid INTEGER NOT NULL DEFAULT 1,
      grid_size INTEGER NOT NULL DEFAULT 20,
      is_active INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)
  await client.execute(`
    CREATE TABLE IF NOT EXISTS workflows (
      id TEXT PRIMARY KEY NOT NULL,
      canvas_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      position_x REAL NOT NULL DEFAULT 0,
      position_y REAL NOT NULL DEFAULT 0,
      color TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (canvas_id) REFERENCES canvases(id) ON DELETE CASCADE
    )
  `)
  await client.execute(`
    CREATE TABLE IF NOT EXISTS workflow_nodes (
      id TEXT PRIMARY KEY NOT NULL,
      workflow_id TEXT NOT NULL,
      node_type_id TEXT NOT NULL,
      label TEXT NOT NULL,
      position_x REAL NOT NULL DEFAULT 0,
      position_y REAL NOT NULL DEFAULT 0,
      width REAL,
      height REAL,
      config TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
    )
  `)
  await client.execute(`
    CREATE TABLE IF NOT EXISTS edges (
      id TEXT PRIMARY KEY NOT NULL,
      workflow_id TEXT NOT NULL,
      source_node_id TEXT NOT NULL,
      source_port_id TEXT NOT NULL,
      target_node_id TEXT NOT NULL,
      target_port_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
      FOREIGN KEY (source_node_id) REFERENCES workflow_nodes(id) ON DELETE CASCADE,
      FOREIGN KEY (target_node_id) REFERENCES workflow_nodes(id) ON DELETE CASCADE
    )
  `)
  await client.execute(`
    CREATE TABLE IF NOT EXISTS node_types (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      source TEXT NOT NULL,
      file_path TEXT,
      dsl_definition TEXT,
      icon TEXT,
      color TEXT,
      default_config TEXT,
      ports_definition TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)
  await client.execute(`
    CREATE TABLE IF NOT EXISTS execution_history (
      id TEXT PRIMARY KEY NOT NULL,
      workflow_id TEXT,
      status TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      completed_at INTEGER,
      duration_ms INTEGER,
      trigger_type TEXT NOT NULL,
      node_results TEXT,
      error TEXT,
      created_at INTEGER NOT NULL
    )
  `)
}

export const db = drizzle(client, { schema })
export const dbReady = ensureDbReady()
export { schema }
