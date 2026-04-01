import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  GovernanceReviewDecision,
  ImplementationPackage,
  ImplementationPackageCandidate,
} from '../contracts/types';
import { ImplementationDraftService } from './implementationDraftService';

const IMPLEMENTATION_PACKAGES_FILE = 'implementation_packages.json';
const IMPLEMENTATION_PACKAGE_AUTHORIZATION_LOG_FILE =
  'implementation_package_authorization_log.json';

export class ImplementationPackageService {
  private readonly draftService: ImplementationDraftService;

  constructor(private readonly workspaceRoot: string) {
    this.draftService = new ImplementationDraftService(workspaceRoot);
  }

  createFromCandidate(
    candidateId: string,
    createdBy: string,
  ): ImplementationPackage {
    const normalizedCreator = createdBy.trim();
    if (!normalizedCreator) {
      throw new ImplementationPackageServiceError(
        'INVALID_CREATED_BY',
        'createdBy must be a non-empty string.',
      );
    }

    const candidate = this.findCandidate(candidateId);
    if (!candidate) {
      throw new ImplementationPackageServiceError(
        'CANDIDATE_NOT_FOUND',
        `No implementation package candidate found for id ${candidateId}.`,
      );
    }

    if (candidate.status !== 'CANDIDATE') {
      throw new ImplementationPackageServiceError(
        'CANDIDATE_NOT_ELIGIBLE',
        `Candidate ${candidate.id} is not eligible for package creation.`,
      );
    }

    if (this.getByCandidateId(candidate.id)) {
      throw new ImplementationPackageServiceError(
        'PACKAGE_EXISTS',
        `Implementation package already exists for candidate ${candidate.id}.`,
      );
    }

    const next = createImplementationPackage(candidate, normalizedCreator);
    const packages = this.readStore();
    packages.push(next);
    this.writeStore(packages);
    return next;
  }

  list(): ImplementationPackage[] {
    return this.readStore();
  }

  listDefined(): ImplementationPackage[] {
    return this.readStore().filter((item) => item.packageStatus === 'DEFINED');
  }

  listAuthorized(): ImplementationPackage[] {
    return this.readStore().filter((item) => item.packageStatus === 'AUTHORIZED');
  }

  getById(id: string): ImplementationPackage | undefined {
    return this.readStore().find((item) => item.id === id);
  }

  getByCandidateId(candidateId: string): ImplementationPackage | undefined {
    return this.readStore().find((item) => item.candidateId === candidateId);
  }

  authorizePackage(
    id: string,
    decidedBy: string,
    rationale: string,
  ): ImplementationPackage {
    return this.applyAuthorizationDecision(id, 'AUTHORIZED', decidedBy, rationale);
  }

  denyPackage(
    id: string,
    decidedBy: string,
    rationale: string,
  ): ImplementationPackage {
    return this.applyAuthorizationDecision(id, 'DENIED', decidedBy, rationale);
  }

  private findCandidate(candidateId: string): ImplementationPackageCandidate | undefined {
    return this.draftService
      .listCandidates()
      .find((candidate) => candidate.id === candidateId);
  }

  private storePath(): string {
    return path.join(this.workspaceRoot, '.arc', IMPLEMENTATION_PACKAGES_FILE);
  }

  private authorizationLogPath(): string {
    return path.join(
      this.workspaceRoot,
      '.arc',
      IMPLEMENTATION_PACKAGE_AUTHORIZATION_LOG_FILE,
    );
  }

  private ensureReady(): void {
    const arcDir = path.join(this.workspaceRoot, '.arc');
    fs.mkdirSync(arcDir, { recursive: true });
    const storePath = this.storePath();
    if (!fs.existsSync(storePath)) {
      fs.writeFileSync(storePath, '[]\n', 'utf8');
    }
    const authorizationLogPath = this.authorizationLogPath();
    if (!fs.existsSync(authorizationLogPath)) {
      fs.writeFileSync(authorizationLogPath, '[]\n', 'utf8');
    }
  }

  private readStore(): ImplementationPackage[] {
    this.ensureReady();
    const payload = fs.readFileSync(this.storePath(), 'utf8').trim();
    if (!payload) {
      return [];
    }
    return JSON.parse(payload) as ImplementationPackage[];
  }

  private writeStore(packages: ImplementationPackage[]): void {
    this.ensureReady();
    fs.writeFileSync(
      this.storePath(),
      `${JSON.stringify(packages, null, 2)}\n`,
      'utf8',
    );
  }

