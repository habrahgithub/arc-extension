import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export default function CodeSnippets() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const snippets = [
    {
      id: 'sidebar-html',
      title: '1. Sidebar Panel — HTML',
      language: 'html',
      code: `<!-- Sidebar Panel (160px width) -->
<div class="arc-sidebar">
  <div class="arc-sidebar-header">
    <div class="arc-sidebar-title">ARC XT</div>
  </div>

  <div class="arc-sidebar-content">
    <!-- Governed Root -->
    <div class="arc-sidebar-section">
      <div class="arc-label">Root</div>
      <div class="arc-path-row">
        <span class="arc-path">/workspace/proj</span>
        <button class="arc-icon-btn" aria-label="Copy path">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        </button>
      </div>
    </div>

    <!-- Config Status -->
    <div class="arc-sidebar-section">
      <div class="arc-label">Config</div>
      <div class="arc-badge arc-badge-success">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        Present
      </div>
    </div>

    <!-- Blueprints Status -->
    <div class="arc-sidebar-section">
      <div class="arc-label">Blueprints</div>
      <div class="arc-badge arc-badge-success">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        Present
      </div>
    </div>

    <!-- Active Task -->
    <div class="arc-sidebar-section">
      <div class="arc-label">Active Task</div>
      <div class="arc-task-id">#T-001</div>
      <div class="arc-task-summary">Implement user auth</div>
    </div>

    <!-- Route Mode -->
    <div class="arc-sidebar-section">
      <div class="arc-label">Route Mode</div>
      <div class="arc-value">FULL</div>
    </div>
  </div>

  <div class="arc-sidebar-actions">
    <button class="arc-btn arc-btn-primary">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
      </svg>
      Full Board
    </button>
    <button class="arc-btn arc-btn-secondary">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
      </svg>
      Runtime
    </button>
  </div>
</div>`
    },
    {
      id: 'sidebar-css',
      title: '1. Sidebar Panel — CSS',
      language: 'css',
      code: `/* Sidebar Panel Styles */
.arc-sidebar {
  width: 160px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--vscode-sideBar-background);
  border: 1px solid var(--vscode-editorWidget-border);
  font-family: var(--vscode-editor-font-family);
}

.arc-sidebar-header {
  padding: 12px;
  border-bottom: 1px solid var(--vscode-editorWidget-border);
}

.arc-sidebar-title {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--vscode-descriptionForeground);
}

.arc-sidebar-content {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.arc-sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.arc-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--vscode-descriptionForeground);
}

.arc-path-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}

.arc-path {
  font-size: 11px;
  font-family: var(--vscode-editor-font-family);
  color: var(--vscode-editor-foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.arc-icon-btn {
  background: none;
  border: none;
  color: var(--vscode-descriptionForeground);
  cursor: pointer;
  padding: 2px;
  opacity: 0;
  transition: opacity 0.2s, color 0.2s;
}

.arc-path-row:hover .arc-icon-btn {
  opacity: 1;
}

.arc-icon-btn:hover {
  color: var(--vscode-editor-foreground);
}

.arc-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  border-radius: 2px;
  font-size: 10px;
  line-height: 1.4;
}

.arc-badge-success {
  background: var(--vscode-badge-background);
  color: var(--vscode-badge-foreground);
}

.arc-task-id {
  font-size: 11px;
  font-family: var(--vscode-editor-font-family);
  color: var(--vscode-textLink-foreground);
}

.arc-task-summary {
  font-size: 10px;
  color: var(--vscode-descriptionForeground);
  line-height: 1.4;
}

.arc-value {
  font-size: 11px;
  font-family: var(--vscode-editor-font-family);
  color: var(--vscode-editor-foreground);
}

.arc-sidebar-actions {
  padding: 12px;
  border-top: 1px solid var(--vscode-editorWidget-border);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.arc-btn {
  width: 100%;
  padding: 6px 12px;
  border: none;
  border-radius: 2px;
  font-size: 11px;
  font-family: var(--vscode-editor-font-family);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background-color 0.2s;
}

.arc-btn-primary {
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
}

.arc-btn-primary:hover {
  background: var(--vscode-button-hoverBackground);
}

.arc-btn-secondary {
  background: var(--vscode-sideBar-background);
  color: var(--vscode-editor-foreground);
  border: 1px solid var(--vscode-editorWidget-border);
}

.arc-btn-secondary:hover {
  background: var(--vscode-list-activeSelectionBackground);
}`
    },
    {
      id: 'taskboard-html',
      title: '2. Task Board Panel — HTML',
      language: 'html',
      code: `<!-- Task Board Panel (800px width) -->
<div class="arc-panel">
  <div class="arc-panel-header">
    <div class="arc-panel-header-left">
      <div class="arc-panel-title">Task Board</div>
      <div class="arc-panel-path">/workspace/proj/.arc/blueprints/</div>
    </div>
    <div class="arc-panel-header-actions">
      <button class="arc-btn arc-btn-primary">Select Task</button>
      <button class="arc-btn arc-btn-secondary">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
        Clear
      </button>
    </div>
  </div>

  <div class="arc-panel-content">
    <!-- Planning Phase -->
    <div class="arc-phase-section">
      <div class="arc-phase-header">
        <div class="arc-phase-divider"></div>
        <div class="arc-phase-title">Planning</div>
        <div class="arc-phase-divider"></div>
      </div>

      <div class="arc-task-list">
        <div class="arc-task arc-task-completed">
          <div class="arc-task-icon arc-task-icon-completed">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <div class="arc-task-content">
            <div class="arc-task-meta">
              <span class="arc-task-id">T-001</span>
              <span class="arc-task-status-badge arc-status-completed">Completed</span>
            </div>
            <div class="arc-task-summary">Define authentication requirements</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Implementation Phase -->
    <div class="arc-phase-section">
      <div class="arc-phase-header">
        <div class="arc-phase-divider"></div>
        <div class="arc-phase-title">Implementation</div>
        <div class="arc-phase-divider"></div>
      </div>

      <div class="arc-task-list">
        <div class="arc-task arc-task-active">
          <div class="arc-task-icon arc-task-icon-in-progress">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="arc-spin">
              <line x1="12" y1="2" x2="12" y2="6"></line>
              <line x1="12" y1="18" x2="12" y2="22"></line>
              <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
              <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
              <line x1="2" y1="12" x2="6" y2="12"></line>
              <line x1="18" y1="12" x2="22" y2="12"></line>
              <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
              <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
            </svg>
          </div>
          <div class="arc-task-content">
            <div class="arc-task-meta">
              <span class="arc-task-id">T-003</span>
              <span class="arc-task-status-badge arc-status-in-progress">In Progress</span>
            </div>
            <div class="arc-task-summary">Implement user authentication flow</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="arc-panel-footer">
    <div class="arc-panel-footer-stats">
      <div class="arc-stat">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        2 completed
      </div>
      <div class="arc-stat">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="2" x2="12" y2="6"></line>
          <line x1="12" y1="18" x2="12" y2="22"></line>
        </svg>
        1 in progress
      </div>
    </div>
    <div class="arc-panel-footer-total">7 tasks total</div>
  </div>
</div>`
    },
    {
      id: 'taskboard-css',
      title: '2. Task Board Panel — CSS',
      language: 'css',
      code: `/* Task Board Panel Styles */
.arc-panel {
  width: 100%;
  max-width: 800px;
  background: var(--vscode-editor-background);
  border: 1px solid var(--vscode-editorWidget-border);
  border-radius: 2px;
  font-family: var(--vscode-editor-font-family);
}

.arc-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--vscode-editorWidget-border);
  background: var(--vscode-sideBar-background);
}

.arc-panel-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.arc-panel-title {
  font-size: 13px;
  color: var(--vscode-editor-foreground);
}

.arc-panel-path {
  font-size: 11px;
  font-family: var(--vscode-editor-font-family);
  color: var(--vscode-descriptionForeground);
}

.arc-panel-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.arc-panel-content {
  padding: 16px;
}

.arc-phase-section {
  margin-bottom: 24px;
}

.arc-phase-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.arc-phase-divider {
  flex: 1;
  height: 1px;
  background: var(--vscode-editorWidget-border);
}

.arc-phase-title {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--vscode-descriptionForeground);
  padding: 0 8px;
}

.arc-task-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.arc-task {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border-radius: 2px;
  background: var(--vscode-sideBar-background);
  border: 1px solid var(--vscode-editorWidget-border);
  cursor: pointer;
  transition: border-color 0.2s;
}

.arc-task:hover {
  border-color: var(--vscode-textLink-foreground);
}

.arc-task-active {
  background: var(--vscode-list-activeSelectionBackground);
  border-color: var(--vscode-textLink-foreground);
}

.arc-task-icon {
  margin-top: 2px;
}

.arc-task-icon-completed {
  color: var(--vscode-badge-background);
}

.arc-task-icon-in-progress {
  color: var(--vscode-textLink-foreground);
}

.arc-spin {
  animation: arc-spin 2s linear infinite;
}

@keyframes arc-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.arc-task-content {
  flex: 1;
  min-width: 0;
}

.arc-task-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.arc-task-id {
  font-size: 11px;
  font-family: var(--vscode-editor-font-family);
  color: var(--vscode-textLink-foreground);
}

.arc-task-status-badge {
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 2px 6px;
  border-radius: 2px;
}

.arc-status-completed {
  background: var(--vscode-badge-background);
  color: var(--vscode-badge-foreground);
}

.arc-status-in-progress {
  background: var(--vscode-textLink-foreground);
  color: var(--vscode-button-foreground);
}

.arc-task-summary {
  font-size: 12px;
  color: var(--vscode-editor-foreground);
}

.arc-panel-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid var(--vscode-editorWidget-border);
  background: var(--vscode-sideBar-background);
}

.arc-panel-footer-stats {
  display: flex;
  align-items: center;
  gap: 16px;
}

.arc-stat {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
}

.arc-panel-footer-total {
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
}`
    },
    {
      id: 'runtime-html',
      title: '3. Runtime Status Panel — HTML',
      language: 'html',
      code: `<!-- Runtime Status Panel (800px width) -->
<div class="arc-panel">
  <div class="arc-panel-header">
    <div class="arc-panel-title">Runtime Status</div>
    <div class="arc-timestamp">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12 6 12 12 16 14"></polyline>
      </svg>
      2026-04-05 14:32:18
    </div>
  </div>

  <div class="arc-panel-content">
    <!-- Trigger -->
    <div class="arc-info-card">
      <div class="arc-info-card-header">
        <div class="arc-label">Trigger</div>
        <div class="arc-badge arc-badge-primary">OnSave</div>
      </div>
      <div class="arc-file-row">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
        <span class="arc-path">src/auth/login.ts</span>
      </div>
    </div>

    <!-- Route Visualization -->
    <div class="arc-info-card">
      <div class="arc-label">Route Taken</div>
      <div class="arc-route-flow">
        <div class="arc-route-step">LOCAL</div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="5" y1="12" x2="19" y2="12"></line>
          <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
        <div class="arc-route-step">CLOUD</div>
        <div style="flex: 1;"></div>
        <div class="arc-badge arc-badge-success">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          PASSED
        </div>
      </div>
    </div>

    <!-- Active Task Context -->
    <div class="arc-info-card">
      <div class="arc-info-card-header">
        <div class="arc-label">Active Task Context</div>
        <div class="arc-badge arc-badge-success">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          Injected
        </div>
      </div>
      <div class="arc-task-ref">
        <span class="arc-task-id">#T-003</span>
        <span class="arc-task-summary">Implement user authentication flow</span>
      </div>
    </div>

    <!-- Warning Example -->
    <div class="arc-warning-card">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
      <div>
        <div class="arc-warning-title">Audit Degradation Warning</div>
        <div class="arc-warning-text">Unable to read last audit entry. Operating in degraded mode.</div>
      </div>
    </div>
  </div>
</div>`
    },
    {
      id: 'runtime-css',
      title: '3. Runtime Status Panel — CSS',
      language: 'css',
      code: `/* Runtime Status Panel Styles */
.arc-timestamp {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
}

.arc-info-card {
  background: var(--vscode-sideBar-background);
  border: 1px solid var(--vscode-editorWidget-border);
  border-radius: 2px;
  padding: 12px;
  margin-bottom: 16px;
}

.arc-info-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.arc-file-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--vscode-editor-foreground);
}

.arc-route-flow {
  display: flex;
  align-items: center;
  gap: 8px;
}

.arc-route-step {
  padding: 8px 12px;
  background: var(--vscode-list-activeSelectionBackground);
  border: 1px solid var(--vscode-textLink-foreground);
  border-radius: 2px;
  font-size: 11px;
  color: var(--vscode-editor-foreground);
}

.arc-task-ref {
  font-size: 11px;
  font-family: var(--vscode-editor-font-family);
}

.arc-task-ref .arc-task-summary {
  color: var(--vscode-descriptionForeground);
  margin-left: 8px;
}

.arc-warning-card {
  background: var(--vscode-inputValidation-warningBackground);
  border: 1px solid var(--vscode-inputValidation-warningBackground);
  border-radius: 2px;
  padding: 12px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  color: var(--vscode-editor-foreground);
}

.arc-warning-card svg {
  flex-shrink: 0;
  margin-top: 2px;
}

.arc-warning-title {
  font-size: 11px;
  margin-bottom: 4px;
}

.arc-warning-text {
  font-size: 10px;
  color: var(--vscode-editor-foreground);
}

.arc-badge-primary {
  background: var(--vscode-textLink-foreground);
  color: var(--vscode-button-foreground);
}`
    },
    {
      id: 'review-html',
      title: '4. Review Surface — HTML',
      language: 'html',
      code: `<!-- Review Surface (800px width) -->
<div class="arc-panel">
  <div class="arc-panel-header">
    <div>
      <div class="arc-panel-title">Blueprint Compliance Review</div>
      <div class="arc-file-row" style="margin-top: 8px;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
        <span class="arc-path">src/auth/login.ts</span>
      </div>
    </div>
    <div class="arc-timestamp">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12 6 12 12 16 14"></polyline>
      </svg>
      2026-04-05 14:32:18
    </div>
  </div>

  <!-- Summary Stats -->
  <div class="arc-summary-bar">
    <div class="arc-summary-stat">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--vscode-badge-background);">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      3 passed
    </div>
    <div class="arc-summary-stat">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #d29922;">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
      1 warning
    </div>
    <div class="arc-summary-stat">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--vscode-inputValidation-errorBackground);">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="15" y1="9" x2="9" y2="15"></line>
        <line x1="9" y1="9" x2="15" y2="15"></line>
      </svg>
      1 failed
    </div>
    <div style="flex: 1;"></div>
    <div class="arc-confidence">
      Confidence: <span style="color: var(--vscode-editor-foreground);">HIGH</span>
    </div>
  </div>

  <div class="arc-panel-content">
    <!-- Rule Evaluations -->
    <div>
      <div class="arc-label" style="margin-bottom: 12px;">Rule Evaluations</div>

      <!-- Pass Example -->
      <div class="arc-rule-row arc-rule-pass">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--vscode-badge-background);">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        <div class="arc-rule-content">
          <div class="arc-rule-meta">
            <span class="arc-rule-id">R-001</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
            <span class="arc-rule-name">Authentication checks present</span>
          </div>
        </div>
        <div class="arc-badge arc-badge-success">Pass</div>
      </div>

      <!-- Fail Example -->
      <div class="arc-rule-row arc-rule-fail">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #f85149;">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
        <div class="arc-rule-content">
          <div class="arc-rule-meta">
            <span class="arc-rule-id">R-005</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
            <span class="arc-rule-name">Test coverage adequate</span>
          </div>
        </div>
        <div class="arc-badge arc-badge-error">Fail</div>
      </div>
    </div>

    <!-- Deviations -->
    <div style="margin-top: 24px;">
      <div class="arc-label" style="margin-bottom: 12px;">Deviations Detected</div>

      <!-- High Severity -->
      <div class="arc-deviation arc-deviation-high">
        <div class="arc-deviation-header">
          <span class="arc-badge arc-badge-error">High</span>
        </div>
        <div class="arc-deviation-message">Missing unit tests for authentication flow</div>
      </div>

      <!-- Medium Severity -->
      <div class="arc-deviation arc-deviation-medium">
        <div class="arc-deviation-header">
          <span class="arc-badge arc-badge-warning">Medium</span>
          <span class="arc-line-number">line 42</span>
        </div>
        <div class="arc-deviation-message">Input sanitization not applied to email field</div>
      </div>
    </div>
  </div>

  <div class="arc-panel-footer">
    <div class="arc-panel-footer-left">
      <span class="arc-footer-label">Governed root:</span>
      <span class="arc-path">/workspace/proj</span>
    </div>
    <button class="arc-btn arc-btn-primary">View Full Report</button>
  </div>
</div>`
    },
    {
      id: 'review-css',
      title: '4. Review Surface — CSS',
      language: 'css',
      code: `/* Review Surface Styles */
.arc-summary-bar {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--vscode-editorWidget-border);
  background: var(--vscode-sideBar-background);
}

.arc-summary-stat {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--vscode-editor-foreground);
}

.arc-confidence {
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
}

.arc-rule-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 2px;
  border: 1px solid var(--vscode-editorWidget-border);
  margin-bottom: 8px;
}

.arc-rule-pass {
  background: var(--vscode-editor-background);
}

.arc-rule-fail {
  background: var(--vscode-inputValidation-errorBackground);
}

.arc-rule-content {
  flex: 1;
  min-width: 0;
}

.arc-rule-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.arc-rule-id {
  font-size: 10px;
  font-family: var(--vscode-editor-font-family);
  color: var(--vscode-textLink-foreground);
}

.arc-rule-name {
  font-size: 11px;
  color: var(--vscode-editor-foreground);
}

.arc-badge-error {
  background: var(--vscode-inputValidation-errorBackground);
  color: var(--vscode-button-foreground);
}

.arc-badge-warning {
  background: var(--vscode-inputValidation-warningBackground);
  color: var(--vscode-editor-background);
}

.arc-deviation {
  padding: 12px;
  border-radius: 2px;
  margin-bottom: 8px;
}

.arc-deviation-high {
  background: var(--vscode-inputValidation-errorBackground);
  border-left: 2px solid #f85149;
}

.arc-deviation-medium {
  background: var(--vscode-inputValidation-warningBackground);
  border-left: 2px solid #d29922;
}

.arc-deviation-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.arc-line-number {
  font-size: 10px;
  font-family: var(--vscode-editor-font-family);
  color: var(--vscode-descriptionForeground);
}

.arc-deviation-message {
  font-size: 11px;
  color: var(--vscode-editor-foreground);
}

.arc-panel-footer-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
}

.arc-footer-label {
  color: var(--vscode-descriptionForeground);
}`
    },
    {
      id: 'base-js',
      title: 'Base JavaScript (Event Handlers)',
      language: 'javascript',
      code: `// Base JavaScript for ARC XT Extension
// Note: All scripts must include nonce attribute in VS Code webview

(function() {
  'use strict';

  // Copy to clipboard
  document.querySelectorAll('.arc-icon-btn[aria-label="Copy path"]').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      const pathText = this.previousElementSibling.textContent;
      navigator.clipboard.writeText(pathText);
    });
  });

  // Task selection
  document.querySelectorAll('.arc-task').forEach(task => {
    task.addEventListener('click', function() {
      document.querySelectorAll('.arc-task').forEach(t => {
        t.classList.remove('arc-task-active');
      });
      this.classList.add('arc-task-active');
    });
  });

  // Button actions
  document.querySelectorAll('.arc-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      console.log('Button clicked:', this.textContent.trim());
      // Send message to extension host
      // vscode.postMessage({ command: 'buttonClick', value: this.textContent });
    });
  });
})();`
    }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="mb-8">
        <h2 className="text-xl text-white mb-2">HTML/CSS Code Snippets</h2>
        <p className="text-sm text-[#858585]">
          Production-ready code for VS Code webview. All snippets use VS Code theme tokens for automatic light/dark theme support.
        </p>
      </div>

      {snippets.map((snippet) => (
        <div key={snippet.id} className="bg-[#252526] border border-[#2d2d30] rounded-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#2d2d30] bg-[#2d2d30]">
            <div className="text-sm text-white">{snippet.title}</div>
            <button
              onClick={() => copyToClipboard(snippet.code, snippet.id)}
              className="flex items-center gap-2 px-3 py-1 bg-[#0e639c] hover:bg-[#1177bb] text-white text-xs rounded-sm transition-colors"
            >
              {copiedId === snippet.id ? (
                <>
                  <Check className="w-3 h-3" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  Copy
                </>
              )}
            </button>
          </div>
          <div className="p-4 overflow-x-auto">
            <pre className="text-xs text-[#cccccc] leading-relaxed">
              <code>{snippet.code}</code>
            </pre>
          </div>
        </div>
      ))}

      {/* Integration notes */}
      <div className="bg-[#252526] border border-[#2d2d30] rounded-sm p-6 space-y-4">
        <h3 className="text-sm text-white mb-3">Integration Notes</h3>
        <div className="text-xs text-[#cccccc] space-y-3 leading-relaxed">
          <p>
            <strong className="text-white">CSP Configuration:</strong> All external resources are blocked. Include nonce
            attribute on script tags and use only VS Code theme variables.
          </p>
          <p>
            <strong className="text-white">Theme Tokens:</strong> The CSS uses --vscode-* variables that automatically
            adapt to user's theme (Light/Dark/High Contrast).
          </p>
          <p>
            <strong className="text-white">Font:</strong> All text inherits from var(--vscode-editor-font-family) to
            match user's editor font preference.
          </p>
          <p>
            <strong className="text-white">Event Handlers:</strong> No inline onclick handlers. Use addEventListener
            with nonce-protected scripts.
          </p>
          <p>
            <strong className="text-white">Webview API:</strong> Communicate with extension using vscode.postMessage()
            and window.addEventListener('message').
          </p>
        </div>
      </div>
    </div>
  );
}
