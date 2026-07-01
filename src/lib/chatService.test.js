import { describe, it, expect, vi } from 'vitest'

// chatService imports ../firebase (real Firebase init) — stub it for unit tests.
vi.mock('../firebase', () => ({ auth: { currentUser: null } }))

import { buildSystemPrompt } from './chatService'

describe('buildSystemPrompt', () => {
  const facts = { thisWeek: { total: 3, okay: 2 }, lastWeek: { total: 0 } }
  const p = buildSystemPrompt(facts)

  it('embeds the facts JSON', () => {
    expect(p).toContain('"total":3')
  })
  it('forbids medical/nutrition advice', () => {
    expect(p.toLowerCase()).toContain('not able to give medical or nutrition advice')
  })
  it('includes crisis guidance', () => {
    expect(p).toContain('988')
  })
  it('tells the model to only use the provided facts for numbers', () => {
    expect(p.toLowerCase()).toContain('only use these facts')
  })
})
