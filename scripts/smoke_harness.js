const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { SaveOrchestrator } = require('../dist/extension/saveOrchestrator.js');
const { DisabledModelAdapter } = require('../dist/adapters/modelAdapter.js');
const { AuditVisibilityService } = require('../dist/core/auditVisibility.js');

async function run() {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'lintel-smoke-harness-'));
  const orchestrator = new SaveOrchestrator(workspace, new DisabledModelAdapter());

  const allowAssessment = await orchestrator.assessSave({
    filePath: 'src/components/Button.tsx',
    fileName: 'Button.tsx',
    text: 'export const Button = () => null;\n',
    previousText: 'export const Button = () => null;\n',
    saveMode: 'EXPLICIT',
    autoSaveMode: 'off',
  });
  orchestrator.commitAssessment(allowAssessment, true);

  const requirePlanAssessment = await orchestrator.assessSave({
    filePath: 'src/auth/session.ts',
    fileName: 'session.ts',
    text: 'export const startSession = () => true;\n',
    previousText: 'export const startSession = () => false;\n',
    saveMode: 'EXPLICIT',
    autoSaveMode: 'off',
  });
  orchestrator.commitAssessment(requirePlanAssessment, false);

  const audit = new AuditVisibilityService(workspace);
  const verification = audit.verifyAuditHistory();

  console.log(
    JSON.stringify(
      {
        workspace_root: workspace,
        outcomes: [
          {
            scenario: 'ALLOW_BASELINE',
            decision: allowAssessment.decision.decision,
            route_mode: allowAssessment.decision.route_mode,
            route_lane: allowAssessment.decision.route_lane,
          },
          {
            scenario: 'REQUIRE_PLAN_AUTH',
            decision: requirePlanAssessment.decision.decision,
            route_mode: requirePlanAssessment.decision.route_mode,
            route_lane: requirePlanAssessment.decision.route_lane,
          },
        ],
        verification,
      },
      null,
      2,
    ),
  );
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
