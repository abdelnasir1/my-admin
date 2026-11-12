import { type ChangeEvent, useEffect, useRef, useState } from 'react'

import { supabaseClient } from '../../providers/supabase-client'

// Bucket and table created by supabase/promo.sql (in the app project).
const BUCKET = 'promo'
const TABLE = 'app_promo'

/** The file path inside the bucket, taken from a public URL of that bucket. */
function pathFromPublicUrl(url: string): string | null {
  const marker = `/object/public/${BUCKET}/`
  const at = url.indexOf(marker)
  return at === -1 ? null : decodeURIComponent(url.slice(at + marker.length))
}

export function PromoPage() {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    setError(null)
    const { data, error: loadError } = await supabaseClient
      .from(TABLE)
      .select('image_url, updated_at')
      .eq('id', 1)
      .maybeSingle()

    if (loadError) {
      setError(loadError.message)
    } else {
      setImageUrl(data?.image_url ?? null)
      setUpdatedAt(data?.updated_at ?? null)
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  /** Saves which picture is current (null = no picture). */
  async function saveCurrent(url: string | null) {
    const { error: saveError } = await supabaseClient
      .from(TABLE)
      .upsert({ id: 1, image_url: url, updated_at: new Date().toISOString() })
    if (saveError) throw new Error(saveError.message)
  }

  /** Deletes an old picture file. A failure here is not shown: the new
   *  picture is already live, the old file is only unused storage. */
  async function removeFile(url: string | null) {
    const path = url ? pathFromPublicUrl(url) : null
    if (path) await supabaseClient.storage.from(BUCKET).remove([path])
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // lets the same file be picked again
    if (!file) return

    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      // A new name for every upload: the app keeps pictures by address, so a
      // new address is what makes phones fetch the new picture.
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `promo-${Date.now()}.${ext}`

      const { error: uploadError } = await supabaseClient.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, cacheControl: '31536000' })
      if (uploadError) throw new Error(`فشل رفع الصورة: ${uploadError.message}`)

      const { data: { publicUrl } } = supabaseClient.storage.from(BUCKET).getPublicUrl(path)

      const previous = imageUrl
      try {
        await saveCurrent(publicUrl)
      } catch (saveError) {
        // The picture was uploaded but not made current: remove it again.
        await supabaseClient.storage.from(BUCKET).remove([path])
        throw saveError
      }
      await removeFile(previous)

      setMessage('تم تحديث صورة الإعلان. ستظهر في التطبيق عند فتح الصفحة الرئيسية.')
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove() {
    if (!imageUrl) return
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const previous = imageUrl
      await saveCurrent(null)
      await removeFile(previous)
      setMessage('تم حذف الصورة. سيعرض التطبيق بطاقة الإعلان الافتراضية.')
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="teacher-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">الصفحة الرئيسية</p>
          <h1>صورة الإعلان</h1>
        </div>
        <button
          className="primary-button"
          type="button"
          disabled={busy || loading}
          onClick={() => fileInputRef.current?.click()}
        >
          {busy ? 'جاري الحفظ...' : imageUrl ? 'تغيير الصورة' : 'رفع صورة'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFile}
        />
      </header>

      <div className="panel description-panel">
        <h2>الصورة التي تظهر أعلى الصفحة الرئيسية في التطبيق</h2>
        <p>
          عند رفع صورة جديدة تستبدل الصورة الحالية لدى جميع المستخدمين. بدون
          صورة، أو بدون إنترنت في أول تشغيل، يعرض التطبيق بطاقة الإعلان
          الافتراضية.
        </p>
      </div>

      {error && <div className="empty-state"><h2>تعذر تنفيذ العملية</h2><p>{error}</p></div>}
      {message && <div className="panel description-panel"><p>{message}</p></div>}

      {loading ? (
        <div className="empty-state"><p>جاري التحميل...</p></div>
      ) : imageUrl ? (
        <div className="panel">
          <img
            src={imageUrl}
            alt="صورة الإعلان الحالية"
            style={{ maxWidth: '100%', maxHeight: 420, borderRadius: 16, display: 'block' }}
          />
          <p style={{ marginTop: 12 }}>
            آخر تحديث: {updatedAt ? new Date(updatedAt).toLocaleString('ar') : '—'}
          </p>
          <button className="ghost-button" type="button" disabled={busy} onClick={handleRemove}>
            حذف الصورة
          </button>
        </div>
      ) : !error ? (
        <div className="empty-state">
          <h2>لا توجد صورة حالياً</h2>
          <p>ارفع صورة لتظهر في الصفحة الرئيسية للتطبيق.</p>
        </div>
      ) : null}
    </div>
  )
}
