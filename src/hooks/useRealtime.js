import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export function useRealtime({ table, familyId, onInsert, onUpdate, onDelete, filterOnFamilyId = true, onStatusChange }) {
  const handlersRef = useRef({ onInsert, onUpdate, onDelete, onStatusChange })
  useEffect(() => {
    handlersRef.current = { onInsert, onUpdate, onDelete, onStatusChange }
  }, [onInsert, onUpdate, onDelete, onStatusChange])

  useEffect(() => {
    if (!familyId || !table) return

    const channelName = `realtime:${table}:${familyId}:${Math.random().toString(36).slice(2, 8)}`
    const config = { event: '*', schema: 'public', table }
    if (filterOnFamilyId) config.filter = `family_id=eq.${familyId}`

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', config, (payload) => {
        const { eventType, new: newRow, old: oldRow } = payload
        const h = handlersRef.current
        if (eventType === 'INSERT' && h.onInsert) h.onInsert(newRow)
        if (eventType === 'UPDATE' && h.onUpdate) h.onUpdate(newRow, oldRow)
        if (eventType === 'DELETE' && h.onDelete) h.onDelete(oldRow)
      })
      .subscribe((status) => {
        const h = handlersRef.current
        if (!h.onStatusChange) return
        if (status === 'SUBSCRIBED') h.onStatusChange('connected')
        if (['TIMED_OUT', 'CLOSED', 'CHANNEL_ERROR'].includes(status)) h.onStatusChange('disconnected')
      })

    return () => { supabase.removeChannel(channel) }
  }, [table, familyId, filterOnFamilyId])
}
