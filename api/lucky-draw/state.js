import { getLuckyDrawState, StorageConfigurationError } from '../../lib/lucky-draw-storage.js'

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return response.status(405).json({ error: 'Method not allowed.' })
  }

  response.setHeader('Cache-Control', 'no-store')
  try {
    return response.status(200).json(await getLuckyDrawState())
  } catch (error) {
    console.error('Could not load shared lucky draw state:', error)
    const status = error instanceof StorageConfigurationError ? 503 : 502
    return response.status(status).json({
      error: error instanceof Error ? error.message : 'Could not load shared lucky draw state.',
    })
  }
}
