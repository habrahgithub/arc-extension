import { useState } from 'react';
import { Tabs } from '@radix-ui/react-tabs';
import SidebarPanel from './components/SidebarPanel';
import TaskBoardPanel from './components/TaskBoardPanel';
import RuntimeStatusPanel from './components/RuntimeStatusPanel';
import ReviewPanel from './components/ReviewPanel';
import CodeSnippets from './components/CodeSnippets';

export default function App() {
  const [activeView, setActiveView] = useState<'sidebar' | 'taskboard' | 'runtime' | 'review' | 'code'>('sidebar');

  return (
    <div className="size-full bg-[#1e1e1e] text-[#cccccc] font-mono overflow-hidden">
      {/* VS Code-style header */}
      <div className="h-12 bg-[#323233] border-b border-[#2d2d30] flex items-center px-4 gap-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#fc615d]" />
          <div className="w-3 h-3 rounded-full bg-[#fdbc40]" />
          <div className="w-3 h-3 rounded-full bg-[#34c749]" />
        </div>
        <div className="text-sm">ARC XT — Audit Ready Core Extension</div>
      </div>

      {/* Navigation tabs */}
      <div className="h-10 bg-[#252526] border-b border-[#2d2d30] flex items-center px-4 gap-1">
        {[
          { id: 'sidebar', label: 'Sidebar Panel' },
          { id: 'taskboard', label: 'Task Board' },
          { id: 'runtime', label: 'Runtime Status' },
          { id: 'review', label: 'Review Surface' },
          { id: 'code', label: 'HTML/CSS Snippets' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id as typeof activeView)}
            className={`px-4 py-2 text-xs transition-colors ${
              activeView === tab.id
                ? 'bg-[#1e1e1e] text-white border-t-2 border-[#007acc]'
                : 'text-[#969696] hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-auto" style={{ height: 'calc(100vh - 88px)' }}>
        {activeView === 'sidebar' && (
          <div className="p-8 flex justify-center">
            <SidebarPanel />
          </div>
        )}

        {activeView === 'taskboard' && (
          <div className="p-8">
            <TaskBoardPanel />
          </div>
        )}

        {activeView === 'runtime' && (
          <div className="p-8">
            <RuntimeStatusPanel />
          </div>
        )}

        {activeView === 'review' && (
          <div className="p-8">
            <ReviewPanel />
          </div>
        )}

        {activeView === 'code' && (
          <div className="p-8">
            <CodeSnippets />
          </div>
        )}
      </div>
    </div>
  );
}
