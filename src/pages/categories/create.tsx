import { useList } from '@refinedev/core';
import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router';
import { supabaseClient } from '../../providers/supabase-client';

export const CreateCategoryPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const parentParam = searchParams.get('parentId');
  const levelParam = searchParams.get('level');

  const { data: categoriesData, isLoading: categoriesLoading } = useList({
    resource: 'categories',
    pagination: { mode: 'off' },
  });
  const categories = categoriesData?.data ?? [];

  const [name, setName] = useState('');
  const [level, setLevel] = useState(levelParam ? Number(levelParam) + 1 : 1);
  const [parentId, setParentId] = useState(parentParam || '');

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Update level automatically if parent is selected manually
  useEffect(() => {
    if (parentId) {
      const parent = categories.find(c => String(c.id) === String(parentId));
      if (parent) {
        setLevel(Number(parent.level) + 1);
      }
    } else {
      setLevel(1);
    }
  }, [parentId, categories]);

  const createCategory = async () => {
    if (!name.trim()) {
      setMessage('اسم القسم مطلوب.');
      return;
    }

    setSaving(true);
    setMessage('');

    const { error } = await supabaseClient
      .from('categories')
      .insert([
        {
          name: name.trim(),
          level: level,
          parent_id: parentId || null,
        },
      ]);

    setSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage('تم إنشاء القسم بنجاح.');
    setTimeout(() => navigate('/categories'), 1000);
  };

  return (
    <div className="teacher-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">الأقسام</p>
          <h1>إنشاء قسم جديد</h1>
        </div>
        <Link to="/categories" className="ghost-button button-link">العودة للشجرة</Link>
      </header>

      <div className="creation-flow" style={{ gridTemplateColumns: '1fr' }}>
        <section className="panel create-panel" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <label>
            اسم القسم
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: الرياضيات المتقدمة"
            />
          </label>

          <label>
            القسم الأب
            <select value={parentId} onChange={(e) => setParentId(e.target.value)}>
              <option value="">لا يوجد (قسم رئيسي - مستوى 1)</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (مستوى {c.level})
                </option>
              ))}
            </select>
          </label>

          <label>
            المستوى (يتم حسابه تلقائياً)
            <input
              type="number"
              value={level}
              readOnly
              style={{ opacity: 0.7, background: 'rgba(255,255,255,0.05)', cursor: 'not-allowed' }}
            />
          </label>

          <button
            className="primary-button"
            style={{ width: '100%', marginTop: '20px' }}
            onClick={createCategory}
            disabled={saving}
          >
            {saving ? 'جاري الحفظ...' : 'حفظ القسم'}
          </button>

          {message && <div className="form-message">{message}</div>}
        </section>
      </div>
    </div>
  );
};
