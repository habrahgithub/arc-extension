import { CheckCircle2, XCircle, AlertTriangle, FileCode, Clock, ChevronRight } from 'lucide-react';

export default function ReviewPanel() {
  const rules = [
    { id: 'R-001', name: 'Authentication checks present', status: 'pass' },
    { id: 'R-002', name: 'Error handling implemented', status: 'pass' },
    { id: 'R-003', name: 'Input validation complete', status: 'warn' },
    { id: 'R-004', name: 'Logging requirements met', status: 'pass' },
    { id: 'R-005', name: 'Test coverage adequate', status: 'fail' },
  ];

  const deviations = [
    { severity: 'high', message: 'Missing unit tests for authentication flow', line: null },
    { severity: 'medium', message: 'Input sanitization not applied to email field', line: 42 },
  ];

  return (
    <div className="max-w-[800px] mx-auto bg-[#252526] border border-[#2d2d30] rounded-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#2d2d30] bg-[#2d2d30]">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[13px] text-white">Blueprint Compliance Review</div>
          <div className="flex items-center gap-2 text-[11px] text-[#858585]">
            <Clock className="w-3 h-3" />
            <span>2026-04-05 14:32:18</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <FileCode className="w-3 h-3 text-[#858585]" />
          <span className="font-mono text-[#cccccc]">src/auth/login.ts</span>
        </div>
      </div>

      {/* Summary stats */}
      <div className="px-4 py-3 border-b border-[#2d2d30] bg-[#2d2d30] flex items-center gap-6">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#2ea043]" />
          <span className="text-[11px] text-[#cccccc]">3 passed</span>
        </div>
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[#d29922]" />
          <span className="text-[11px] text-[#cccccc]">1 warning</span>
        </div>
        <div className="flex items-center gap-2">
          <XCircle className="w-4 h-4 text-[#f85149]" />
          <span className="text-[11px] text-[#cccccc]">1 failed</span>
        </div>
        <div className="flex-1" />
        <div className="text-[11px] text-[#858585]">
          Confidence: <span className="text-white">HIGH</span>
        </div>
      </div>

      {/* Rule evaluations */}
      <div className="p-4 space-y-4">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-[#858585] mb-3">Rule Evaluations</div>
          <div className="space-y-2">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className={`flex items-center gap-3 p-3 rounded-sm border ${
                  rule.status === 'pass'
                    ? 'bg-[#0d1117] border-[#3e3e42]'
                    : rule.status === 'warn'
                    ? 'bg-[#1c1711] border-[#3e3e42]'
                    : 'bg-[#1a0f0f] border-[#3e3e42]'
                }`}
              >
                {/* Status icon */}
                <div>
                  {rule.status === 'pass' && (
                    <CheckCircle2 className="w-4 h-4 text-[#2ea043]" />
                  )}
                  {rule.status === 'warn' && (
                    <AlertTriangle className="w-4 h-4 text-[#d29922]" />
                  )}
                  {rule.status === 'fail' && (
                    <XCircle className="w-4 h-4 text-[#f85149]" />
                  )}
                </div>

                {/* Rule details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-mono text-[#569cd6]">{rule.id}</span>
                    <ChevronRight className="w-3 h-3 text-[#858585]" />
                    <span className="text-[11px] text-[#cccccc]">{rule.name}</span>
                  </div>
                </div>

                {/* Status badge */}
                <div>
                  {rule.status === 'pass' && (
                    <span className="text-[9px] px-2 py-0.5 rounded-sm bg-[#2ea043] text-white uppercase tracking-wide">
                      Pass
                    </span>
                  )}
                  {rule.status === 'warn' && (
                    <span className="text-[9px] px-2 py-0.5 rounded-sm bg-[#d29922] text-black uppercase tracking-wide">
                      Warn
                    </span>
                  )}
                  {rule.status === 'fail' && (
                    <span className="text-[9px] px-2 py-0.5 rounded-sm bg-[#f85149] text-white uppercase tracking-wide">
                      Fail
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Deviations */}
        <div>
          <div className="text-[11px] uppercase tracking-wide text-[#858585] mb-3">Deviations Detected</div>
          <div className="space-y-2">
            {deviations.map((deviation, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-sm border-l-2 ${
                  deviation.severity === 'high'
                    ? 'bg-[#1a0f0f] border-[#f85149]'
                    : 'bg-[#1c1711] border-[#d29922]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-sm uppercase tracking-wide ${
                          deviation.severity === 'high'
                            ? 'bg-[#f85149] text-white'
                            : 'bg-[#d29922] text-black'
                        }`}
                      >
                        {deviation.severity}
                      </span>
                      {deviation.line && (
                        <span className="text-[10px] text-[#858585] font-mono">
                          line {deviation.line}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#cccccc]">{deviation.message}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[#2d2d30] bg-[#2d2d30] flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] text-[#858585]">
          <span>Governed root:</span>
          <span className="font-mono text-[#cccccc]">/workspace/proj</span>
        </div>
        <button className="px-3 py-1 bg-[#0e639c] hover:bg-[#1177bb] text-white text-[11px] rounded-sm transition-colors">
          View Full Report
        </button>
      </div>
    </div>
  );
}
