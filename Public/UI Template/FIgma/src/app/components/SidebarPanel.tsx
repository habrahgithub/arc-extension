import { Copy, CheckCircle2, AlertCircle, FileText, Activity } from 'lucide-react';

export default function SidebarPanel() {
  return (
    <div className="w-[160px] h-[600px] bg-[#252526] border border-[#2d2d30] flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-[#2d2d30]">
        <div className="text-[11px] uppercase tracking-wide text-[#858585] mb-2">ARC XT</div>
      </div>

      {/* Status section */}
      <div className="flex-1 p-3 space-y-3 overflow-y-auto">
        {/* Governed Root */}
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-wide text-[#858585]">Root</div>
          <div className="flex items-center justify-between group">
            <div className="text-[11px] text-[#cccccc] truncate flex-1 font-mono">
              /workspace/proj
            </div>
            <button className="opacity-0 group-hover:opacity-100 transition-opacity ml-1">
              <Copy className="w-3 h-3 text-[#858585] hover:text-white" />
            </button>
          </div>
        </div>

        {/* ARC Config Status */}
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-wide text-[#858585]">Config</div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-[#2ea043] text-white text-[10px]">
            <CheckCircle2 className="w-3 h-3" />
            Present
          </div>
        </div>

        {/* Blueprints Status */}
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-wide text-[#858585]">Blueprints</div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-[#2ea043] text-white text-[10px]">
            <CheckCircle2 className="w-3 h-3" />
            Present
          </div>
        </div>

        {/* Active Task */}
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-wide text-[#858585]">Active Task</div>
          <div className="text-[11px] text-[#cccccc] font-mono">
            <div className="text-[#569cd6]">#T-001</div>
            <div className="text-[10px] text-[#858585] mt-0.5 leading-tight">
              Implement user auth
            </div>
          </div>
        </div>

        {/* Route Mode */}
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-wide text-[#858585]">Route Mode</div>
          <div className="text-[11px] text-[#cccccc] font-mono">FULL</div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-3 border-t border-[#2d2d30] space-y-2">
        <button className="w-full px-3 py-1.5 bg-[#0e639c] hover:bg-[#1177bb] text-white text-[11px] rounded-sm transition-colors flex items-center justify-center gap-2">
          <FileText className="w-3 h-3" />
          Full Board
        </button>
        <button className="w-full px-3 py-1.5 bg-[#3c3c3c] hover:bg-[#4c4c4c] text-white text-[11px] rounded-sm transition-colors flex items-center justify-center gap-2">
          <Activity className="w-3 h-3" />
          Runtime
        </button>
      </div>

      {/* Empty state variant (commented out, shown as alternative) */}
      {/* <div className="flex-1 p-3 space-y-2">
        <div className="text-[10px] text-[#858585] mb-3">No blueprints configured</div>

        <button className="w-full px-2 py-2 bg-[#3c3c3c] hover:bg-[#4c4c4c] text-[11px] text-left rounded-sm transition-colors">
          Create Blueprint
        </button>
        <button className="w-full px-2 py-2 bg-[#3c3c3c] hover:bg-[#4c4c4c] text-[11px] text-left rounded-sm transition-colors">
          Import Tasks
        </button>
        <button className="w-full px-2 py-2 bg-[#3c3c3c] hover:bg-[#4c4c4c] text-[11px] text-left rounded-sm transition-colors">
          Configure Routes
        </button>
        <button className="w-full px-2 py-2 bg-[#3c3c3c] hover:bg-[#4c4c4c] text-[11px] text-left rounded-sm transition-colors">
          View Docs
        </button>
      </div> */}
    </div>
  );
}
