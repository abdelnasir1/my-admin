import { useList } from '@refinedev/core';
import { useMemo } from 'react';
import { Link } from 'react-router';

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
  const { data, isLoading, isError, error } = useList({
    resource: 'examples',
  });

  const rows = data?.data ?? [];

  const columns = useMemo(() => {
    const keys = new Set<string>();
    rows.forEach((row) => Object.keys(row).forEach((key) => keys.add(key)));
    return [...keys].slice(0, 6);
  }, [rows]);

  return (
    <div className="teacher-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">قاعدة البيانات</p>
          <h1>الأمثلة</h1>
        </div>
        <Link to="/examples/create" className="primary-button button-link">إضافة مثال</Link>
      </header>

      <div className="panel description-panel">
        <h2>أسئلة الممارسة وموارد الصور</h2>
        <p style={{ color: '#a5b4fc', marginBottom: '10px' }}>إضافة وتعديل الأسئلة التفاعلية المرتبطة بالفيديوهات لتعزيز التعلم.</p>
        <p>{rows.length} سجل تم استرجاعه من Supabase</p>
      </div>

      {isLoading ? (
        <div className="empty-state"><p>جاري تحميل السجلات...</p></div>
      ) : isError ? (
        <div className="empty-state"><h2>مشكلة في الاتصال</h2><p>{error?.message}</p></div>
      ) : rows.length === 0 ? (
        <div className="empty-state">
          <h2>لا توجد بيانات بعد</h2>
          <p>قم بتوصيل هذه الصفحة بجدولك وأدخل السجلات في Supabase لرؤيتها هنا.</p>
        </div>
      ) : (
        <div className="table-card large-table">
          <table>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`examples-${index}`}>
                  {columns.map((column) => (
                    <td key={`examples-${column}-${index}`}>{formatValue(row[column])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
