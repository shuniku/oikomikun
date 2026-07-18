/**
 * E2E テスト用の最小静的サーバー（依存パッケージなし・Node 組み込みのみ）。
 * リポジトリルートを http://127.0.0.1:8788 で配信する。
 */
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const PORT = 8788
const ROOT = fileURLToPath(new URL('..', import.meta.url))

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json',
}

createServer(async (request, response) => {
  try {
    const urlPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
    const relativePath = urlPath.endsWith('/') ? `${urlPath}index.html` : urlPath
    const filePath = join(ROOT, normalize(relativePath))

    if (!filePath.startsWith(ROOT)) {
      response.writeHead(403).end()
      return
    }

    const body = await readFile(filePath)
    const contentType = MIME_TYPES[extname(filePath)] ?? 'application/octet-stream'
    response.writeHead(200, { 'Content-Type': contentType }).end(body)
  } catch {
    response.writeHead(404).end('Not Found')
  }
}).listen(PORT, '127.0.0.1', () => {
  console.log(`serving on http://127.0.0.1:${PORT}`)
})
