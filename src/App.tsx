import { Refine } from '@refinedev/core'
import { RefineKbar, RefineKbarProvider } from '@refinedev/kbar'
import routerProvider, {
  DocumentTitleHandler,
  UnsavedChangesNotifier,
} from '@refinedev/react-router'
import { dataProvider, liveProvider } from '@refinedev/supabase'
import { BrowserRouter, Link, NavLink, Route, Routes } from 'react-router'
import { useEffect, useMemo, useState } from 'react'

import './App.css'

import authProvider from './providers/auth'
import { supabaseClient } from './providers/supabase-client'

type TableRow = Record<string, any>

const dashboardStats = [
  { label: 'Profiles', value: '24', change: '+4 this week' },
  { label: 'Videos', value: '86', change: '+12 this month' },
  { label: 'Active subscriptions', value: '18', change: '+3 today' },
  { label: 'Pending payments', value: '6', change: '2 urgent' },
]

const resourceMeta = [
  { key: 'profiles', label: 'Profiles', path: '/profiles', description: 'User accounts and learner details' },
  { key: 'categories', label: 'Categories', path: '/categories', description: 'Topics and parent-child grouping' },
  { key: 'videos', label: 'Videos', path: '/videos', description: 'Video content and premium access' },
  { key: 'examples', label: 'Examples', path: '/examples', description: 'Practice questions and image resources' },
  { key: 'subscriptions', label: 'Subscriptions', path: '/subscriptions', description: 'Plans and status tracking' },
  { key: 'payments', label: 'Payments', path: '/payments', description: 'Receipts, verification, and billing status' },
  { key: 'feedback', label: 'Feedback', path: '/feedback', description: 'User messages and metadata' },
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
}: {
  resource: string
  title: string
  description: string
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
          <p className="eyebrow">Database</p>
          <h1>{title}</h1>
        </div>
        {resource === 'examples' ? (
          <Link to="/examples/create" className="primary-button button-link">Add example</Link>
        ) : (
          <button className="primary-button">Add record</button>
        )}
      </header>

      <div className="panel description-panel">
        <h2>{description}</h2>
        <p>{rows.length} records returned from Supabase</p>
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

function CreateExampleFlow() {
  const { rows: categories, loading: categoriesLoading } = useResourceRows('categories')
  const { rows: videos, loading: videosLoading } = useResourceRows('videos')

  const [categoryName, setCategoryName] = useState('')
  const [categoryLevel, setCategoryLevel] = useState('1')
  const [parentCategoryId, setParentCategoryId] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState('')

  const [videoUrl, setVideoUrl] = useState('')
  const [videoPremium, setVideoPremium] = useState(true)
  const [planType, setPlanType] = useState('basic')
  const [selectedVideoId, setSelectedVideoId] = useState('')

  const [exampleName, setExampleName] = useState('')
  const [questionImageUrl, setQuestionImageUrl] = useState('')
  const [thumbnail, setThumbnail] = useState('')
  const [options, setOptions] = useState('["A","B","C","D"]')

  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const createCategory = async () => {
    if (!categoryName.trim()) {
      setMessage('Category name is required.')
      return
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
      .single()

    if (error) {
      setMessage(error.message)
      return
    }

    setSelectedCategoryId(data.id)
    setMessage('Category created. Now add or select the video before creating the example.')
  }

  const createVideo = async () => {
    if (!videoUrl.trim()) {
      setMessage('Video URL is required.')
      return
    }

    const { data, error } = await supabaseClient
      .from('videos')
      .insert([
        {
          video_url: videoUrl.trim(),
          is_premium: videoPremium,
          plan_type: planType,
        },
      ])
      .select()
      .single()

    if (error) {
      setMessage(error.message)
      return
    }

    setSelectedVideoId(data.id)
    setMessage('Video created successfully. You can now create the example row.')
  }

  const createExample = async () => {
    if (!selectedCategoryId) {
      setMessage('Create or select a category first.')
      return
    }

    if (!selectedVideoId) {
      setMessage('Create or select a video first.')
      return
    }

    if (!exampleName.trim() || !questionImageUrl.trim()) {
      setMessage('Example name and question image URL are required.')
      return
    }

    let parsedOptions: unknown = []
    try {
      parsedOptions = JSON.parse(options)
    } catch {
      setMessage('Options must be valid JSON array text.')
      return
    }

    setSaving(true)
    setMessage('')

    const { data, error } = await supabaseClient
      .from('examples')
      .insert([
        {
          parent_category: selectedCategoryId,
          name: exampleName.trim(),
          question_image_url: questionImageUrl.trim(),
          video_id: selectedVideoId,
          options: parsedOptions,
          thumbnail: thumbnail.trim() || null,
        },
      ])
      .select()
      .single()

    setSaving(false)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage(`Example created successfully: ${data?.name ?? 'new record'}`)
    setExampleName('')
    setQuestionImageUrl('')
    setThumbnail('')
    setOptions('["A","B","C","D"]')
  }

  return (
    <div className="teacher-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Examples</p>
          <h1>Create example</h1>
        </div>
        <Link to="/examples" className="ghost-button button-link">Back to table</Link>
      </header>

      <div className="creation-flow">
        <section className="panel create-panel">
          <h2>1. Choose or create category</h2>

          <label>
            Category level
            <input type="number" min="1" value={categoryLevel} onChange={(event) => setCategoryLevel(event.target.value)} />
          </label>

          <label>
            Parent category
            <select value={parentCategoryId} onChange={(event) => setParentCategoryId(event.target.value)}>
              <option value="">No parent</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name} (Level {category.level})</option>
              ))}
            </select>
          </label>

          <label>
            New category name
            <input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Example: Geometry Basics" />
          </label>

          <button className="primary-button" onClick={createCategory} disabled={categoriesLoading}>
            Save category
          </button>

          <label>
            Selected category id
            <input value={selectedCategoryId} readOnly placeholder="Category ID will be copied here" />
          </label>
        </section>

        <section className="panel create-panel">
          <h2>2. Choose or create video</h2>

          <label>
            Video URL
            <input value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="https://..." />
          </label>

          <label>
            Premium
            <select value={String(videoPremium)} onChange={(event) => setVideoPremium(event.target.value === 'true')}>
              <option value="true">Premium</option>
              <option value="false">Free</option>
            </select>
          </label>

          <label>
            Plan type
            <select value={planType} onChange={(event) => setPlanType(event.target.value)}>
              <option value="basic">basic</option>
              <option value="pro">pro</option>
              <option value="premium">premium</option>
            </select>
          </label>

          <button className="primary-button" onClick={createVideo} disabled={videosLoading}>
            Save video
          </button>

          <label>
            Selected video id
            <input value={selectedVideoId} readOnly placeholder="Video ID will be copied here" />
          </label>
        </section>

        <section className="panel create-panel">
          <h2>3. Create example record</h2>

          <label>
            Example name
            <input value={exampleName} onChange={(event) => setExampleName(event.target.value)} placeholder="Example: Multiplication review" />
          </label>

          <label>
            Question image URL
            <input value={questionImageUrl} onChange={(event) => setQuestionImageUrl(event.target.value)} placeholder="https://..." />
          </label>

          <label>
            Thumbnail URL
            <input value={thumbnail} onChange={(event) => setThumbnail(event.target.value)} placeholder="Optional" />
          </label>

          <label>
            Options JSON
            <textarea value={options} onChange={(event) => setOptions(event.target.value)} rows={5} />
          </label>

          <button className="primary-button" onClick={createExample} disabled={saving}>
            {saving ? 'Submitting...' : 'Submit example'}
          </button>

          {message && <div className="form-message">{message}</div>}
        </section>
      </div>
    </div>
  )
}

