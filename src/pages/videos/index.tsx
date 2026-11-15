import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from 'react'

import { supabaseClient } from '../../providers/supabase-client'
import { PAGE_SIZE, PLAN_OPTIONS, Pager, filterRowStyle, inputStyle, planLabel } from '../shared'

type Video = {
  id: string
  video_url: string
  is_premium?: boolean | null
  plan_type?: string | null
}

const BUCKET = 'videos'

/** The file path inside the bucket, taken from the video's public URL. */
function pathFromPublicUrl(url: string): string | null {
  const marker = `/object/public/${BUCKET}/`
  const at = url.indexOf(marker)
  return at === -1 ? null : decodeURIComponent(url.slice(at + marker.length))
}

/** The file name part of a video URL, for display. */
function fileNameOf(url: string): string {
  return decodeURIComponent(url.split('/').pop() ?? url)
}

/**
 * Videos: search the whole table (not only the first rows), filter by access
 * and plan, page through the results, add a video, and delete one.
 */
export function VideosPage() {
  // Filters
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [access, setAccess] = useState<'all' | 'free' | 'premium'>('all')
  const [plan, setPlan] = useState('')
  const [page, setPage] = useState(0)

  // Results
  const [videos, setVideos] = useState<Video[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  // Add form
  const [showAdd, setShowAdd] = useState(false)
  const [newFile, setNewFile] = useState<File | null>(null)
  const [newPremium, setNewPremium] = useState(false)
  const [newPlan, setNewPlan] = useState(PLAN_OPTIONS[0].value)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Typing waits half a second before searching, and a new search starts
  // from the first page.
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedSearch(search.trim())
      setPage(0)
    }, 500)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)

      let query = supabaseClient
        .from('videos')
        .select('id, video_url, is_premium, plan_type', { count: 'exact' })

      if (appliedSearch) query = query.ilike('video_url', `%${appliedSearch}%`)
      if (access === 'free') query = query.eq('is_premium', false)
      if (access === 'premium') query = query.eq('is_premium', true)
      if (plan) query = query.eq('plan_type', plan)

      const from = page * PAGE_SIZE
      const { data, error: listError, count } = await query
        .order('id', { ascending: false })
        .range(from, from + PAGE_SIZE - 1)

      if (!active) return
      if (listError) {
        setError(listError.message)
        setVideos([])
      } else {
        setVideos((data ?? []) as Video[])
        setTotal(count ?? 0)
      }
      setLoading(false)
    }

    load()
    return () => {
      active = false
    }
  }, [appliedSearch, access, plan, page, reloadKey])

  async function addVideo(event: FormEvent) {
    event.preventDefault()
    if (!newFile) {
      setMessage('اختر ملف فيديو أولاً.')
      return
    }

    setBusy(true)
    setMessage(null)
    const path = `${Date.now()}-${newFile.name.replace(/[\\/]/g, '_').trim()}`
    try {
      const { error: uploadError } = await supabaseClient.storage
        .from(BUCKET)
        .upload(path, newFile, { cacheControl: '3600', upsert: false, contentType: newFile.type })
      if (uploadError) throw new Error(`فشل رفع الفيديو: ${uploadError.message}`)

      const { data: { publicUrl } } = supabaseClient.storage.from(BUCKET).getPublicUrl(path)

      const { error: recordError } = await supabaseClient
        .from('videos')
        .insert([{ video_url: publicUrl, is_premium: newPremium, plan_type: newPlan }])
      if (recordError) {
        // The file went up but its row did not: take the file down again.
        await supabaseClient.storage.from(BUCKET).remove([path])
        throw new Error(`تم رفع الملف لكن فشل حفظ السجل: ${recordError.message}`)
      }

      setMessage('تمت إضافة الفيديو.')
      setNewFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setPage(0)
      setReloadKey((key) => key + 1)
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  async function deleteVideo(video: Video) {
    setMessage(null)

    // A video that examples point to is not deleted: those examples would be
    // left with a broken video button.
    const { count, error: usageError } = await supabaseClient
      .from('examples')
      .select('id', { count: 'exact', head: true })
      .eq('video_id', video.id)
    if (usageError) {
      setMessage(`تعذر التحقق من ارتباط الفيديو: ${usageError.message}`)
      return
    }
    if ((count ?? 0) > 0) {
      setMessage(`لا يمكن حذف هذا الفيديو لأنه مرتبط بـ ${count} مثال. احذف الأمثلة أو غيّر الفيديو فيها أولاً.`)
      return
    }

    if (!window.confirm(`هل تريد حذف هذا الفيديو نهائياً؟\n${fileNameOf(video.video_url)}`)) return

    const { error: deleteError } = await supabaseClient.from('videos').delete().eq('id', video.id)
    if (deleteError) {
      setMessage(`فشل حذف السجل: ${deleteError.message}`)
      return
    }

    const path = pathFromPublicUrl(video.video_url)
    if (path) {
      const { error: fileError } = await supabaseClient.storage.from(BUCKET).remove([path])
      if (fileError) {
        setMessage(`تم حذف السجل، لكن تعذر حذف الملف من التخزين: ${fileError.message}`)
        setReloadKey((key) => key + 1)
        return
      }
    }

    setMessage('تم حذف الفيديو.')
    setReloadKey((key) => key + 1)
  }

  return (
    <div className="teacher-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">التخزين</p>
          <h1>الفيديوهات</h1>
        </div>
        <button className="primary-button" type="button" onClick={() => setShowAdd((open) => !open)}>
          {showAdd ? 'إغلاق' : 'إضافة فيديو'}
        </button>
      </header>

      {showAdd && (
        <form className="panel create-panel" onSubmit={addVideo} style={{ marginBottom: '16px' }}>
          <h2>فيديو جديد</h2>
          <label>
            ملف الفيديو
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={(event: ChangeEvent<HTMLInputElement>) => setNewFile(event.target.files?.[0] ?? null)}
            />
          </label>
          <label style={{ flexDirection: 'row', alignItems: 'center' }}>
            <input
              type="checkbox"
              style={{ width: 'auto' }}
              checked={newPremium}
              onChange={(event) => setNewPremium(event.target.checked)}
            />
            فيديو مدفوع
          </label>
          <label>
            الخطة
            <select value={newPlan} onChange={(event) => setNewPlan(event.target.value)}>
              {PLAN_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <button className="primary-button" type="submit" disabled={busy}>
            {busy ? 'جاري الرفع...' : 'رفع الفيديو'}
          </button>
        </form>
      )}

      <div className="panel description-panel">
        <h2>بحث وتصفية</h2>
        <div style={filterRowStyle}>
          <input
            style={{ ...inputStyle, minWidth: '260px' }}
            placeholder="ابحث باسم الملف أو الرابط"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            style={inputStyle}
            value={access}
            onChange={(event) => { setAccess(event.target.value as typeof access); setPage(0) }}
          >
            <option value="all">كل أنواع الوصول</option>
            <option value="free">مجاني</option>
            <option value="premium">مدفوع</option>
          </select>
          <select style={inputStyle} value={plan} onChange={(event) => { setPlan(event.target.value); setPage(0) }}>
            <option value="">كل الخطط</option>
            {PLAN_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <p style={{ marginTop: '10px' }}>{total} فيديو مطابق</p>
        {message && <p className="form-message">{message}</p>}
      </div>

      {loading ? (
        <div className="empty-state"><p>جاري تحميل الفيديوهات...</p></div>
      ) : error ? (
        <div className="empty-state"><h2>مشكلة في الاتصال</h2><p>{error}</p></div>
      ) : videos.length === 0 ? (
        <div className="empty-state"><h2>لا توجد فيديوهات مطابقة</h2></div>
      ) : (
        <>
          <div className="table-card large-table">
            <table>
              <thead>
                <tr><th>الملف</th><th>نوع الوصول</th><th>الخطة</th><th>الإجراء</th></tr>
              </thead>
              <tbody>
                {videos.map((video) => (
                  <tr key={video.id}>
                    <td>
                      <a className="receipt-link" href={video.video_url} target="_blank" rel="noreferrer">
                        {fileNameOf(video.video_url)}
                      </a>
                    </td>
                    <td>{video.is_premium ? 'مدفوع' : 'مجاني'}</td>
                    <td>{planLabel(video.plan_type)}</td>
                    <td>
                      <button type="button" className="remove-option-btn" onClick={() => void deleteVideo(video)}>
                        حذف
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
