import { ExecutionGovernance } from './executionGovernance';
import { ExecutionStore } from './executionStore';
import type {
  ExecutionEnvelope,
  ExecutionProtocol,
  ExecutionToken,
  ReadinessVerdict,
} from '../contracts/types';

export class ExecutionService {
  private readonly gov: ExecutionGovernance;
  private readonly store: ExecutionStore;

  constructor(workspaceRoot: string) {
    this.gov = new ExecutionGovernance();
    this.store = new ExecutionStore(workspaceRoot);
  }

  defineProtocol(protocol: ExecutionProtocol): void {
    this.store.saveProtocol(protocol);
  }

  getProtocol(protocolId: string): ExecutionProtocol | null {
    return this.store.loadProtocol(protocolId);
  }

  verifyReadiness(
    packageHash: string,
    protocolId: string,
    evidence: {
      passedChecks: string[];
      confirmedApprovals: string[];
      constraintsAcknowledged: boolean;
      packageValid: boolean;
    }
  ): ReadinessVerdict {
    const protocol = this.store.loadProtocol(protocolId);
    if (!protocol) {
      throw new Error(`Protocol ${protocolId} not found`);
    }
    return this.gov.verifyReadiness(packageHash, protocol, evidence);
  }

  issueToken(
    packageHash: string,
    protocolId: string,
    verdict: ReadinessVerdict,
    ttlMinutes?: number
  ): ExecutionToken {
    const token = this.gov.issueToken(packageHash, protocolId, verdict, ttlMinutes);
    this.store.saveToken(token);
    return token;
  }

  verifyToken(tokenId: string): { ok: boolean; reason?: string; token?: ExecutionToken } {
    const token = this.store.loadToken(tokenId);
    if (!token) {
      return { ok: false, reason: 'Token not found' };
    }
    const result = this.gov.verifyToken(token);
    return { ...result, token };
  }

  useToken(tokenId: string): void {
    const { ok, reason } = this.verifyToken(tokenId);
    if (!ok) {
      throw new Error(`Cannot use token: ${reason}`);
    }
    this.store.markTokenUsed(tokenId);
  }

  defineEnvelope(protocolId: string, envelope: ExecutionEnvelope): void {
    this.store.saveEnvelope(protocolId, envelope);
  }

  getEnvelope(protocolId: string): ExecutionEnvelope | null {
    return this.store.loadEnvelope(protocolId);
  }
}
