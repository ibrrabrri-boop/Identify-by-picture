// Vercel serverless function: receives an image, asks Claude what it is, returns JSON.
// Needs the environment variable ANTHROPIC_API_KEY (set in the Vercel dashboard).

const MODEL = process.env.CLAUDE_MODEL || 'claude-haiku-5-5';
const MAX_BASE64_CHARS = 4 * 1024 * 1024;          // ~3 MB of image data
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const LIMIT = 10, WINDOW_MS = 10 * 60 * 1000;      // 10 requests / 10 min / IP (best effort)
const hits = new Map();

const PROMPT =
  'Identify the main object in the attached image. Reply with ONLY a JSON object, no markdown fences, in this exact shape: ' +
  '{"name":"specific common name of the object","category":"broad category","confidence":"high|medium|low","description":"1-2 sentences describing what it is and what it is used for","details":"1-2 interesting or useful facts, or visible features that support the identification","alternatives":["other possible things it could be, max 3, empty array if certain"]}. ' +
  'If there is no clear object, set name to "No clear object" and explain in description.';

function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter(t => now - t < WINDOW_MS);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > LIMIT;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Server is not configured yet (missing API key).' });
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (rateLimited(ip)) return res.status(429).json({ error: 'Too many requests.' });

  const { image, mediaType } = req.body || {};
  if (typeof image !== 'string' || !image || image.length > MAX_BASE64_CHARS || !ALLOWED.includes(mediaType)) {
    return res.status(400).json({ error: 'Please send a JPEG, PNG, WebP or GIF image under 3 MB.' });
  }

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 700,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
            { type: 'text', text: PROMPT }
          ]
        }]
      })
    });

    if (!r.ok) {
      console.error('Anthropic API error', r.status, await r.text());
      return res.status(502).json({ error: 'The AI service had a problem. Please try again.' });
    }

    const data = await r.json();
    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    const start = text.indexOf('{'), end = text.lastIndexOf('}');
    if (start < 0 || end < start) throw new Error('No JSON in reply');
    const result = JSON.parse(text.slice(start, end + 1));
    return res.status(200).json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not read the AI response. Please try again.' });
  }
};
