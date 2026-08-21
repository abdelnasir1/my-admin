import { useEffect, useMemo, useState } from 'react';
import { supabaseClient } from '../../providers/supabase-client';
import { useDashboardStore } from '../../store/dashboardStore';

type TableRow = Record<string, any>;

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'نعم' : 'لا';
  if (typeof value === 'number' || typeof value === 'bigint' || typeof value === 'string') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map((item: unknown) => formatValue(item)).join(', ');
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return '[object Object]';
    }
  }
  return String(value);
}

export const ExampleList = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const { exampleCategoryId, setExampleCategoryId } = useDashboardStore();
  const [rows, setRows] = useState<TableRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const deleteExample = async (id: string) => {
    if (!window.confirm('هل تريد حذف هذا المثال؟')) return;

    const { error: deleteError } = await supabaseClient.from('examples').delete().eq('id', id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setRows((currentRows) => currentRows.filter((row) => row.id !== id));
  };

  // Fetch Level 3 Categories
  useEffect(() => {
    async function loadCategories() {
      const { data, error } = await supabaseClient
        .from('categories')
        .select('id, name')
        .eq('level', 3);

      if (!error && data) {
        setCategories(data);
      }
    }
    loadCategories();
  }, []);

  // Fetch Examples (Direct Supabase Call)
  useEffect(() => {
    async function loadExamples() {
      setIsLoading(true);
      setError(null);

      let query = supabaseClient.from('examples').select('*');

      if (exampleCategoryId) {
        query = query.eq('parent_category', exampleCategoryId);
      }

      const { data, error: fetchError } = await query.limit(100);

      if (fetchError) {
        setError(fetchError.message);
        setRows([]);
      } else {
        setRows(data ?? []);
      }
      setIsLoading(false);
    }
    loadExamples();
  }, [exampleCategoryId]);

  const columns = useMemo(() => {
    if (rows.length === 0) return [];
    const keys = new Set<string>();
    rows.forEach((row) => Object.keys(row).forEach((key) => keys.add(key)));
    const preferredOrder = ['name', 'parent_category', 'video_id', 'options', 'question_image_url', 'thumbnail'];
    return Array.from(keys).sort((a, b) => {
      const idxA = preferredOrder.indexOf(a);
      const idxB = preferredOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    }).slice(0, 8);
  }, [rows]);

  return (
    <div className="teacher-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">قاعدة البيانات</p>
          <h1>الأمثلة</h1>
        </div>
      </header>

      <div className="panel description-panel">
        <h2>تصفية وعرض الأسئلة</h2>
        <div style={{ marginTop: '15px', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <label htmlFor="category-filter" style={{ color: '#a5b4fc', fontWeight: 'bold' }}>تصفية حسب القسم </label>
          <select
            id="category-filter"
            value={exampleCategoryId}
            onChange={(e) => setExampleCategoryId(e.target.value)}
            style={{
              background: 'rgba(15, 23, 42, 0.9)',
              color: 'white',
              border: '1px solid rgba(148, 163, 184, 0.3)',
              padding: '8px 12px',
              borderRadius: '8px',
              minWidth: '200px'
            }}
          >
            <option value="">جميع الأقسام</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
        <p style={{ marginTop: '10px' }}>{rows.length} سجل تم استرجاعه</p>
      </div>

      {isLoading ? (
        <div className="empty-state"><p>جاري تحميل السجلات...</p></div>
      ) : error ? (
        <div className="empty-state"><h2>مشكلة في الاتصال</h2><p>{error}</p></div>
      ) : rows.length === 0 ? (
        <div className="empty-state">
          <h2>لا توجد بيانات</h2>
          <p>{exampleCategoryId ? "لا توجد أمثلة مرتبطة بهذا القسم حالياً." : "قاعدة البيانات فارغة "}</p>
        </div>
      ) : (
        <div className="table-card large-table">
          <table>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
                <th>الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`examples-${row.id ?? index}`}>
                  {columns.map((column) => (
                    <td key={`examples-${column}-${index}`}>
                      {column === 'question_image_url' || column === 'thumbnail' ? (
                        <a href={row[column]} target="_blank" rel="noreferrer" style={{ color: '#6366f1' }}>عرض الصورة</a>
                      ) : (
                        formatValue(row[column])
                      )}
                    </td>
                  ))}
                  <td>
                    <button type="button" className="remove-option-btn" onClick={() => void deleteExample(row.id)}>
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
