import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router';
import ReactFlow, {
  Background,
  Controls,
  Handle,
  Position,
  Node,
  Edge,
  MarkerType,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  useReactFlow
} from 'reactflow';
import { supabaseClient } from '../../providers/supabase-client';
import { useDashboardStore } from '../../store/dashboardStore';

import 'reactflow/dist/style.css';

interface Category {
  id: string;
  name: string;
  level: number;
  parent_id: string | null;
}

const CategoryNode = ({ data }: { data: any }) => {
  return (
    <div style={{
      padding: '15px',
      borderRadius: '12px',
      background: 'rgba(30, 41, 59, 0.95)',
      border: `2px solid ${data.isRoot ? '#6366f1' : '#475569'}`,
      boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
      minWidth: '200px',
      color: '#fff',
      textAlign: 'center',
    }}>
      <Handle type="target" position={Position.Top} style={{ background: '#6366f1' }} />

      <div style={{ fontWeight: 'bold', fontSize: '15px', marginBottom: '8px' }}>{data.label}</div>
      <div style={{ fontSize: '11px', color: '#a5b4fc', marginBottom: '12px' }}>مستوى {data.level}</div>

      <Link
        to={`/categories/create?parentId=${data.id}&level=${data.level}`}
        style={{
          fontSize: '11px',
          background: '#2dd4bf',
          color: '#000',
          padding: '6px 12px',
          borderRadius: '6px',
          textDecoration: 'none',
          fontWeight: 'bold',
          display: 'inline-block'
        }}
      >
        + إضافة ابن
      </Link>

      <Handle type="source" position={Position.Bottom} style={{ background: '#6366f1' }} />
    </div>
  );
};

const nodeTypes = {
  category: CategoryNode,
};

const CategoryMapContent = ({ nodes, edges, onNodesChange, onEdgesChange }: any) => {
  const { setCategoryViewport, categoryViewport } = useDashboardStore();
  const { setViewport } = useReactFlow();

  const onMoveEnd = useCallback((_event: any, viewport: any) => {
    setCategoryViewport(viewport);
  }, [setCategoryViewport]);

  useEffect(() => {
    if (categoryViewport) {
      setViewport(categoryViewport);
    }
  }, [setViewport, categoryViewport]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onMoveEnd={onMoveEnd}
      nodeTypes={nodeTypes}
      fitView={!categoryViewport}
      fitViewOptions={{ padding: 0.1 }}
    >
      <Background color="#1e293b" gap={25} />
      <Controls />
    </ReactFlow>
  );
};

export const CategoryList = () => {
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Direct Fetch from Supabase
  useEffect(() => {
    async function load() {
        setIsLoading(true);
        const { data, error: fetchErr } = await supabaseClient.from('categories').select('*');

        if (fetchErr) {
            setIsError(true);
            setError(fetchErr.message);
        } else {
            setAllCategories(data ?? []);
        }
        setIsLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (allCategories.length > 0) {
      const initialNodes: Node[] = allCategories.map((cat) => {
        const levelNodes = allCategories.filter(c => Number(c.level) === Number(cat.level));
        const indexInLevel = levelNodes.indexOf(cat);

        return {
          id: cat.id,
          type: 'category',
          data: {
            label: cat.name,
            level: cat.level,
            id: cat.id,
            isRoot: Number(cat.level) === 1
          },
          position: {
              x: indexInLevel * 250,
              y: (Number(cat.level) - 1) * 200
          },
        };
      });

      const initialEdges: Edge[] = allCategories
        .filter((cat) => cat.parent_id)
        .map((cat) => ({
          id: `e-${cat.parent_id}-${cat.id}`,
          source: cat.parent_id!,
          target: cat.id,
          animated: true,
          style: { stroke: '#6366f1', strokeWidth: 3 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#6366f1',
          },
        }));

      setNodes(initialNodes);
      setEdges(initialEdges);
    }
  }, [allCategories, setNodes, setEdges]);

  if (isError) {
    return (
      <div className="teacher-page">
        <div className="empty-state">
          <h2>خطأ في الاتصال</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="teacher-page">
        <div className="empty-state">
          <p>جاري تحميل الخريطة...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="teacher-page" style={{ height: 'calc(100vh - 150px)', display: 'flex', flexDirection: 'column' }}>
      <header className="page-header">
        <div>
          <p className="eyebrow">التنظيم البصري</p>
          <h1>خريطة الأقسام</h1>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
             <button
                onClick={() => window.location.reload()}
                className="ghost-button"
                style={{ fontSize: '12px' }}
             >
                تحديث الصفحة
             </button>
            <Link to="/categories/create" className="primary-button button-link">إضافة قسم رئيسي</Link>
        </div>
      </header>

      <div style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', marginBottom: '10px', fontSize: '13px' }}>
        <strong>حالة البيانات:</strong> تم تحميل {allCategories.length} قسم.
      </div>

      <div style={{
        flex: 1,
        minHeight: '500px',
        background: '#0f172a',
        borderRadius: '20px',
        border: '3px solid #6366f1',
        overflow: 'hidden',
      }}>
        {allCategories.length > 0 ? (
          <ReactFlowProvider>
            <CategoryMapContent
              allCategories={allCategories}
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
            />
          </ReactFlowProvider>
        ) : (
            <div className="empty-state" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                <h2>لا توجد بيانات بصرية</h2>
                <p>قاعدة البيانات لم ترجع أي أقسام.</p>
            </div>
        )}
      </div>
    </div>
  );
};
