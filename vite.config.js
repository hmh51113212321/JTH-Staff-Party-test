import { Buffer } from 'node:buffer'
import { mkdir, readdir, stat, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const mediaDirectory = path.resolve('src/assets/images')
const mediaExtensions = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'mp4', 'webm', 'mov'])
function luckyDrawSync() {
  const validTicketNumbers = new Set(
    Array.from({ length: 111 }, (_, index) => String(index + 1).padStart(3, '0')),
  )
  let state = {
    selectedTicketNumber: null,
    lockedTicketNumbers: [],
    itemNames: {},
    revision: 0,
  }

  return {
    name: 'lucky-draw-sync',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const pathname = new URL(request.url, 'http://localhost').pathname
        if (pathname === '/api/media' && request.method === 'GET') {
          response.setHeader('Cache-Control', 'no-store')
          response.setHeader('Content-Type', 'application/json')
          try {
            const files = await readdir(mediaDirectory)
            const mediaByTicket = {}
            for (const fileName of files) {
              const match = fileName.match(/^(\d{3})(?:-(\d+))?\.([^.]+)$/)
              const extension = match?.[3]?.toLowerCase()
              if (!match || !mediaExtensions.has(extension)) {
                continue
              }
              const filePath = path.join(mediaDirectory, fileName)
              const fileInfo = await stat(filePath)
              const previous = mediaByTicket[match[1]]
              if (!previous || fileInfo.mtimeMs > previous.updatedAt) {
                mediaByTicket[match[1]] = {
                  src: `/src/assets/images/${encodeURIComponent(fileName)}?v=${fileInfo.mtimeMs}`,
                  type: extension === 'mp4' || extension === 'webm' || extension === 'mov'
                    ? 'video'
                    : 'image',
                  updatedAt: fileInfo.mtimeMs,
                }
              }
            }
            response.end(JSON.stringify({ mediaByTicket }))
          } catch (error) {
            response.statusCode = 500
            response.end(JSON.stringify({
              error: error instanceof Error ? error.message : 'Could not read prize media.',
            }))
          }
          return
        }

        if (pathname === '/api/media/upload' && request.method === 'POST') {
          response.setHeader('Cache-Control', 'no-store')
          response.setHeader('Content-Type', 'application/json')
          const ticketNumber = request.headers['x-ticket-number']
          const extension = String(request.headers['x-file-extension'] ?? '').toLowerCase()
          if (!/^\d{3}$/.test(ticketNumber) || !validTicketNumbers.has(ticketNumber)) {
            response.statusCode = 400
            response.end(JSON.stringify({ error: 'Invalid lucky number.' }))
            return
          }
          if (!mediaExtensions.has(extension)) {
            response.statusCode = 415
            response.end(JSON.stringify({ error: 'Choose a supported image or video file.' }))
            return
          }

          try {
            const chunks = []
            let size = 0
            for await (const chunk of request) {
              size += chunk.length
              if (size > 100 * 1024 * 1024) {
                response.statusCode = 413
                response.end(JSON.stringify({ error: 'Local uploads must be smaller than 100 MB.' }))
                return
              }
              chunks.push(chunk)
            }
            if (size === 0) {
              response.statusCode = 400
              response.end(JSON.stringify({ error: 'The selected file is empty.' }))
              return
            }

            await mkdir(mediaDirectory, { recursive: true })
            const fileName = `${ticketNumber}-${Date.now()}.${extension}`
            const filePath = path.join(mediaDirectory, fileName)
            await writeFile(filePath, Buffer.concat(chunks), { flag: 'wx' })
            const previousUploads = (await readdir(mediaDirectory)).filter(
              (name) => name !== fileName
                && new RegExp(`^${ticketNumber}-\\d+\\.[^.]+$`).test(name),
            )
            await Promise.all(previousUploads.map((name) => unlink(path.join(mediaDirectory, name))))
            response.end(JSON.stringify({
              ticketNumber,
              media: {
                src: `/src/assets/images/${encodeURIComponent(fileName)}?v=${Date.now()}`,
                type: extension === 'mp4' || extension === 'webm' || extension === 'mov'
                  ? 'video'
                  : 'image',
              },
            }))
          } catch (error) {
            response.statusCode = 500
            response.end(JSON.stringify({
              error: error instanceof Error ? error.message : 'Could not save prize media.',
            }))
          }
          return
        }

        if (!pathname.startsWith('/api/lucky-draw/')) {
          next()
          return
        }

        response.setHeader('Cache-Control', 'no-store')
        response.setHeader('Content-Type', 'application/json')

        if (pathname === '/api/lucky-draw/state' && request.method === 'GET') {
          response.end(JSON.stringify(state))
          return
        }

        if (pathname !== '/api/lucky-draw/action' || request.method !== 'POST') {
          response.statusCode = 404
          response.end(JSON.stringify({ error: 'Unknown lucky draw endpoint' }))
          return
        }

        try {
          let body = ''
          for await (const chunk of request) {
            body += chunk
            if (body.length > 1024) {
              response.statusCode = 413
              response.end(JSON.stringify({ error: 'Request is too large' }))
              return
            }
          }

          const action = JSON.parse(body)
          if (action.type === 'select' && validTicketNumbers.has(action.ticketNumber)) {
            state = {
              selectedTicketNumber: action.ticketNumber,
              lockedTicketNumbers: [...new Set([...state.lockedTicketNumbers, action.ticketNumber])],
              itemNames: state.itemNames,
              revision: state.revision + 1,
            }
          } else if (action.type === 'restart' && validTicketNumbers.has(action.ticketNumber)) {
            state = {
              selectedTicketNumber: state.selectedTicketNumber === action.ticketNumber
                ? null
                : state.selectedTicketNumber,
              lockedTicketNumbers: state.lockedTicketNumbers.filter(
                (ticketNumber) => ticketNumber !== action.ticketNumber,
              ),
              itemNames: state.itemNames,
              revision: state.revision + 1,
            }
          } else if (action.type === 'reset') {
            state = {
              selectedTicketNumber: null,
              lockedTicketNumbers: [],
              itemNames: state.itemNames,
              revision: state.revision + 1,
            }
          } else if (
            action.type === 'rename'
            && validTicketNumbers.has(action.ticketNumber)
            && typeof action.itemName === 'string'
            && action.itemName.trim().length > 0
            && action.itemName.trim().length <= 80
          ) {
            state = {
              ...state,
              itemNames: { ...state.itemNames, [action.ticketNumber]: action.itemName.trim() },
              revision: state.revision + 1,
            }
          } else {
            response.statusCode = 400
            response.end(JSON.stringify({ error: 'Invalid lucky draw action' }))
            return
          }

          response.end(JSON.stringify(state))
        } catch (error) {
          response.statusCode = 400
          response.end(JSON.stringify({
            error: error instanceof SyntaxError ? 'Invalid JSON request' : 'Could not process action',
          }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), luckyDrawSync()],
  server: {
    host: '0.0.0.0',
  },
})
