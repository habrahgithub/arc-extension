import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ExecutionService } from '../../src/core/executionService';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('Execution Governance Chain (End-to-End)', () => {
  let tempDir: string;
  let service: ExecutionService;

  beforeEach(() => {
    tempDir = path.join(os.tmpdir(), `lintel-test-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    service = new ExecutionService(tempDir);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('executes the full governance chain correctly', () => {
    const protocolId = 'EP-PILOT';
    const packageHash = 'pkg-001-abc';

    // 1. Define Protocol (M11)
    service.defineProtocol({
      protocolId,
      requiredChecks: ['lint', 'build'],
      requiredApprovals: ['axis-lead'],
      constraints: ['LOCAL_ONLY'],
      allowedMode: 'CONTROLLED',
    });

    // 2. Verify Readiness (M12)
    const verdict = service.verifyReadiness(packageHash, protocolId, {
      passedChecks: ['lint', 'build'],
      confirmedApprovals: ['axis-lead'],
      constraintsAcknowledged: true,
      packageValid: true,
    });
    expect(verdict.ok).toBe(true);

    // 3. Issue Token (M13)
    const token = service.issueToken(packageHash, protocolId, verdict);
    expect(token.tokenId).toBeDefined();
    expect(token.reused).toBe(false);

    // 4. Verify Token (Status Check)
    const verifyResult = service.verifyToken(token.tokenId);
    expect(verifyResult.ok).toBe(true);

    // 5. Use Token (M13 enforcement)
    service.useToken(token.tokenId);

    // 6. Deny Reuse (M13 enforcement)
    const secondVerify = service.verifyToken(token.tokenId);
    expect(secondVerify.ok).toBe(false);
    expect(secondVerify.reason).toBe('Token has already been used');

    // 7. Verify Envelope (M14)
    service.defineEnvelope(protocolId, {
      allowedPaths: ['src/*'],
      blockedPaths: ['tests/*'],
      evidenceLoggingRequired: true,
      rollbackRequirement: 'MANDATORY',
      stopConditions: ['ANY_ERROR'],
    });
    const envelope = service.getEnvelope(protocolId);
    expect(envelope?.allowedPaths).toContain('src/*');
  });

  it('fails token verify if not found', () => {
    const result = service.verifyToken('non-existent-id');
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('Token not found');
  });

  it('fails issuance for invalid readiness', () => {
    const protocolId = 'EP-FAIL';
    service.defineProtocol({
      protocolId,
      requiredChecks: ['must-pass'],
      requiredApprovals: [],
      constraints: [],
      allowedMode: 'CONTROLLED',
    });

    const verdict = service.verifyReadiness('pkg', protocolId, {
      passedChecks: [], // failed check
      confirmedApprovals: [],
      constraintsAcknowledged: true,
      packageValid: true,
    });

    expect(() => service.issueToken('pkg', protocolId, verdict)).toThrow('Cannot issue token');
  });
});
