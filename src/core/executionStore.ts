import fs from 'node:fs';
import path from 'node:path';
import type {
  ExecutionEnvelope,
  ExecutionProtocol,
  ExecutionToken,
} from '../contracts/types';

export class ExecutionStore {
  private readonly executionDir: string;

  constructor(private readonly workspaceRoot: string) {
    this.executionDir = path.join(this.workspaceRoot, '.arc', 'execution');
    if (!fs.existsSync(this.executionDir)) {
      fs.mkdirSync(this.executionDir, { recursive: true });
    }
  }

  saveProtocol(protocol: ExecutionProtocol): void {
    const filePath = path.join(this.executionDir, `protocol-${protocol.protocolId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(protocol, null, 2), 'utf8');
  }

  loadProtocol(protocolId: string): ExecutionProtocol | null {
    const filePath = path.join(this.executionDir, `protocol-${protocolId}.json`);
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }

  saveToken(token: ExecutionToken): void {
    const filePath = path.join(this.executionDir, `token-${token.tokenId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(token, null, 2), 'utf8');
  }

  loadToken(tokenId: string): ExecutionToken | null {
    const filePath = path.join(this.executionDir, `token-${tokenId}.json`);
    if (!fs.existsSync(filePath)) return null;
    const token = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    // Mark as reused if it was already marked, but here we just load.
    // The actual reuse logic should be in a higher layer.
    return token;
  }

  saveEnvelope(protocolId: string, envelope: ExecutionEnvelope): void {
    const filePath = path.join(this.executionDir, `envelope-${protocolId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(envelope, null, 2), 'utf8');
  }

  loadEnvelope(protocolId: string): ExecutionEnvelope | null {
    const filePath = path.join(this.executionDir, `envelope-${protocolId}.json`);
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }

  markTokenUsed(tokenId: string): void {
    const token = this.loadToken(tokenId);
    if (!token) throw new Error(`Token ${tokenId} not found`);
    
    token.reused = true;
    this.saveToken(token);
  }
}
