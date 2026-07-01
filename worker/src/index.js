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
  const has = (...ws) => ws.some(w => c.includes(w))
  if (has('fruit', 'apple', 'banana', 'berr', 'grape', 'melon', 'citrus', 'orange', 'peach', 'pear', 'plum', 'mango', 'pineapple', 'cherry')) return 'produce'
  if (has('vegetable', 'potato', 'carrot', 'broccoli', 'spinach', 'lettuce', 'tomato', 'beans', 'peas', 'corn', 'squash', 'pepper', 'onion', 'greens')) return 'produce'
  if (has('grain', 'pasta', 'bread', 'cereal', 'rice', 'oat', 'wheat', 'flour', 'baked', 'cracker', 'noodle')) return 'grain'
  if (has('dairy', 'milk', 'cheese', 'yogurt', 'egg', 'butter', 'cream')) return 'dairy'
  if (has('poultry', 'chicken', 'turkey', 'beef', 'pork', 'lamb', 'veal', 'fish', 'salmon', 'tuna', 'shellfish', 'shrimp', 'sausage', 'meat', 'legume', 'nut', 'seed', 'tofu', 'bacon')) return 'protein'
  return 'mixed'
}

// Pull the core macros out of a USDA food's foodNutrients array.
function extractNutrients(food) {
  const out = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 }
  for (const n of food.foodNutrients || []) {
    const name = (n.nutrientName || n.nutrient?.name || '').toLowerCase()
    const unit = (n.unitName || n.nutrient?.unitName || '').toLowerCase()
    const val = typeof n.value === 'number' ? n.value : (typeof n.amount === 'number' ? n.amount : 0)
    if (name === 'energy' && unit === 'kcal') { if (!out.calories) out.calories = val }
    else if (name.startsWith('protein')) out.protein_g = val
    else if (name.startsWith('carbohydrate')) out.carbs_g = val
    else if (name.startsWith('total lipid')) out.fat_g = val
    else if (name.startsWith('fiber')) out.fiber_g = val
  }
  for (const k in out) out[k] = Math.round(out[k] * 10) / 10
  return out
}

const WHOLE_FOODS = ['Foundation', 'SR Legacy', 'Survey (FNDDS)']
const WITH_BRANDED = ['Foundation', 'SR Legacy', 'Survey (FNDDS)', 'Branded']

// USDA's GET /foods/search 400s when a dataType value contains spaces/parens
// (e.g. "Survey (FNDDS)"). Use POST with a JSON body, which takes the array cleanly.
function usdaSearch(env, query, pageSize, dataType) {
  // Trim in case the stored secret picked up a trailing newline/space on paste.
  const key = (env.USDA_API_KEY || '').trim()
  return fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, pageSize, dataType }),
  })
}

// Single best-match lookup — used to enrich a food on creation.
async function handleFoodSearch(query, env) {
  if (!env.USDA_API_KEY) return json({ error: 'USDA not configured' }, 503)
  let r
  try {
    r = await usdaSearch(env, query, 1, WHOLE_FOODS)
  } catch (err) {
    console.error('USDA fetch failed:', err.message)
    return json({ matched: null, group: null, nutrition: null })
  }
  if (!r.ok) return json({ error: `USDA API ${r.status}` }, 502)
  const data = await r.json()
  const food = data.foods?.[0]
  if (!food) return json({ matched: null, group: null, nutrition: null })
  return json({
    matched: food.description || null,
    foodCategory: food.foodCategory || null,
    group: mapCategoryToGroup(food.foodCategory),
    nutrition: extractNutrients(food),
  })
}

// Multi-result search — used by the Suggested tab to browse many foods.
// Includes Branded/packaged products for the widest set of options.
async function handleFoodSearchMulti(query, limit, env) {
  if (!env.USDA_API_KEY) return json({ error: 'USDA not configured' }, 503)
  let r
  try {
    r = await usdaSearch(env, query, limit, WITH_BRANDED)
  } catch (err) {
    console.error('USDA search failed:', err.message)
    return json({ results: [] })
  }
  if (!r.ok) return json({ error: `USDA API ${r.status}` }, 502)
  const data = await r.json()
  const seen = new Set()
  const results = []
  for (const food of data.foods || []) {
    const name = (food.description || '').trim()
    if (!name) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    results.push({ name, group: mapCategoryToGroup(food.foodCategory), nutrition: extractNutrients(food) })
  }
  return json({ results })
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

    // Chat mode: { system?: string, messages: [{ role, content }] }
    if (Array.isArray(body?.messages)) {
      const messages = body.messages
      if (messages.length === 0 || messages.length > 20) {
        return json({ error: 'messages must be 1-20 items' }, 400)
      }
      for (const m of messages) {
        if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') {
          return json({ error: 'invalid message' }, 400)
        }
        if (m.content.length > 4000) return json({ error: 'message too long' }, 400)
      }
      const system = typeof body.system === 'string' ? body.system.slice(0, 8000) : undefined
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 600,
          system,
          messages,
        }),
      })
      if (!res.ok) {
        const errText = await res.text()
        return json({ error: `Anthropic API ${res.status}: ${errText}` }, 502)
      }
      const data = await res.json()
      const text = data.content?.[0]?.text
      return json({ text: typeof text === 'string' ? text.trim() : '' })
    }

    // USDA single-food enrichment: { query: "<food name>" }
    if (typeof body?.query === 'string' && body.query.trim()) {
      return handleFoodSearch(body.query.trim().slice(0, 200), env)
    }

    // USDA multi-result search: { search: "<query>", limit?: N }
    if (typeof body?.search === 'string' && body.search.trim()) {
      const limit = Math.min(Math.max(parseInt(body.limit, 10) || 12, 1), 20)
      return handleFoodSearchMulti(body.search.trim().slice(0, 200), limit, env)
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
