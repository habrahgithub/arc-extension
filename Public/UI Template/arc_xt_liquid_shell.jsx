import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  FileCode2,
  Gauge,
  Layers3,
  Shield,
  Sparkles,
  TerminalSquare,
  AlertTriangle,
  ChevronRight,
  Search,
  Bell,
  Settings,
} from "lucide-react";

const navItems = [
  { id: "runtime", label: "Runtime", icon: Activity },
  { id: "tasks", label: "Tasks", icon: ClipboardList },
  { id: "review", label: "Review", icon: Shield },
  { id: "architect", label: "Architect", icon: Layers3 },
];

const tasks = [
  { id: "ARC-101", title: "Directive route verification", state: "Active", phase: "Planning" },
  { id: "ARC-118", title: "Policy manifest sync", state: "Review", phase: "Implementation" },
  { id: "ARC-123", title: "Execution token envelope", state: "Ready", phase: "Review" },
];

const deviations = [
  { sev: "High", text: "Missing strict type enforcement in payload route", line: "L:42" },
  { sev: "Medium", text: "Fallback audit cache used for previous run", line: "L:18" },
  { sev: "Low", text: "Telemetry label naming drift detected", line: "L:09" },
];

function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "good" | "warn" | "info" }) {
  const toneClasses = {
    neutral: "bg-white/6 text-white/70 border-white/10",
    good: "bg-emerald-400/14 text-emerald-200 border-emerald-300/20",
    warn: "bg-amber-400/14 text-amber-200 border-amber-300/20",
    info: "bg-sky-400/14 text-sky-200 border-sky-300/20",
  }[tone];

  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] tracking-[0.14em] uppercase ${toneClasses}`}>{children}</span>;
}

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={[
        "rounded-3xl border border-white/10 bg-white/[0.05] backdrop-blur-xl shadow-[0_10px_50px_rgba(0,0,0,0.45)]",
        "before:pointer-events-none before:absolute before:inset-0 before:rounded-3xl before:border before:border-white/6",
        "relative overflow-hidden",
        className,
      ].join(" ")}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      {children}
    </div>
  );
}

export default function ArcXtLiquidShell() {
  const [active, setActive] = useState("runtime");

  const hero = useMemo(() => {
    if (active === "tasks") {
      return {
        title: "Task Board",
        subtitle: "Milestone-first navigation with active focus and clean phase separation.",
      };
    }
    if (active === "review") {
      return {
        title: "Blueprint Review",
        subtitle: "Readable code-risk surface with deviation hierarchy and confidence framing.",
      };
    }
    if (active === "architect") {
      return {
        title: "Architect View",
        subtitle: "System posture, route policies, and directive-state visibility in one shell.",
      };
    }
    return {
      title: "Runtime Control",
      subtitle: "A calmer, more premium shell for governance signals and execution posture.",
    };
  }, [active]);

  return (
    <div className="min-h-screen bg-[#06070a] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(126,178,255,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(127,255,212,0.09),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(146,110,255,0.14),transparent_28%)]" />
      <div className="relative grid min-h-screen grid-cols-[92px_280px_1fr]">
        <aside className="border-r border-white/6 bg-black/20 backdrop-blur-xl">
          <div className="flex h-full flex-col items-center justify-between py-6">
            <div className="space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/8 shadow-lg">
                <Sparkles className="h-5 w-5 text-sky-200" />
              </div>
              <div className="space-y-3">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const selected = active === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActive(item.id)}
                      className="group relative flex w-full justify-center"
                      aria-label={item.label}
                    >
                      {selected && (
                        <motion.div
                          layoutId="rail"
                          className="absolute inset-y-1 left-2 w-1 rounded-full bg-sky-300"
                          transition={{ type: "spring", stiffness: 320, damping: 30 }}
                        />
                      )}
                      <div
                        className={[
                          "flex h-14 w-14 items-center justify-center rounded-2xl border transition-all duration-200",
                          selected
                            ? "border-sky-300/30 bg-sky-300/12 text-sky-100 shadow-[0_0_0_1px_rgba(125,211,252,0.08)]"
                            : "border-white/6 bg-white/[0.03] text-white/55 hover:border-white/12 hover:bg-white/[0.06] hover:text-white/85",
                        ].join(" ")}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <button className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.04] text-white/60 hover:bg-white/[0.08] hover:text-white">
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </aside>

        <aside className="border-r border-white/6 bg-white/[0.02] px-5 py-6 backdrop-blur-xl">
          <div className="mb-8">
            <div className="text-3xl font-semibold tracking-tight text-sky-100">ARC XT</div>
            <div className="mt-1 text-[11px] uppercase tracking-[0.34em] text-white/35">Engineering Core</div>
          </div>

          <GlassCard className="mb-4 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.24em] text-white/45">Active Directive</div>
                <div className="mt-1 text-2xl font-semibold text-sky-100">ARC-101</div>
              </div>
              <Pill tone="info">Live</Pill>
            </div>
            <div className="text-sm leading-6 text-white/70">OnSave route inspection with strict policy envelope and bounded execution posture.</div>
          </GlassCard>

          <div className="mb-3 flex items-center justify-between px-1">
            <div className="text-[11px] uppercase tracking-[0.24em] text-white/45">Navigation</div>
            <Search className="h-4 w-4 text-white/35" />
          </div>

          <div className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const selected = active === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActive(item.id)}
                  className={[
                    "flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all",
                    selected
                      ? "border-sky-300/20 bg-sky-300/10 shadow-[0_8px_30px_rgba(56,189,248,0.08)]"
                      : "border-white/6 bg-white/[0.03] hover:border-white/12 hover:bg-white/[0.05]",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-3">
                    <div className={selected ? "text-sky-100" : "text-white/60"}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className={selected ? "text-sm font-medium text-white" : "text-sm font-medium text-white/82"}>{item.label}</div>
                      <div className="text-xs text-white/40">Governed surface</div>
                    </div>
                  </div>
                  <ChevronRight className={selected ? "h-4 w-4 text-sky-200" : "h-4 w-4 text-white/25"} />
                </button>
              );
            })}
          </div>

          <GlassCard className="mt-6 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-[0.24em] text-white/45">Operator</div>
              <Bell className="h-4 w-4 text-white/35" />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-300/30 to-indigo-300/20 text-sm font-semibold">
                H
              </div>
              <div>
                <div className="text-sm font-medium">System Architect</div>
                <div className="text-xs text-white/45">Bounded execution role</div>
              </div>
            </div>
            <button className="mt-4 w-full rounded-2xl border border-sky-300/20 bg-sky-300/12 px-4 py-3 text-sm font-medium text-sky-100 hover:bg-sky-300/18">
              EXECUTE_RUN
            </button>
          </GlassCard>
        </aside>

        <main className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.28em] text-white/40">Control Plane</div>
              <h1 className="mt-2 text-4xl font-semibold tracking-tight">{hero.title}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">{hero.subtitle}</p>
            </div>
            <div className="flex items-center gap-2">
              <Pill tone="good">Stable</Pill>
              <Pill tone="info">v2.4.0</Pill>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
            <div className="space-y-5">
              <GlassCard className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.24em] text-white/45">Runtime posture</div>
                    <div className="mt-1 text-2xl font-semibold">Primary Route</div>
                  </div>
                  <Pill tone="good">Pass</Pill>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                    <div className="mb-2 text-xs uppercase tracking-[0.22em] text-white/40">Trigger</div>
                    <div className="text-lg font-medium">OnSave</div>
                    <div className="mt-1 text-sm text-white/45">Automatic bounded execution</div>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                    <div className="mb-2 text-xs uppercase tracking-[0.22em] text-white/40">Route</div>
                    <div className="flex items-center gap-2 text-lg font-medium">
                      <span>Local</span>
                      <ArrowRight className="h-4 w-4 text-white/35" />
                      <span>Cloud</span>
                    </div>
                    <div className="mt-1 text-sm text-white/45">Strict enforcement manifest</div>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                    <div className="mb-2 text-xs uppercase tracking-[0.22em] text-white/40">Target</div>
                    <div className="flex items-center gap-2 text-lg font-medium">
                      <FileCode2 className="h-4 w-4 text-sky-200" />
                      <span>src/auth/service.ts</span>
                    </div>
                    <div className="mt-1 text-sm text-white/45">3.4kb · protected surface</div>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-rose-300/12 bg-rose-400/10 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 h-5 w-5 text-rose-200" />
                      <div>
                        <div className="text-sm font-medium text-rose-100">Audit degradation warning</div>
                        <div className="mt-1 text-sm leading-6 text-rose-100/75">Audit read fallback engaged. Strict route policy remains active, but confidence is reduced until retry succeeds.</div>
                      </div>
                    </div>
                    <button className="rounded-xl border border-rose-200/15 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.16em] text-rose-100/90">Retry</button>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.24em] text-white/45">Task stream</div>
                    <div className="mt-1 text-2xl font-semibold">Milestone navigation</div>
                  </div>
                  <Pill tone="info">3 visible</Pill>
                </div>

                <div className="space-y-3">
                  {tasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/6">
                          <ClipboardList className="h-4 w-4 text-sky-200" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{task.title}</span>
                            <span className="text-xs text-sky-200/90">{task.id}</span>
                          </div>
                          <div className="text-xs text-white/45">{task.phase}</div>
                        </div>
                      </div>
                      <Pill tone={task.state === "Active" ? "info" : task.state === "Review" ? "warn" : "good"}>{task.state}</Pill>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>

            <div className="space-y-5">
              <GlassCard className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.24em] text-white/45">Compliance</div>
                    <div className="mt-1 text-2xl font-semibold">Deviation list</div>
                  </div>
                  <Shield className="h-5 w-5 text-sky-200" />
                </div>
                <div className="space-y-3">
                  {deviations.map((item) => (
                    <div key={item.text} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <Pill tone={item.sev === "High" ? "warn" : item.sev === "Medium" ? "info" : "neutral"}>{item.sev}</Pill>
                        <span className="text-xs text-white/35">{item.line}</span>
                      </div>
                      <div className="text-sm leading-6 text-white/75">{item.text}</div>
                    </div>
                  ))}
                </div>
              </GlassCard>

              <GlassCard className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.24em] text-white/45">Live output</div>
                    <div className="mt-1 text-2xl font-semibold">Terminal stream</div>
                  </div>
                  <TerminalSquare className="h-5 w-5 text-sky-200" />
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/60 p-4 font-mono text-sm leading-7 text-white/75">
                  <div><span className="text-emerald-300">[14:30:50]</span> Initializing ARC XT runtime...</div>
                  <div><span className="text-emerald-300">[14:30:51]</span> OnSave trigger detected: <span className="text-sky-200">src/core/index.ts</span></div>
                  <div><span className="text-emerald-300">[14:30:52]</span> Route verified: CLOUD (STRICT)</div>
                  <div><span className="text-amber-300">[14:30:53]</span> Warning: audit cache fallback enabled</div>
                  <div><span className="text-emerald-300">[14:30:54]</span> No blocking violations found</div>
                </div>
              </GlassCard>

              <div className="grid gap-5 sm:grid-cols-2">
                <GlassCard className="p-5">
                  <div className="mb-2 flex items-center gap-2 text-white/55"><Gauge className="h-4 w-4" /> System health</div>
                  <div className="text-4xl font-semibold">98.2%</div>
                  <div className="mt-2 text-sm text-white/45">Process efficiency rated optimal</div>
                </GlassCard>
                <GlassCard className="p-5">
                  <div className="mb-2 flex items-center gap-2 text-white/55"><CheckCircle2 className="h-4 w-4" /> Confidence</div>
                  <div className="text-4xl font-semibold">High</div>
                  <div className="mt-2 text-sm text-white/45">Stable shell, reduced only by fallback audit path</div>
                </GlassCard>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
