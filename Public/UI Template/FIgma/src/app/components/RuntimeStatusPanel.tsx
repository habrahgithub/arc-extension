import { CheckCircle2, AlertTriangle, ArrowRight, Clock, FileCode } from 'lucide-react';

export default function RuntimeStatusPanel() {
  return (
    <div className="max-w-[800px] mx-auto bg-[#252526] border border-[#2d2d30] rounded-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#2d2d30] bg-[#2d2d30]">
        <div className="flex items-center justify-between">
          <div className="text-[13px] text-white">Runtime Status</div>
          <div className="flex items-center gap-2 text-[11px] text-[#858585]">
            <Clock className="w-3 h-3" />
            <span>2026-04-05 14:32:18</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="p-4 space-y-4">
        {/* Trigger info */}
        <div className="bg-[#2d2d30] border border-[#3e3e42] rounded-sm p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[11px] uppercase tracking-wide text-[#858585]">Trigger</div>
            <div className="text-[10px] px-2 py-0.5 rounded-sm bg-[#1f6feb] text-white">OnSave</div>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-[#cccccc]">
            <FileCode className="w-4 h-4 text-[#858585]" />
            <span className="font-mono">src/auth/login.ts</span>
          </div>
        </div>

        {/* Route visualization */}
        <div className="bg-[#2d2d30] border border-[#3e3e42] rounded-sm p-3">
          <div className="text-[11px] uppercase tracking-wide text-[#858585] mb-3">Route Taken</div>

          <div className="flex items-center gap-2">
            <div className="px-3 py-2 bg-[#094771] border border-[#1f6feb] rounded-sm text-[11px] text-white">
              LOCAL
            </div>
            <ArrowRight className="w-4 h-4 text-[#858585]" />
            <div className="px-3 py-2 bg-[#094771] border border-[#1f6feb] rounded-sm text-[11px] text-white">
              CLOUD
            </div>
            <div className="flex-1" />
            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-sm bg-[#2ea043] text-white text-[10px]">
              <CheckCircle2 className="w-3 h-3" />
              PASSED
            </div>
          </div>
        </div>

        {/* Active task context */}
        <div className="bg-[#2d2d30] border border-[#3e3e42] rounded-sm p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] uppercase tracking-wide text-[#858585]">Active Task Context</div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-[#2ea043] text-white text-[10px]">
              <CheckCircle2 className="w-3 h-3" />
              Injected
            </div>
          </div>
          <div className="text-[11px] text-[#cccccc] font-mono">
            <span className="text-[#569cd6]">#T-003</span>
            <span className="text-[#858585] ml-2">Implement user authentication flow</span>
          </div>
        </div>

        {/* Last audit entry */}
        <div className="bg-[#2d2d30] border border-[#3e3e42] rounded-sm p-3">
          <div className="text-[11px] uppercase tracking-wide text-[#858585] mb-3">Last Audit Entry</div>

          <div className="space-y-2 text-[11px]">
            <div className="flex items-start gap-2">
              <span className="text-[#858585] w-16 flex-shrink-0">File:</span>
              <span className="text-[#cccccc] font-mono">src/auth/login.ts</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-[#858585] w-16 flex-shrink-0">Verdict:</span>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-[#2ea043] text-white text-[10px]">
                <CheckCircle2 className="w-3 h-3" />
                PASS
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-[#858585] w-16 flex-shrink-0">Hash:</span>
              <span className="text-[#cccccc] font-mono text-[10px]">a4f8e7b3c2d1</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-[#858585] w-16 flex-shrink-0">Time:</span>
              <span className="text-[#cccccc]">14:32:18</span>
            </div>
          </div>
        </div>

        {/* Route policy */}
        <div className="bg-[#2d2d30] border border-[#3e3e42] rounded-sm p-3">
          <div className="text-[11px] uppercase tracking-wide text-[#858585] mb-2">Route Policy</div>
          <div className="text-[11px] text-[#cccccc] font-mono">FULL</div>
          <div className="text-[10px] text-[#858585] mt-1">
            Local validation → Cloud audit → Task context injection
          </div>
        </div>
      </div>

      {/* Warning state example (alternative) */}
      <div className="px-4 pb-4">
        <div className="bg-[#3a2a1b] border border-[#d29922] rounded-sm p-3 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-[#d29922] mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-[11px] text-[#d29922] mb-1">Audit Degradation Warning</div>
            <div className="text-[10px] text-[#cccccc]">
              Unable to read last audit entry. Operating in degraded mode.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
