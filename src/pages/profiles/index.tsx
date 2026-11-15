import { useMemo, useState } from 'react'

import { inputStyle, filterRowStyle, profileName, useProfiles } from '../shared'

/** Users: name and email only (no ids), with a quick filter. */
export function ProfilesPage() {
  const { profiles, loading, error } = useProfiles()
  const [search, setSearch] = useState('')

  const shown = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return profiles
    return profiles.filter(
      (profile) =>
        profileName(profile).toLowerCase().includes(term) ||
        String(profile.email ?? '').toLowerCase().includes(term),
    )
  }, [profiles, search])

  return (
    <div className="teacher-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">قاعدة البيانات</p>
          <h1>الملفات الشخصية</h1>
        </div>
      </header>

      <div className="panel description-panel">
        <h2>حسابات المستخدمين</h2>
        <div style={filterRowStyle}>
          <input
            style={inputStyle}
            placeholder="ابحث بالاسم أو البريد"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <p style={{ marginTop: '10px' }}>{shown.length} من {profiles.length} مستخدم</p>
      </div>

      {loading ? (
        <div className="empty-state"><p>جاري تحميل السجلات...</p></div>
      ) : error ? (
        <div className="empty-state"><h2>مشكلة في الاتصال</h2><p>{error}</p></div>
      ) : shown.length === 0 ? (
        <div className="empty-state"><h2>لا توجد نتائج</h2></div>
      ) : (
        <div className="table-card large-table">
          <table>
            <thead>
              <tr><th>المستخدم</th><th>البريد الإلكتروني</th></tr>
            </thead>
            <tbody>
              {shown.map((profile) => (
                <tr key={profile.id}>
                  <td>{profileName(profile)}</td>
                  <td>{profile.email ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
