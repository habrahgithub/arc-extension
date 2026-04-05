# ARC XT Blueprint: SWDWKSPC-INFRA-001

**Directive ID:** SWDWKSPC-INFRA-001

> Status: INFRA_PARTIAL_RECOVERY_RECORDED — 2026-04-04
> This blueprint captures the completed thread summary for the workspace infrastructure audit/remediation discussion, records INFRA's bounded runtime-hygiene completion plus the later runtime-recovery update, and leaves non-INFRA escalations explicitly open for Axis/Warden follow-up.

## Thread Summary / Execution Evidence

### Confirmed workspace-runtime findings

- duplicate `next-devtools-mcp@0.3.6` processes were observed running concurrently
- duplicate `playwright-mcp` processes were observed running concurrently
- `ops/ollama.pid` was stale
- `ops/litellm.pid` was stale
- `ops/serena-audit.log` was empty while `vault/audit/serena-audit-chain.jsonl` contained non-live fixture-style M2 test data
- the Serena governance enforcement path described by the ARC Serena adapter documentation was not proven operational at runtime

### Accepted thread conclusions

1. the workspace has strong vertical capability but weak horizontal integration
2. immediate daily-friction closure should focus on runtime hygiene first
3. INFRA owns the bounded operational package for inventory / status / PID hygiene / lifecycle notes
4. runtime-registry design, generated `mcp.json` authority, and Serena enforcement redesign remain Axis/Warden-gated items outside INFRA scope
5. Serena enforcement remains a separate blocked/remediation package and is not solved by this directive

### Supporting artifacts

- `agents/infra/infra-handoff-swdwkspc-infra-001-2026-04-04.md`
- `agents/infra/INFRA_AGENT.md`
- `platform/arc-console/governance/infra-runtime-hygiene-2026-04-04.md`
- `tools/runtime-status.sh`
- `tools/ollama-start.sh`
- `tools/litellm-start.sh`
- `mcp.json`
- `ops/ollama.pid`
- `ops/litellm.pid`
- `ops/serena-audit.log`
- `vault/audit/serena-audit-chain.jsonl`

## Objective

Capture the complete infrastructure-summary outcome from this thread in a durable blueprint artifact, delegate the bounded runtime-hygiene package to INFRA, and record the completion of that INFRA-owned slice without expanding scope into governance, security-boundary, or architecture redesign work.

## Scope

This directive covers summary capture, delegation, bounded infrastructure-operational handling, and completion recording only.

### In-scope coordination artifacts

- `projects/lintel/.arc/blueprints/SWDWKSPC-INFRA-001.md`
- `agents/infra/infra-handoff-swdwkspc-infra-001-2026-04-04.md`
- `platform/arc-console/governance/infra-runtime-hygiene-2026-04-04.md`

### In-scope INFRA operational surfaces

- `tools/ollama-start.sh`
- `tools/ollama-stop.sh`
- `tools/ollama-monitor.sh`
- `tools/ollama-speed-recovery-test.sh`
- `tools/litellm-start.sh`
- `tools/litellm-stop.sh`
- `tools/litellm-test.sh`
- `tools/vscode-ollama-verify.sh`
- `tools/runtime-status.sh`
- truthful PID/log handling under `ops/`
- dated INFRA maintenance records under `platform/arc-console/governance/`

### Operational outcomes expected from INFRA

- runtime inventory
- single status/doctor surface
- stale PID cleanup/repair contract
- one-server-per-tool lifecycle notes
- dated maintenance artifact or escalation memo

## Constraints

- This directive does **not** authorize product logic changes in `projects/*`
- This directive does **not** authorize governance-authority changes, protected-surface changes, or runtime-registry design
- This directive does **not** authorize generated-`mcp.json` rollout or routing-authority changes
- This directive does **not** authorize Serena wrapper enforcement implementation; that remains a separate Axis-scoped package
- INFRA must keep diffs isolated and must not absorb unrelated dirty workspace state
- If INFRA discovers a security-boundary issue, Warden must be engaged before continuation
- If INFRA discovers an architecture-boundary issue, Axis must be engaged before continuation
- If INFRA discovers a product-code dependency, Forge must be engaged rather than INFRA extending scope

