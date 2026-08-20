import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { supabaseClient } from '../../providers/supabase-client';

interface OptionItem {
  id: string;
  text: string;
  isCorrect: boolean;
}

export const CreateExamplePage = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);

  const [categoryName, setCategoryName] = useState('');
  const [categoryLevel, setCategoryLevel] = useState('1');
  const [parentCategoryId, setParentCategoryId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  const [videoUrl, setVideoUrl] = useState('');
  const [videoPremium, setVideoPremium] = useState(true);
  const [planType, setPlanType] = useState('basicbook');
  const [selectedVideoId, setSelectedVideoId] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoUploadMessage, setVideoUploadMessage] = useState('');

  const [exampleName, setExampleName] = useState('');
  const [questionImageUrl, setQuestionImageUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [uploadingQuestion, setUploadingQuestion] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);

  const [dynamicOptions, setDynamicOptions] = useState<OptionItem[]>([
    { id: Math.random().toString(), text: '', isCorrect: false }
  ]);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Fetch Resources (Direct)
  useEffect(() => {
    async function load() {
        const { data: cats } = await supabaseClient.from('categories').select('*');
        if (cats) setCategories(cats);

        const { data: vids } = await supabaseClient.from('videos').select('*');
        if (vids) setVideos(vids);
    }
    load();
  }, []);

  const addOption = () => {
    setDynamicOptions([...dynamicOptions, { id: Math.random().toString(), text: '', isCorrect: false }]);
  };

  const removeOption = (id: string) => {
    setDynamicOptions(dynamicOptions.filter(opt => opt.id !== id));
  };

  const updateOptionText = (id: string, text: string) => {
    setDynamicOptions(dynamicOptions.map(opt => opt.id === id ? { ...opt, text } : opt));
  };

  const updateOptionCorrect = (id: string, isCorrect: boolean) => {
    setDynamicOptions(dynamicOptions.map(opt => opt.id === id ? { ...opt, isCorrect } : opt));
  };

  const createCategory = async () => {
    if (!categoryName.trim()) {
      setMessage('اسم القسم مطلوب.');
      return;
    }

    const { data, error } = await supabaseClient
      .from('categories')
      .insert([
        {
          name: categoryName.trim(),
          level: Number(categoryLevel),
          parent_id: parentCategoryId || null,
        },
      ])
      .select()
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    setSelectedCategoryId(data.id);
    setMessage('تم إنشاء القسم. الآن أضف أو اختر الفيديو قبل إنشاء المثال.');
  };

  const uploadVideoToBucket = async () => {
    if (!videoFile) {
      setMessage('يرجى اختيار ملف فيديو أولاً.');
      return;
    }

    setUploadingVideo(true);
    setVideoUploadMessage('');
    setMessage('');

    const fileExt = videoFile.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
    const filePath = `/${fileName}`;

    const { error: uploadError } = await supabaseClient.storage
      .from('videos')
      .upload(filePath, videoFile, {
        cacheControl: '3600',
        upsert: false,
        contentType: videoFile.type,
      });

    if (uploadError) {
      setMessage(`فشل رفع الفيديو: ${uploadError.message}`);
      setUploadingVideo(false);
      return;
    }

    const { data: { publicUrl } } = supabaseClient.storage
      .from('videos')
      .getPublicUrl(filePath);

    setVideoUrl(publicUrl);
    setUploadingVideo(false);
    setVideoUploadMessage('تم رفع الفيديو إلى البوكيت بنجاح.');
    setMessage('تم الحصول على رابط الفيديو. الآن يمكن حفظ سجل الفيديو.');
  };

  const createVideo = async () => {
    const finalVideoUrl = videoUrl.trim();

    if (!finalVideoUrl) {
      setMessage('يرجى رفع الفيديو أولاً أو إدخال رابط فيديو.');
      return;
    }

    const { data, error } = await supabaseClient
      .from('videos')
      .insert([
        {
          video_url: finalVideoUrl,
          is_premium: videoPremium,
          plan_type: planType,
        },
      ])
      .select()
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    setSelectedVideoId(data.id);
    setMessage('تم إنشاء الفيديو بنجاح. يمكنك الآن إنشاء سجل المثال.');
  };

  const handleQuestionImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingQuestion(true);
    setMessage('');

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabaseClient.storage
      .from('examplepictures')
      .upload(filePath, file);

    if (uploadError) {
      setMessage(`فشل رفع صورة السؤال: ${uploadError.message}`);
      setUploadingQuestion(false);
      return;
    }

    const { data: { publicUrl } } = supabaseClient.storage
      .from('examplepictures')
      .getPublicUrl(filePath);

    setQuestionImageUrl(publicUrl);
    setUploadingQuestion(false);
    setMessage('تم رفع صورة السؤال بنجاح.');
  };

  const handleThumbnailUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingThumbnail(true);
    setMessage('');

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabaseClient.storage
      .from('thumbnails')
      .upload(filePath, file);

    if (uploadError) {
      setMessage(`فشل رفع الصورة المصغرة: ${uploadError.message}`);
      setUploadingThumbnail(false);
      return;
    }

    const { data: { publicUrl } } = supabaseClient.storage
      .from('thumbnails')
      .getPublicUrl(filePath);

    setThumbnailUrl(publicUrl);
    setUploadingThumbnail(false);
    setMessage('تم رفع الصورة المصغرة بنجاح.');
  };

  const createExample = async () => {
    if (!selectedCategoryId) {
      setMessage('يرجى إنشاء أو اختيار قسم أولاً.');
      return;
    }

    if (!selectedVideoId) {
      setMessage('يرجى إنشاء أو اختيار فيديو أولاً.');
      return;
    }

    if (!exampleName.trim() || !questionImageUrl.trim()) {
      setMessage('اسم المثال وصورة السؤال مطلوبة.');
      return;
    }

    const validOptions = dynamicOptions.filter(opt => opt.text.trim() !== '');
    if (validOptions.length === 0) {
      setMessage('يرجى إضافة خيار واحد على الأقل.');
      return;
    }

    const optionsPayload: Record<string, boolean> = {};
    validOptions.forEach(opt => {
      optionsPayload[opt.text.trim()] = opt.isCorrect;
    });

    setSaving(true);
    setMessage('');

    const { data, error } = await supabaseClient
      .from('examples')
      .insert([
        {
          parent_category: selectedCategoryId,
          name: exampleName.trim(),
          question_image_url: questionImageUrl.trim(),
          video_id: selectedVideoId,
          options: optionsPayload,
          thumbnail: thumbnailUrl || null,
        },
      ])
      .select()
      .single();

    setSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(`تم إنشاء المثال بنجاح: ${data?.name ?? 'سجل جديد'}`);
    setExampleName('');
    setQuestionImageUrl('');
    setThumbnailUrl('');
    setDynamicOptions([{ id: Math.random().toString(), text: '', isCorrect: false }]);
  };

  return (
    <div className="teacher-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">الأمثلة</p>
          <h1>إنشاء مثال</h1>
        </div>
        <Link to="/examples" className="ghost-button button-link">العودة للجدول</Link>
      </header>

      <div className="creation-flow">
        <section className="panel create-panel">
          <h2>1. اختيار أو إنشاء قسم</h2>

          <label>
            مستوى القسم
            <input type="number" min="1" value={categoryLevel} onChange={(event) => setCategoryLevel(event.target.value)} />
          </label>

          <label>
            القسم الأب
            <select value={parentCategoryId} onChange={(event) => setParentCategoryId(event.target.value)}>
              <option value="">لا يوجد أب</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name} (مستوى {category.level})</option>
              ))}
            </select>
          </label>

          <label>
            اسم القسم الجديد
            <input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="مثال: أساسيات الهندسة" />
          </label>

          <button className="primary-button" onClick={createCategory}>
            حفظ القسم
          </button>

          <label>
            معرف القسم المختار
            <input value={selectedCategoryId} readOnly placeholder="سيتم نسخ معرف القسم هنا" />
          </label>

          <div style={{ marginTop: '10px' }}>
            <span>أو اختر موجود: </span>
            <select value={selectedCategoryId} onChange={(e) => setSelectedCategoryId(e.target.value)}>
                <option value="">اختر قسماً</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </section>

        <section className="panel create-panel">
          <h2>2. اختيار أو إنشاء فيديو</h2>

          <label>
            ملف الفيديو
            <input
              type="file"
              accept="video/*"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setVideoFile(file);
                if (!file) {
                  setVideoUrl('');
                }
              }}
            />
          </label>

          <button className="primary-button" onClick={uploadVideoToBucket} disabled={uploadingVideo || !videoFile}>
            {uploadingVideo ? 'جاري رفع الفيديو...' : 'رفع الفيديو إلى البوكيت'}
          </button>

          {videoUploadMessage && <div className="form-message" style={{ marginTop: '12px' }}>{videoUploadMessage}</div>}

          {videoUrl && (
            <div style={{ marginTop: '12px', color: '#7dd3fc', fontSize: '0.8rem', wordBreak: 'break-all' }}>
              {videoUrl}
            </div>
          )}

          <label>
            رابط الفيديو (بديل)
            <input value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="https://..." />
          </label>

          <label>
            نوع الوصول
            <select value={String(videoPremium)} onChange={(event) => setVideoPremium(event.target.value === 'true')}>
              <option value="true">مدفوع (Premium)</option>
              <option value="false">مجاني</option>
            </select>
          </label>

          <label>
            نوع الخطة
            <select value={planType} onChange={(event) => setPlanType(event.target.value)}>
              <option value="basicbook">أساسية</option>
              <option value="firstbookAdvance">متخصصة كتاب أول</option>
              <option value="secondbookAdvance">متخصصة كتاب ثاني</option>
            </select>
          </label>

          <button className="primary-button" onClick={createVideo}>
            حفظ الفيديو في قاعدة البيانات
          </button>

          <label>
            معرف الفيديو المختار
            <input value={selectedVideoId} readOnly placeholder="سيتم نسخ معرف الفيديو هنا" />
          </label>

          <div style={{ marginTop: '10px' }}>
            <span>أو اختر موجود: </span>
            <select value={selectedVideoId} onChange={(e) => setSelectedVideoId(e.target.value)}>
                <option value="">اختر فيديو</option>
                {videos.map(v => <option key={v.id} value={v.id}>{v.video_url}</option>)}
            </select>
          </div>
        </section>

        <section className="panel create-panel">
          <h2>3. إنشاء سجل المثال</h2>

          <label>
            اسم المثال
            <input value={exampleName} onChange={(event) => setExampleName(event.target.value)} placeholder="مثال: مراجعة الضرب" />
          </label>

          <label>
            صورة السؤال
            <input type="file" accept="image/*" onChange={handleQuestionImageUpload} />
            {uploadingQuestion && <span>جاري الرفع...</span>}
            {questionImageUrl && <img src={questionImageUrl} alt="Question preview" style={{ width: '100px', marginTop: '10px', display: 'block' }} />}
          </label>

          <label>
            الصورة المصغرة (Thumbnail)
            <input type="file" accept="image/*" onChange={handleThumbnailUpload} />
            {uploadingThumbnail && <span>جاري الرفع...</span>}
            {thumbnailUrl && <img src={thumbnailUrl} alt="Thumbnail preview" style={{ width: '100px', marginTop: '10px', display: 'block' }} />}
          </label>

          <div className="options-section">
            <h3 style={{ fontSize: '1rem', color: '#dfe7f5', marginBottom: '12px' }}>الخيارات (الإجابات)</h3>
            <div className="options-container">
              {dynamicOptions.map((opt) => (
                <div key={opt.id} className="option-item">
                  <input
                    type="text"
                    value={opt.text}
                    onChange={(e) => updateOptionText(opt.id, e.target.value)}
                    placeholder="نص الخيار"
                  />
                  <label>
                    <input
                      type="checkbox"
                      checked={opt.isCorrect}
                      onChange={(e) => updateOptionCorrect(opt.id, e.target.checked)}
                    />
                    صحيح
                  </label>
                  {dynamicOptions.length > 1 && (
                    <button className="remove-option-btn" onClick={() => removeOption(opt.id)}>حذف</button>
                  )}
                </div>
              ))}
            </div>
            <button className="add-option-btn" onClick={addOption}>+ إضافة خيار</button>
          </div>

          <button className="primary-button" style={{ width: '100%', marginTop: '20px' }} onClick={createExample} disabled={saving || uploadingQuestion || uploadingThumbnail}>
            {saving ? 'جاري الإرسال...' : 'إرسال المثال'}
          </button>

          {message && <div className="form-message">{message}</div>}
        </section>
      </div>
    </div>
  );
};
