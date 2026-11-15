import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { supabaseClient } from '../../providers/supabase-client'
import { PAGE_SIZE, PLAN_OPTIONS, Pager, planLabel, profileName, useProfiles } from '../shared'

type Subscription = {
  id: string
  user_id: string
  plan_type: string | null
  is_active: boolean | null
  start_date: string | null
}

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleString('ar') : '—'
}

/** Subscriptions table. The user id is shown as the user's name. */
export function SubscriptionsPage() {
  const { names } = useProfiles()
  const [rows, setRows] = useState<Subscription[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError(null)
      const from = page * PAGE_SIZE
      const { data, error: fetchError, count } = await supabaseClient
        .from('subscriptions')
        .select('id, user_id, plan_type, is_active, start_date', { count: 'exact' })
        .order('start_date', { ascending: false })
        .range(from, from + PAGE_SIZE - 1)
      if (!active) return
      if (fetchError) {
        setError(fetchError.message)
        setRows([])
      } else {
        setRows((data ?? []) as Subscription[])
        setTotal(count ?? 0)
      }
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [page, reloadKey])

  /** Turns one subscription on or off. */
  async function setActive(row: Subscription, isActive: boolean) {
    const { error: updateError } = await supabaseClient
      .from('subscriptions')
      .update({ is_active: isActive })
      .eq('id', row.id)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setReloadKey((key) => key + 1)
  }

  return (
    <div className="teacher-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">قاعدة البيانات</p>
          <h1>الاشتراكات</h1>
        </div>
        <Link to="/subscriptions/create" className="primary-button button-link">إضافة اشتراك</Link>
      </header>

      <div className="panel description-panel">
        <h2>اشتراكات المستخدمين</h2>
        <p>{total} اشتراك</p>
      </div>

      {loading ? (
        <div className="empty-state"><p>جاري تحميل السجلات...</p></div>
      ) : error ? (
        <div className="empty-state"><h2>مشكلة في الاتصال</h2><p>{error}</p></div>
      ) : rows.length === 0 ? (
        <div className="empty-state"><h2>لا توجد اشتراكات</h2></div>
      ) : (
        <>
          <div className="table-card large-table">
            <table>
              <thead>
                <tr><th>المستخدم</th><th>الخطة</th><th>تاريخ البدء</th><th>الحالة</th><th>الإجراء</th></tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{names.get(row.user_id) ?? 'مستخدم غير معروف'}</td>
                    <td>{planLabel(row.plan_type)}</td>
                    <td>{formatDate(row.start_date)}</td>
                    <td>{row.is_active ? 'نشط' : 'متوقف'}</td>
                    <td>
                      <button
                        type="button"
                        className={row.is_active ? 'remove-option-btn' : 'table-action-button'}
                        onClick={() => void setActive(row, !row.is_active)}
                      >
                        {row.is_active ? 'إيقاف' : 'تفعيل'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={page} total={total} onChange={setPage} />
        </>
      )}
    </div>
  )
}

/** Form to give a user a subscription by hand. */
export function CreateSubscriptionPage() {
  const { profiles, loading: profilesLoading, error: profilesError } = useProfiles()
  const [search, setSearch] = useState('')
  const [userId, setUserId] = useState('')
  const [plan, setPlan] = useState(PLAN_OPTIONS[0].value)
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  // The user list narrowed by the search box (name or email).
  const matches = useMemo(() => {
    const term = search.trim().toLowerCase()
    const list = term
      ? profiles.filter(
          (profile) =>
            profileName(profile).toLowerCase().includes(term) ||
            String(profile.email ?? '').toLowerCase().includes(term),
        )
      : profiles
    return list.slice(0, 100)
  }, [profiles, search])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!userId) {
      setMessage('اختر المستخدم أولاً.')
      return
    }

    setSaving(true)
    setMessage(null)
    try {
      // One active subscription per user and plan is enough.
      const { count, error: checkError } = await supabaseClient
        .from('subscriptions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('plan_type', plan)
        .eq('is_active', true)
      if (checkError) throw new Error(checkError.message)
      if ((count ?? 0) > 0) {
        setMessage('هذا المستخدم لديه اشتراك نشط في هذه الخطة بالفعل.')
        return
      }

      const { error: insertError } = await supabaseClient.from('subscriptions').insert([
        {
          user_id: userId,
          plan_type: plan,
          is_active: isActive,
          start_date: new Date().toISOString(),
        },
      ])
      if (insertError) throw new Error(insertError.message)

      setMessage('تمت إضافة الاشتراك.')
      setUserId('')
      setSearch('')
    } catch (caught) {
      setMessage(`فشل إضافة الاشتراك: ${caught instanceof Error ? caught.message : String(caught)}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="teacher-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">الاشتراكات</p>
          <h1>إضافة اشتراك</h1>
        </div>
        <Link to="/subscriptions" className="ghost-button button-link">العودة للجدول</Link>
      </header>

      <form className="panel create-panel half-width-form" onSubmit={submit}>
        <h2>بيانات الاشتراك</h2>

        <label>
          ابحث عن المستخدم
          <input
            placeholder="الاسم أو البريد الإلكتروني"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <label>
          المستخدم
          <select value={userId} onChange={(event) => setUserId(event.target.value)} size={8} required>
            {matches.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profileName(profile)}{profile.email ? ` — ${profile.email}` : ''}
              </option>
            ))}
          </select>
        </label>
        {profilesLoading && <p>جاري تحميل المستخدمين...</p>}
        {profilesError && <p className="form-message">{profilesError}</p>}

        <label>
          الخطة
          <select value={plan} onChange={(event) => setPlan(event.target.value)}>
            {PLAN_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label style={{ flexDirection: 'row', alignItems: 'center' }}>
          <input
            type="checkbox"
            style={{ width: 'auto' }}
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
          />
          الاشتراك نشط
        </label>

        <button className="primary-button" type="submit" disabled={saving}>
          {saving ? 'جاري الحفظ...' : 'إضافة الاشتراك'}
        </button>
        {message && <p className="form-message">{message}</p>}
      </form>
    </div>
  )
}
