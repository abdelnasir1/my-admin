import { useList } from '@refinedev/core';
import { useMemo } from 'react';
import { Link } from 'react-router';
import Tree from 'react-d3-tree';

interface Category {
  id: string;
  name: string;
  level: number;
  parent_id: string | null;
}

interface D3Node {
  name: string;
  attributes: {
    id: string;
    level: string;
  };
  children: D3Node[];
}

export const CategoryList = () => {
  const { data, isLoading, isError, error } = useList<Category>({
    resource: 'categories',
    pagination: { mode: 'off' },
  });

  const allCategories = data?.data ?? [];

  const treeData = useMemo(() => {
    if (allCategories.length === 0) return null;

    const idMap: Record<string, D3Node> = {};

    // First pass: create all nodes
    allCategories.forEach(cat => {
      idMap[cat.id] = {
        name: cat.name,
        attributes: {
          id: cat.id,
          level: String(cat.level),
        },
        children: [],
      };
    });

    const roots: D3Node[] = [];

    // Second pass: build hierarchy
    allCategories.forEach(cat => {
      const node = idMap[cat.id];
      if (cat.parent_id && idMap[cat.parent_id]) {
        idMap[cat.parent_id].children.push(node);
      } else if (Number(cat.level) === 1 || !cat.parent_id) {
        roots.push(node);
      }
    });

    // react-d3-tree expects a single root or an array
    // If multiple roots, we wrap them in a virtual root
    if (roots.length > 1) {
      return {
        name: 'المنهج الدراسي',
        attributes: { id: 'root', level: '0' },
        children: roots,
      };
    }
    return roots[0] || null;
  }, [allCategories]);

  if (isError) {
    return (
      <div className="teacher-page">
        <div className="empty-state">
          <h2>خطأ في الاتصال</h2>
          <p>{error?.message}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="teacher-page">
        <div className="empty-state">
          <p>جاري تحميل الشجرة...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="teacher-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">التنظيم</p>
          <h1>شجرة الأقسام (D3)</h1>
        </div>
        <Link to="/categories/create" className="primary-button button-link">إضافة قسم رئيسي</Link>
      </header>

      <div className="panel description-panel">
        <h2>هيكل المنهج الدراسي التفاعلي</h2>
        <p>يمكنك سحب الشجرة وتكبيرها/تصغيرها لرؤية التفاصيل.</p>
      </div>

      <div id="treeWrapper" style={{ width: '100%', height: '600px', background: 'rgba(15, 23, 42, 0.8)', borderRadius: '16px', border: '1px solid rgba(148, 163, 184, 0.12)', overflow: 'hidden' }}>
        {treeData ? (
          <Tree
            data={treeData}
            orientation="horizontal"
            pathFunc="step"
            translate={{ x: 100, y: 300 }}
            nodeSize={{ x: 250, y: 100 }}
            renderCustomNodeElement={(rd3tProps) => (
              <g>
                <circle r="20" fill="#6366f1" />
                <text
                  fill="#ffffff"
                  strokeWidth="0.5"
                  x="30"
                  y="-10"
                  style={{ fontSize: '14px', fontWeight: 'bold' }}
                >
                  {rd3tProps.nodeDatum.name}
                </text>
                <text
                  fill="#a5b4fc"
                  x="30"
                  y="15"
                  style={{ fontSize: '12px' }}
                >
                  مستوى {rd3tProps.nodeDatum.attributes?.level}
                </text>
                <foreignObject width="100" height="40" x="30" y="25">
                   <div style={{ display: 'flex', gap: '5px' }}>
                      <Link
                        to={`/categories/create?parentId=${rd3tProps.nodeDatum.attributes?.id}&level=${rd3tProps.nodeDatum.attributes?.level}`}
                        style={{
                          fontSize: '10px',
                          background: 'rgba(45, 212, 191, 0.2)',
                          color: '#2dd4bf',
                          padding: '2px 5px',
                          borderRadius: '4px',
                          textDecoration: 'none',
                          border: '1px solid rgba(45, 212, 191, 0.4)'
                        }}
                      >
                        + ابن
                      </Link>
                   </div>
                </foreignObject>
              </g>
            )}
            styles={{
              links: {
                stroke: '#475569',
                strokeWidth: 2,
              },
              nodes: {
                node: {
                  circle: {
                    fill: '#6366f1',
                    stroke: '#4338ca',
                    strokeWidth: 2,
                  },
                },
                leafNode: {
                  circle: {
                    fill: '#10b981',
                    stroke: '#059669',
                    strokeWidth: 2,
                  },
                },
              }
            }}
          />
        ) : (
          <div className="empty-state">
            <p>لا توجد بيانات متاحة لعرض الشجرة.</p>
          </div>
        )}
      </div>
    </div>
  );
};
