import { auth } from '../firebase'

const PROXY_URL = import.meta.env.VITE_AI_PROXY_URL

// Ask the Worker (which proxies USDA FoodData Central) for a food's group.
// Returns one of grain/produce/protein/dairy/mixed, or null on any failure —
// callers must treat null as "unknown" and fall back to local classification.
export async function fetchFoodGroup(name) {
  if (!PROXY_URL || !name) return null
  const user = auth.currentUser
  if (!user) return null
  try {
    const idToken = await user.getIdToken()
    const res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ query: name }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.group || null
  } catch {
    return null
  }
}
