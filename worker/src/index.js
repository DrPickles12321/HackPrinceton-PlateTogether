import { createRemoteJWKSet, jwtVerify } from 'jose'

const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/robot/v1/metadata/jwk/securetoken@system.gserviceaccount.com')
)

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

// Map a USDA FoodData Central foodCategory to our coarse food group, matching
// the plate_zone values used by the local nutrition data (grain/produce/
// protein/dairy/mixed).
function mapCategoryToGroup(cat) {
  const c = (typeof cat === 'string' ? cat : cat?.description || '').toLowerCase()
  if (!c) return 'mixed'
  if (c.includes('fruit')) return 'produce'
  if (c.includes('vegetable')) return 'produce'
  if (c.includes('grain') || c.includes('pasta') || c.includes('bread') || c.includes('baked') || c.includes('cereal')) return 'grain'
  if (c.includes('dairy') || c.includes('egg')) return 'dairy'
  if (/poultry|beef|pork|lamb|veal|sausage|luncheon|fish|shellfish|legume|nut|seed|meat/.test(c)) return 'protein'
  return 'mixed'
}

async function handleFoodSearch(query, env) {
  if (!env.USDA_API_KEY) return json({ error: 'USDA not configured' }, 503)
  const u = new URL('https://api.nal.usda.gov/fdc/v1/foods/search')
  u.searchParams.set('api_key', env.USDA_API_KEY)
  u.searchParams.set('query', query)
  u.searchParams.set('pageSize', '1')
  u.searchParams.set('dataType', 'Foundation,SR Legacy,Survey (FNDDS)')
  let r
  try {
    r = await fetch(u.toString())
  } catch (err) {
    console.error('USDA fetch failed:', err.message)
    return json({ matched: null, group: null })
  }
  if (!r.ok) return json({ error: `USDA API ${r.status}` }, 502)
  const data = await r.json()
  const food = data.foods?.[0]
  if (!food) return json({ matched: null, group: null })
  return json({
    matched: food.description || null,
    foodCategory: food.foodCategory || null,
    group: mapCategoryToGroup(food.foodCategory),
  })
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS })
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405)
    }

    const authHeader = request.headers.get('Authorization') || ''
    const token = authHeader.match(/^Bearer\s+(.+)$/i)?.[1]
    if (!token) {
      return json({ error: 'Missing Authorization header' }, 401)
    }

    if (!env.FIREBASE_PROJECT_ID) {
      console.error('FIREBASE_PROJECT_ID environment variable is not set')
      return json({ error: 'Server misconfiguration' }, 500)
    }

    try {
      await jwtVerify(token, JWKS, {
        issuer: `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`,
        audience: env.FIREBASE_PROJECT_ID,
      })
    } catch (err) {
      console.error('JWT verification failed:', err.message)
      return json({ error: 'Invalid or expired token' }, 401)
    }

    let body
    try {
      body = await request.json()
    } catch {
      return json({ error: 'Invalid JSON body' }, 400)
    }

    // USDA food-group lookup: { query: "<food name>" }
    if (typeof body?.query === 'string' && body.query.trim()) {
      return handleFoodSearch(body.query.trim().slice(0, 200), env)
    }

    const prompt = body?.prompt
    if (typeof prompt !== 'string' || !prompt.trim()) {
      return json({ error: 'A non-empty "prompt" string is required' }, 400)
    }
    if (prompt.length > 8000) {
      return json({ error: 'Prompt is too long' }, 400)
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      return json({ error: `Anthropic API ${res.status}: ${errText}` }, 502)
    }

    const data = await res.json()
    const text = data.content?.[0]?.text
    return json({ text: typeof text === 'string' ? text.trim() : '' })
  },
}
