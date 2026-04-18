import { useState, useEffect } from 'react'

export default function NoteComposer({ onSave, existingNote }) {
  const [body, setBody] = useState(existingNote?.body || '')
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState('idle') // 'idle' | 'saved' | 'error'

  useEffect(() => {
    if (existingNote?.body !== undefined) {
      setBody(existingNote.body)
    }
  }, [existingNote?.id])

  const isDirty = body.trim() !== (existingNote?.body?.trim() || '')

  async function handleSave() {
    if (body.trim().length < 1 || isSaving) return
    setIsSaving(true)
    setSaveStatus('idle')
    try {
      await onSave(body.trim())
      setSaveStatus('saved')
    } catch (err) {
      console.error('Failed to save note:', err)
      setSaveStatus('error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-2">
      <textarea
        value={body}
        onChange={e => { setBody(e.target.value); setSaveStatus('idle') }}
        placeholder="Write a note for today..."
        rows={4}
        maxLength={1000}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{body.length} / 1000</span>
        <div className="flex items-center gap-3">
          {saveStatus === 'saved' && !isDirty && (
            <span className="text-xs text-green-600">Saved</span>
          )}
          {saveStatus === 'error' && (
            <span className="text-xs text-red-500">Failed to save</span>
          )}
          <button
            onClick={handleSave}
            disabled={body.trim().length < 1 || isSaving || !isDirty}
            className="bg-purple-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? 'Saving...' : existingNote ? 'Update note' : 'Save note'}
          </button>
        </div>
      </div>
    </div>
  )
}
