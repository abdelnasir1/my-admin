import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

interface DashboardState {
  // Example tab state
  exampleCategoryId: string;
  setExampleCategoryId: (id: string) => void;

  // Category tab state (React Flow)
  categoryViewport: Viewport | null;
  setCategoryViewport: (viewport: Viewport) => void;

  // General UI state
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      exampleCategoryId: "",
      setExampleCategoryId: (id: string) => set({ exampleCategoryId: id }),

      categoryViewport: null,
      setCategoryViewport: (viewport: Viewport) => set({ categoryViewport: viewport }),

      activeTab: "/",
      setActiveTab: (tab: string) => set({ activeTab: tab }),
    }),
    {
      name: 'dashboard-storage',
    }
  )
);
