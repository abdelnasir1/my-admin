import { Refine } from '@refinedev/core'
import { RefineKbar, RefineKbarProvider } from '@refinedev/kbar'
import routerProvider, {
  DocumentTitleHandler,
  UnsavedChangesNotifier,
} from '@refinedev/react-router'
import { dataProvider, liveProvider } from '@refinedev/supabase'
import { BrowserRouter, Link, NavLink, Route, Routes } from 'react-router'
import { useEffect, useMemo, useState } from 'react'

import { CreateExamplePage, ExampleList } from './pages/examples'
import { CategoryList, CreateCategoryPage } from './pages/categories'
import './App.css'

import authProvider from './providers/auth'
import { supabaseClient } from './providers/supabase-client'

type TableRow = Record<string, any>

const dashboardStats = [
  { label: 'الملفات الشخصية', value: '24', change: '+4 هذا الأسبوع' },
  { label: 'الفيديوهات', value: '86', change: '+12 هذا الشهر' },
  { label: 'الاشتراكات النشطة', value: '18', change: '+3 اليوم' },
  { label: 'المدفوعات المعلقة', value: '6', change: '2 عاجل' },
]

const resourceMeta = [
  { key: 'profiles', label: 'الملفات الشخصية', path: '/profiles', description: 'حسابات المستخدمين وتفاصيل المتعلمين', explanation: 'هذا القسم يتيح لك إدارة بيانات الطلاب وأدائهم.' },
  { key: 'categories', label: 'الأقسام', path: '/categories', description: 'المواضيع والمجموعات الأب والابن', explanation: 'استخدم هذا لتنظيم المنهج الدراسي في مستويات وأقسام منطقية.' },
  { key: 'videos', label: 'الفيديوهات', path: '/videos', description: 'محتوى الفيديو والوصول المتميز', explanation: 'إدارة جميع دروس الفيديو وتحديد أي منها يتطلب اشتراكاً مدفوعاً.' },
  { key: 'examples', label: 'الأمثلة', path: '/examples', description: 'أسئلة الممارسة وموارد الصور', explanation: 'إضافة وتعديل الأسئلة التفاعلية المرتبطة بالفيديوهات لتعزيز التعلم.' },
  { key: 'subscriptions', label: 'الاشتراكات', path: '/subscriptions', description: 'الخطط وتتبع الحالة', explanation: 'متابعة اشتراكات المستخدمين وتواريخ انتهاء الصلاحية.' },
  { key: 'payments', label: 'المدفوعات', path: '/payments', description: 'الإيصالات، التحقق، وحالة الفواتير', explanation: 'مراجعة وتأكيد عمليات الدفع التي قام بها الطلاب.' },
  { key: 'feedback', label: 'الملاحظات', path: '/feedback', explanation: 'رسائل المستخدمين والبيانات الوصفية', description: 'استقبال الردود والاستفسارات من الطلاب لتحسين الخدمة.' },
]

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number' || typeof value === 'bigint' || typeof value === 'string') {
    return String(value)
  }
  if (Array.isArray(value)) {
    return value.map((item: unknown) => formatValue(item)).join(', ')
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return '[object Object]'
    }
  }
  return String(value)
}

function useResourceRows(resource: string) {
  const [rows, setRows] = useState<TableRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabaseClient.from(resource).select('*').limit(50)

      if (!active) return

      if (fetchError) {
        setError(fetchError.message)
        setRows([])
      } else {
        setRows(data ?? [])
      }

      setLoading(false)
    }

    load()

    return () => {
      active = false
    }
  }, [resource])

  return { rows, loading, error }
}

