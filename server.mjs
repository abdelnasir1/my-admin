import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const port = Number(process.env.PORT || 3000)
const distDirectory = join(fileURLToPath(new URL('.', import.meta.url)), 'dist')
const verificationUrl = process.env.VERIFICATION_INTERNAL_URL || 'https://verify.maazplatform.tech/verify/storage'

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(body))
}

async function serveFile(request, response) {
  const requestedPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
  const relativePath = requestedPath === '/' ? '/index.html' : requestedPath
  const filePath = normalize(join(distDirectory, relativePath))

  if (!filePath.startsWith(distDirectory)) {
    sendJson(response, 404, { error: 'Not found' })
    return
  }

  try {
    const fileStats = await stat(filePath)
    if (!fileStats.isFile()) throw new Error('Not a file')

    response.writeHead(200, {
      'Content-Type': contentTypes[extname(filePath)] || 'application/octet-stream',
    })
    createReadStream(filePath).pipe(response)
  } catch {
    const indexPath = join(distDirectory, 'index.html')
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    createReadStream(indexPath).pipe(response)
  }
}

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url, 'http://localhost')

  if (requestUrl.pathname === '/verify/storage') {
    if (request.method === 'OPTIONS') {
      response.writeHead(204)
      response.end()
      return
    }

    if (request.method !== 'POST') {
      sendJson(response, 405, { error: 'Method not allowed' })
      return
    }

    try {
      const chunks = []
      for await (const chunk of request) chunks.push(chunk)
      const body = Buffer.concat(chunks)
      const upstreamResponse = await fetch(verificationUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      })
      const responseBody = await upstreamResponse.arrayBuffer()

      response.writeHead(upstreamResponse.status, {
        'Content-Type': upstreamResponse.headers.get('content-type') || 'application/json',
      })
      response.end(Buffer.from(responseBody))
    } catch (error) {
      sendJson(response, 502, {
        error: error instanceof Error ? error.message : 'Verification service unavailable',
      })
    }
    return
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    sendJson(response, 405, { error: 'Method not allowed' })
    return
  }

  await serveFile(request, response)
})

server.listen(port, '0.0.0.0', () => {
  console.log(`Dashboard server listening on port ${port}`)
  console.log(`Verification upstream: ${verificationUrl}`)
})
