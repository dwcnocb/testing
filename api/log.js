// /api/log.js
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Extract event data from frontend
    const { event, data, time } = req.body || {}

    // Capture user IP safely (works locally & on Vercel)
    const ip =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      'unknown'

    // Construct log object
    const logData = {
      time: time || new Date().toISOString(),
      ip,
      event: event || 'Unknown event',
      data: data || {},
    }

    // Print neatly in your terminal or Vercel function logs
    console.log('─────────────────────────────')
    console.log(`📦 [${logData.time}] ${logData.event}`)
    console.log(`🌍 IP: ${logData.ip}`)
    if (Object.keys(logData.data).length > 0) {
      console.log('🧾 Data:', JSON.stringify(logData.data, null, 2))
    }
    console.log('─────────────────────────────\n')

    // (Optional) In future: save to DB, Google Sheet, Firebase, etc.
    // await saveToDatabase(logData)

    // Acknowledge
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('❌ Log handler error:', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}
