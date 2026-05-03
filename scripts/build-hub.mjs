import { cp, mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const distDir = path.join(rootDir, 'dist')

await rm(distDir, { recursive: true, force: true })
await mkdir(distDir, { recursive: true })

await cp(path.join(rootDir, 'hub', 'index.html'), path.join(distDir, 'index.html'))
await cp(path.join(rootDir, 'hub', 'hub.css'), path.join(distDir, 'hub.css'))
await cp(path.join(rootDir, 'public', 'favicon.svg'), path.join(distDir, 'favicon.svg'))
