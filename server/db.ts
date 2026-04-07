import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from '../src/db/schema.js'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { mkdirSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dbPath = resolve(__dirname, '..', 'data', 'flx.db')

mkdirSync(dirname(dbPath), { recursive: true })

const client = createClient({
  url: `file:${dbPath}`,
})

export const db = drizzle(client, { schema })
export { schema }
