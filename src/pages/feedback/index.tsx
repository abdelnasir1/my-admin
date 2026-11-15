import { useEffect, useMemo, useState } from 'react'

import { supabaseClient } from '../../providers/supabase-client'
import { PAGE_SIZE, Pager, useProfiles } from '../shared'

type Row = Record<string, any>

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'نعم' : 'لا'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

/** Feedback messages. The row id is hidden and the user id is shown as the
 *  user's name (from the profiles). */
export function FeedbackPage() {
  const { names } = useProfiles()
  const [rows, setRows] = useState<Row[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError(null)
      const from = page * PAGE_SIZE
      const { data, error: fetchError, count } = await supabaseClient
        .from('feedback')
        .select('*', { count: 'exact' })
        .range(from, from + PAGE_SIZE - 1)
      if (!active) return
      if (fetchError) {
        setError(fetchError.message)
        setRows([])
      } else {
        setRows(data ?? [])
        setTotal(count ?? 0)
      }
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [page])

  // Every column except the row id; the user comes first.
  const columns = useMemo(() => {
    const keys = new Set<string>()
    rows.forEach((row) => Object.keys(row).forEach((key) => keys.add(key)))
    keys.delete('id')
    const rest = [...keys].filter((key) => key !== 'user_id')
    return keys.has('user_id') ? ['user_id', ...rest] : rest
  }, [rows])

  return (
    <div className="teacher-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">قاعدة البيانات</p>
          <h1>الملاحظات</h1>
        </div>
      </header>

      <div className="panel description-panel">
        <h2>رسائل المستخدمين</h2>
        <p>{total} رسالة</p>
      </div>

      {loading ? (
        <div className="empty-state"><p>جاري تحميل السجلات...</p></div>
      ) : error ? (
        <div className="empty-state"><h2>مشكلة في الاتصال</h2><p>{error}</p></div>
      ) : rows.length === 0 ? (
        <div className="empty-state"><h2>لا توجد ملاحظات</h2></div>
      ) : (
        <>
          <div className="table-card large-table">
            <table>
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column}>{column === 'user_id' ? 'المستخدم' : column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id ?? index}>
                    {columns.map((column) => (
                      <td key={column}>
                        {column === 'user_id'
                          ? names.get(row.user_id) ?? (row.user_id ? 'مستخدم غير معروف' : 'زائر')
                          : formatValue(row[column])}
                      </td>
                    ))}
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
