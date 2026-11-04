import {
  applyLuckyDrawAction,
  isValidTicketNumber,
  StorageConfigurationError,
} from '../../lib/lucky-draw-storage.js'

function parseAction(body) {
  if (typeof body === 'string') {
    try {
      return JSON.parse(body)
    } catch {
      return null
    }
  }
  return body
}

function isValidAction(action) {
  if (!action || typeof action !== 'object') {
    return false
  }
  if (action.type === 'reset') {
    return true
  }
  if (action.type === 'rename') {
    return isValidTicketNumber(action.ticketNumber)
      && typeof action.itemName === 'string'
      && action.itemName.trim().length > 0
      && action.itemName.trim().length <= 80
  }
  return (action.type === 'select' || action.type === 'restart')
    && isValidTicketNumber(action.ticketNumber)
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return response.status(405).json({ error: 'Method not allowed.' })
  }

  response.setHeader('Cache-Control', 'no-store')
  const action = parseAction(request.body)
  if (!isValidAction(action)) {
    return response.status(400).json({ error: 'Invalid lucky draw action.' })
  }

  try {
    return response.status(200).json(await applyLuckyDrawAction(action))
  } catch (error) {
    console.error('Could not update shared lucky draw state:', error)
    const status = error instanceof StorageConfigurationError ? 503 : 502
    return response.status(status).json({
      error: error instanceof Error ? error.message : 'Could not update shared lucky draw state.',
    })
  }
}