function DatabaseTablePage({
  resource,
  title,
  description,
  explanation,
}: {
  resource: string
  title: string
  description: string
  explanation?: string
}) {
  const { rows, loading, error } = useResourceRows(resource)

  const columns = useMemo(() => {
    const keys = new Set<string>()
    rows.forEach((row) => Object.keys(row).forEach((key) => keys.add(key)))
    return [...keys].slice(0, 6)
  }, [rows])

  return (
    <div className="teacher-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">قاعدة البيانات</p>
          <h1>{title}</h1>
        </div>
        {resource === 'examples' ? (
          <Link to="/examples/create" className="primary-button button-link">إضافة مثال</Link>
        ) : (
          <button className="primary-button">إضافة سجل</button>
        )}
      </header>

      <div className="panel description-panel">
        <h2>{description}</h2>
        {explanation && <p style={{ color: '#a5b4fc', marginBottom: '10px' }}>{explanation}</p>}
        <p>{rows.length} سجل تم استرجاعه من Supabase</p>
      </div>

      {loading ? (
        <div className="empty-state"><p>Loading records...</p></div>
      ) : error ? (
        <div className="empty-state"><h2>Connection issue</h2><p>{error}</p></div>
      ) : rows.length === 0 ? (
        <div className="empty-state">
          <h2>No data yet</h2>
          <p>Connect this page to your table and insert rows in Supabase to see them here.</p>
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
                <tr key={`${resource}-${index}`}>
                  {columns.map((column) => (
                    <td key={`${resource}-${column}-${index}`}>{formatValue(row[column])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function TeacherDashboard() {
  return (
    <div className="teacher-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">مساحة عمل المعلم</p>
          <h1>لوحة التحكم</h1>
        </div>
        <button className="primary-button">محتوى جديد</button>
      </header>

      <section className="stats-grid">
        {dashboardStats.map((item) => (
          <article key={item.label} className="stat-card">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.change}</small>
          </article>
        ))}
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-header">
            <h2>سير التعلم</h2>
            <button className="ghost-button">نظرة عامة</button>
          </div>
          <ul className="list-stack">
            <li>
              <div>
                <strong>أقسام الدورة</strong>
                <span>تنظيم المنهج حسب المستوى</span>
              </div>
              <time>جاهز</time>
            </li>
            <li>
              <div>
                <strong>مكتبة الفيديو</strong>
                <span>المحتوى المتميز والعام</span>
              </div>
              <time>مباشر</time>
            </li>
            <li>
              <div>
                <strong>أمثلة الممارسة</strong>
                <span>أسئلة مرتبطة بالفيديوهات</span>
              </div>
              <time>مسودة</time>
            </li>
          </ul>
        </article>

        <article className="panel">
          <div className="panel-header">
            <h2>نظرة عامة على المخطط</h2>
            <button className="ghost-button">تحديث</button>
          </div>
          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th>القسم</th>
                  <th>الغرض</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {resourceMeta.map((item) => (
                  <tr key={item.key}>
                    <td>{item.label}</td>
                    <td>{item.description}</td>
                    <td><span className="status-badge">نشط</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </div>
  )
}

function Shell() {
  const navItems = [
    { label: 'لوحة التحكم', to: '/' },
    ...resourceMeta.map((item) => ({ label: item.label, to: item.path })),
  ]

  return (
    <div className="teacher-shell">
      <aside className="sidebar">
        <div className="brand">إدارة التعليم</div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'active' : '')}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="main-panel">
        <Routes>
          <Route index element={<TeacherDashboard />} />
          {resourceMeta.map((item) => (
            <Route
              key={item.key}
              path={item.path}
              element={
                item.key === 'examples' ? (
                  <ExampleList />
                ) : item.key === 'categories' ? (
                  <CategoryList />
                ) : (
                  <DatabaseTablePage resource={item.key} title={item.label} description={item.description} explanation={item.explanation} />
                )
              }
            />
          ))}
          <Route path="/examples/create" element={<CreateExamplePage />} />
          <Route path="/categories/create" element={<CreateCategoryPage />} />
        </Routes>
      </main>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <RefineKbarProvider>
        <Refine
          dataProvider={dataProvider(supabaseClient)}
          liveProvider={liveProvider(supabaseClient)}
          authProvider={authProvider}
          routerProvider={routerProvider}
          options={{
            syncWithLocation: true,
            warnWhenUnsavedChanges: true,
          }}
        >
          <Shell />
          <RefineKbar />
          <UnsavedChangesNotifier />
          <DocumentTitleHandler />
        </Refine>
      </RefineKbarProvider>
    </BrowserRouter>
  )
}

export default App