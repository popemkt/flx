import { rm } from 'fs/promises'
import { resolve } from 'path'

export default async function globalSetup() {
  await rm(resolve('.tmp/e2e.db'), { force: true })
}