## INFRA Completion Record

INFRA reported the bounded runtime-hygiene package complete on **2026-04-04**.

### Files changed by INFRA

- `tools/litellm-start.sh`
  - fixed PID capture race by using immediate `$!`
  - added port pre-check and PID self-repair behavior
- `tools/ollama-start.sh`
  - added port pre-check and PID self-repair on stale PID path
- `tools/runtime-status.sh`
  - created as the single operator-facing status/doctor command
- `platform/arc-console/governance/infra-runtime-hygiene-2026-04-04.md`
  - created as the dated INFRA maintenance record

### INFRA-reported result

- stale PID handling for Ollama and LiteLLM was repaired
- `runtime-status.sh` truthfully surfaces runtime drift and exits non-zero when issues remain
- directive status moved from degraded toward recovering

### Axis re-verification note (2026-04-04 23:34 local)

A live rerun of `./tools/runtime-status.sh` after the INFRA report showed:

- Ollama not responding and `ops/ollama.pid` stale again
- LiteLLM not responding and `ops/litellm.pid` stale again
- Serena audit drift still present

This means the INFRA tooling slice is accepted as completed, but the **current runtime state remains degraded** until the services are intentionally restarted or their external exit path is better explained.

### INFRA runtime recovery update

INFRA later reported a runtime recovery pass on **2026-04-04** with these operator findings:

- LiteLLM had exited via orderly `SIGTERM` rather than a crash and was restarted through `tools/litellm-start.sh`
- Ollama was reported live again on port `11434`
- duplicate Claude-managed MCP process accumulation remained open and escalated
- Serena enforcement remained unconfirmed and open under **WRD-0043**

Axis records this as an operator-reported recovery update, not closure of the open governance/runtime follow-up items.

### Remaining open findings after INFRA scope completion

- **WRD-0043** — Serena M1 enforcement confirmed non-functional; remains open to Axis + Warden
- duplicate Claude-managed MCP processes remain open to Axis for lifecycle/cleanup authorization
- blueprint tracking/commit state remains unresolved in the nested `projects/lintel` repo and requires Prime authorization if it is to be committed rather than left as working-copy-only

## Acceptance Criteria

1. This blueprint contains a directive-specific, non-placeholder summary of the completed thread outcome
2. The INFRA delegation path is explicitly recorded and points to the canonical handoff artifact
3. INFRA scope remains bounded to runtime hygiene, not registry/governance/security redesign
4. The blueprint truthfully records that Serena governance enforcement is not yet operationally validated
5. INFRA completion evidence is captured in a dated maintenance artifact and reflected here
6. Open post-INFRA items are clearly separated from the INFRA-complete slice and routed to the correct owners

## Rollback Note

If this directive summary or completion record is found to misstate the thread outcome or incorrectly delegate/close authority:

1. revert this blueprint update only
2. preserve the separate INFRA handoff and maintenance artifacts for audit continuity unless they are also incorrect
3. issue a corrected blueprint revision with narrower wording and explicit authority boundaries

## Delegation Note

Primary operational owner for the completed maintenance slice: **INFRA**

Open follow-up items retained outside INFRA scope:

- runtime-registry authority and WRD-0042 controls — Axis + Warden
- Serena enforcement wrapper/remediation and WRD-0043 closure — Axis + Warden + Forge
- MCP duplicate-process cleanup authorization/procedure — Axis
- console/vault projection sequencing beyond runtime hygiene — Axis / Forge per approved package order

**Next Action:** Accept INFRA completion for the bounded runtime-hygiene slice, then route remaining open items to Axis and Warden under their respective packages/findings.

**Next Actor:** Axis / Warden
