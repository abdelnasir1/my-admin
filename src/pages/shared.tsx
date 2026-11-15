// Pieces shared by the admin pages: page size, plan names, the profile
// lookup (user id -> name), and the pager under tables.
import { useEffect, useMemo, useState } from 'react'

import { supabaseClient } from '../providers/supabase-client'

export const PAGE_SIZE = 50

export const PLAN_OPTIONS = [
  { value: 'basicbook', label: 'أساسية' },
  { value: 'firstbook_advance', label: 'متخصصة كتاب أول' },
  { value: 'secondbook_advance', label: 'متخصصة كتاب ثاني' },
]

export function planLabel(value: string | null | undefined): string {
  if (!value) return '—'
  return PLAN_OPTIONS.find((plan) => plan.value === value)?.label ?? value
}

export type Profile = Record<string, any> & { id: string }

export function profileName(profile: Profile): string {
  const fullName = profile.full_name ?? profile.name
  if (fullName) return fullName
  const firstAndLast = [profile.first_name, profile.last_name].filter(Boolean).join(' ')
  return firstAndLast || profile.username || profile.email || '—'
}

/** All profiles. The server returns at most 1000 rows per request, so this
 *  asks again until a request comes back short. */
export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      const chunk = 1000
      const all: Profile[] = []
      for (let from = 0; ; from += chunk) {
        const { data, error: fetchError } = await supabaseClient
          .from('profiles')
          .select('*')
          .order('id')
          .range(from, from + chunk - 1)
        if (!active) return
        if (fetchError) {
          setError(fetchError.message)
          break
        }
        all.push(...((data ?? []) as Profile[]))
        if (!data || data.length < chunk) break
      }
      if (!active) return
      setProfiles(all)
      setLoading(false)
    }

    load()
    return () => {
      active = false
    }
  }, [])

  /** user id -> display name */
  const names = useMemo(() => {
    const map = new Map<string, string>()
    profiles.forEach((profile) => {
      const name = profileName(profile)
      if (profile.id) map.set(profile.id, name)
      if (profile.user_id) map.set(profile.user_id, name)
    })
    return map
  }, [profiles])

  return { profiles, names, loading, error }
}

export const inputStyle = {
  background: 'rgba(15, 23, 42, 0.9)',
  color: 'white',
  border: '1px solid rgba(148, 163, 184, 0.3)',
  padding: '8px 12px',
  borderRadius: '8px',
  minWidth: '180px',
} as const

export const filterRowStyle = {
  marginTop: '15px',
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: '12px',
} as const

/** "Previous / page x of y / next" under a table. [page] starts at 0. */
export function Pager({
  page,
  total,
  onChange,
}: {
  page: number
  total: number
  onChange: (page: number) => void
}) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '16px' }}>
      <button className="ghost-button" type="button" disabled={page <= 0} onClick={() => onChange(page - 1)}>
        السابق
      </button>
      <span style={{ color: '#dfe7f5' }}>
        صفحة {page + 1} من {pages} ({total} سجل)
      </span>
      <button className="ghost-button" type="button" disabled={page >= pages - 1} onClick={() => onChange(page + 1)}>
        التالي
      </button>
    </div>
  )
}