function TeacherDashboard() {
  return (
    <div className="teacher-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Teacher workspace</p>
          <h1>Dashboard</h1>
        </div>
        <button className="primary-button">New content</button>
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
            <h2>Learning flow</h2>
            <button className="ghost-button">Overview</button>
          </div>
          <ul className="list-stack">
            <li>
              <div>
                <strong>Course categories</strong>
                <span>Organize curriculum by level</span>
              </div>
              <time>Ready</time>
            </li>
            <li>
              <div>
                <strong>Video library</strong>
                <span>Premium and public content</span>
              </div>
              <time>Live</time>
            </li>
            <li>
              <div>
                <strong>Practice examples</strong>
                <span>Questions connected to videos</span>
              </div>
              <time>Draft</time>
            </li>
          </ul>
        </article>

        <article className="panel">
          <div className="panel-header">
            <h2>Schema overview</h2>
            <button className="ghost-button">Refresh</button>
          </div>
          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th>Section</th>
                  <th>Purpose</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {resourceMeta.map((item) => (
                  <tr key={item.key}>
                    <td>{item.label}</td>
                    <td>{item.description}</td>
                    <td><span className="status-badge">Active</span></td>
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
    { label: 'Dashboard', to: '/' },
    ...resourceMeta.map((item) => ({ label: item.label, to: item.path })),
  ]

  return (
    <div className="teacher-shell">
      <aside className="sidebar">
        <div className="brand">TeachAdmin</div>
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
              element={<DatabaseTablePage resource={item.key} title={item.label} description={item.description} />}
            />
          ))}
          <Route path="/examples/create" element={<CreateExampleFlow />} />
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