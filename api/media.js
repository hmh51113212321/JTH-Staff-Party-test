import { Buffer } from 'node:buffer'
import process from 'node:process'

const videoExtensions = new Set(['mp4', 'mov', 'webm'])

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return response.status(405).json({ error: 'Method not allowed.' })
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  if (!cloudName || !apiKey || !apiSecret) {
    return response.status(503).json({
      error: 'Configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in Vercel.',
    })
  }

  try {
    const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')
    const resourceTypes = ['image', 'video']
    const results = await Promise.all(resourceTypes.map(async (resourceType) => {
      const cloudinaryResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/resources/${resourceType}/tags/lucky-prize?max_results=500&direction=desc`,
        { headers: { Authorization: `Basic ${credentials}` } },
      )
      const result = await cloudinaryResponse.json()
      if (!cloudinaryResponse.ok) {
        console.error(`Cloudinary ${resourceType} media lookup failed:`, result.error?.message)
        throw new Error('Cloudinary could not load prize media.')
      }
      return result.resources ?? []
    }))
    const mediaByTicket = {}
    for (const resource of results.flat()) {
      const match = resource.public_id.match(/^prizes\/(\d{3})\//)
      if (!match) {
        continue
      }

      const ticketNumber = match[1]
      const current = mediaByTicket[ticketNumber]
      if (!current || new Date(resource.created_at) > new Date(current.uploadedAt)) {
        mediaByTicket[ticketNumber] = {
          src: resource.secure_url,
          type: resource.resource_type === 'video' || videoExtensions.has(resource.format)
            ? 'video'
            : 'image',
          uploadedAt: resource.created_at,
        }
      }
    }

    response.setHeader('Cache-Control', 'no-store')
    return response.status(200).json({ mediaByTicket })
  } catch (error) {
    console.error('Could not list Cloudinary prize media:', error)
    return response.status(502).json({ error: 'Could not load uploaded prize media.' })
  }
}
