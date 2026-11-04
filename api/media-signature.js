import { Buffer } from 'node:buffer'
import { createHash, timingSafeEqual } from 'node:crypto'
import process from 'node:process'

const allowedResourceTypes = new Set(['image', 'video'])

function isAuthorized(token) {
  const expectedToken = process.env.ADMIN_UPLOAD_TOKEN
  if (!expectedToken || typeof token !== 'string') {
    return false
  }

  const actual = Buffer.from(token)
  const expected = Buffer.from(expectedToken)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return response.status(405).json({ error: 'Method not allowed.' })
  }

  const { ticketNumber, uploadToken, resourceType } = request.body ?? {}
  if (!isAuthorized(uploadToken)) {
    return response.status(401).json({ error: 'Upload authorization failed. Check ADMIN_UPLOAD_TOKEN in Vercel.' })
  }
  if (!/^\d{3}$/.test(ticketNumber) || Number(ticketNumber) < 1 || Number(ticketNumber) > 111) {
    return response.status(400).json({ error: 'Invalid lucky number for this upload.' })
  }
  if (!allowedResourceTypes.has(resourceType)) {
    return response.status(400).json({ error: 'Choose a supported image or video file.' })
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  if (!cloudName || !apiKey || !apiSecret) {
    return response.status(503).json({
      error: 'Configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in Vercel.',
    })
  }

  const timestamp = Math.floor(Date.now() / 1000)
  const publicId = `prizes/${ticketNumber}/${Date.now()}`
  const tags = `lucky-prize,lucky-number-${ticketNumber}`
  const signatureParameters = { public_id: publicId, tags, timestamp }
  const signatureInput = Object.keys(signatureParameters)
    .sort()
    .map((key) => `${key}=${signatureParameters[key]}`)
    .join('&')
  const signature = createHash('sha1')
    .update(`${signatureInput}${apiSecret}`)
    .digest('hex')

  response.setHeader('Cache-Control', 'no-store')
  return response.status(200).json({
    cloudName,
    apiKey,
    publicId,
    resourceType,
    tags,
    timestamp,
    signature,
  })
}
