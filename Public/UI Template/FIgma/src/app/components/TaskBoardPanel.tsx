import { CheckCircle2, Circle, Loader2, X } from 'lucide-react';

export default function TaskBoardPanel() {
  const tasks = [
    {
      phase: 'Planning',
      items: [
        { id: 'T-001', status: 'completed', summary: 'Define authentication requirements' },
        { id: 'T-002', status: 'completed', summary: 'Design database schema' },
      ]
    },
    {
      phase: 'Implementation',
      items: [
        { id: 'T-003', status: 'in_progress', summary: 'Implement user authentication flow', active: true },
        { id: 'T-004', status: 'created', summary: 'Create user dashboard component' },
        { id: 'T-005', status: 'created', summary: 'Add password reset functionality' },
      ]
    },
    {
      phase: 'Testing',
      items: [
        { id: 'T-006', status: 'created', summary: 'Write integration tests for auth' },
        { id: 'T-007', status: 'created', summary: 'Perform security audit' },
      ]
    },
  ];

  return (
    <div className="max-w-[800px] mx-auto bg-[#252526] border border-[#2d2d30] rounded-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2d2d30] bg-[#2d2d30]">
        <div className="flex items-center gap-3">
          <div className="text-[13px] text-white">Task Board</div>
          <div className="text-[11px] text-[#858585] font-mono">/workspace/proj/.arc/blueprints/</div>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 bg-[#0e639c] hover:bg-[#1177bb] text-white text-[11px] rounded-sm transition-colors">
            Select Task
          </button>
          <button className="px-3 py-1 bg-[#3c3c3c] hover:bg-[#4c4c4c] text-[#858585] hover:text-white text-[11px] rounded-sm transition-colors flex items-center gap-1">
            <X className="w-3 h-3" />
            Clear
          </button>
        </div>
      </div>

      {/* Task sections */}
      <div className="p-4 space-y-6">
        {tasks.map((section) => (
          <div key={section.phase}>
            {/* Phase header */}
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px flex-1 bg-[#3e3e42]" />
              <div className="text-[11px] uppercase tracking-wider text-[#858585] px-2">
                {section.phase}
              </div>
              <div className="h-px flex-1 bg-[#3e3e42]" />
            </div>

            {/* Task list */}
            <div className="space-y-2">
              {section.items.map((task) => (
                <div
                  key={task.id}
                  className={`flex items-start gap-3 p-3 rounded-sm border transition-colors cursor-pointer ${
                    task.active
                      ? 'bg-[#094771] border-[#007acc]'
                      : 'bg-[#2d2d30] border-[#3e3e42] hover:border-[#007acc]'
                  }`}
                >
                  {/* Status icon */}
                  <div className="mt-0.5">
                    {task.status === 'completed' && (
                      <CheckCircle2 className="w-4 h-4 text-[#2ea043]" />
                    )}
                    {task.status === 'in_progress' && (
                      <Loader2 className="w-4 h-4 text-[#1f6feb] animate-spin" />
                    )}
                    {task.status === 'created' && (
                      <Circle className="w-4 h-4 text-[#858585]" />
                    )}
                  </div>

                  {/* Task details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-mono text-[#569cd6]">{task.id}</span>
                      {task.status === 'completed' && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-[#2ea043] text-white uppercase tracking-wide">
                          Completed
                        </span>
                      )}
                      {task.status === 'in_progress' && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-[#1f6feb] text-white uppercase tracking-wide">
                          In Progress
                        </span>
                      )}
                      {task.status === 'created' && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-[#6e7681] text-white uppercase tracking-wide">
                          Created
                        </span>
                      )}
                    </div>
                    <div className="text-[12px] text-[#cccccc]">{task.summary}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer stats */}
      <div className="px-4 py-3 border-t border-[#2d2d30] bg-[#2d2d30] flex items-center justify-between">
        <div className="flex items-center gap-4 text-[11px] text-[#858585]">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3" />
            <span>2 completed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Loader2 className="w-3 h-3" />
            <span>1 in progress</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Circle className="w-3 h-3" />
            <span>4 pending</span>
          </div>
        </div>
        <div className="text-[11px] text-[#858585]">
          7 tasks total
        </div>
      </div>
    </div>
  );
}