  private applyAuthorizationDecision(
    id: string,
    targetStatus: 'AUTHORIZED' | 'DENIED',
    decidedBy: string,
    rationale: string,
  ): ImplementationPackage {
    const decision = normalizeAuthorizationDecision(decidedBy, rationale);
    const packages = this.readStore();
    const current = packages.find((pkg) => pkg.id === id);
    if (!current) {
      throw new ImplementationPackageServiceError(
        'PACKAGE_NOT_FOUND',
        `No implementation package found for id ${id}.`,
      );
    }

    if (current.packageStatus !== 'DEFINED') {
      throw new ImplementationPackageServiceError(
        'INVALID_PACKAGE_TRANSITION',
        `Cannot transition ${current.packageStatus} to ${targetStatus}.`,
      );
    }

    const updated: ImplementationPackage = {
      ...current,
      packageStatus: targetStatus,
      authorizationDecision: decision,
    };
    const nextPackages = packages.map((pkg) => (pkg.id === updated.id ? updated : pkg));
    this.writeStore(nextPackages);

    const log = this.readAuthorizationLog();
    log.push({
      packageId: updated.id,
      action: targetStatus,
      decidedAt: decision.decidedAt,
      decidedBy: decision.decidedBy,
      rationale: decision.rationale,
    });
    this.writeAuthorizationLog(log);
    return updated;
  }

  private readAuthorizationLog(): ImplementationPackageAuthorizationLogEntry[] {
    this.ensureReady();
    const payload = fs.readFileSync(this.authorizationLogPath(), 'utf8').trim();
    if (!payload) {
      return [];
    }
    return JSON.parse(payload) as ImplementationPackageAuthorizationLogEntry[];
  }

  private writeAuthorizationLog(log: ImplementationPackageAuthorizationLogEntry[]): void {
    this.ensureReady();
    fs.writeFileSync(
      this.authorizationLogPath(),
      `${JSON.stringify(log, null, 2)}\n`,
      'utf8',
    );
  }
}

export class ImplementationPackageServiceError extends Error {
  constructor(
    readonly code:
      | 'INVALID_CREATED_BY'
      | 'INVALID_DECISION_BY'
      | 'INVALID_DECISION_RATIONALE'
      | 'CANDIDATE_NOT_FOUND'
      | 'CANDIDATE_NOT_ELIGIBLE'
      | 'PACKAGE_EXISTS'
      | 'PACKAGE_NOT_FOUND'
      | 'INVALID_PACKAGE_TRANSITION',
    message: string,
  ) {
    super(message);
    this.name = 'ImplementationPackageServiceError';
  }
}

function createImplementationPackage(
  candidate: ImplementationPackageCandidate,
  createdBy: string,
): ImplementationPackage {
  const packageKey = `candidate:${candidate.id}`;
  return {
    id: crypto.createHash('sha256').update(packageKey).digest('hex'),
    candidateId: candidate.id,
    draftId: candidate.draftId,
    proposalId: candidate.source.proposalId,
    handoffId: candidate.source.handoffId,
    createdAt: new Date().toISOString(),
    createdBy,
    scope: candidate.scope,
    changeset: candidate.proposedChanges,
    constraints: [],
    riskLevel: normalizeRiskLevel(candidate.riskLevel),
    approvalRequired: true,
    packageStatus: 'DEFINED',
  };
}

function normalizeAuthorizationDecision(
  decidedBy: string,
  rationale: string,
): GovernanceReviewDecision {
  const normalizedBy = decidedBy.trim();
  if (!normalizedBy) {
    throw new ImplementationPackageServiceError(
      'INVALID_DECISION_BY',
      'decidedBy must be a non-empty string.',
    );
  }
  const normalizedRationale = rationale.trim();
  if (!normalizedRationale) {
    throw new ImplementationPackageServiceError(
      'INVALID_DECISION_RATIONALE',
      'rationale must be a non-empty string.',
    );
  }
  return {
    decidedAt: new Date().toISOString(),
    decidedBy: normalizedBy,
    rationale: normalizedRationale,
  };
}

function normalizeRiskLevel(riskLevel: string): ImplementationPackage['riskLevel'] {
  if (riskLevel === 'LOW' || riskLevel === 'MEDIUM' || riskLevel === 'HIGH') {
    return riskLevel;
  }
  return 'MEDIUM';
}

type ImplementationPackageAuthorizationLogEntry = {
  packageId: string;
  action: 'AUTHORIZED' | 'DENIED';
  decidedAt: string;
  decidedBy: string;
  rationale: string;
};
