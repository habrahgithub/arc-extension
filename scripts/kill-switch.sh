#!/bin/bash
# ARC XT Kill-Switch — Disable Model Lane
# WARDEN Reference: WARDEN-LINTEL-001 (Standing Condition #1)
# H-004: Rollback Readiness

set -e

WORKSPACE_ROOT="${1:-.}"
ARC_DIR="$WORKSPACE_ROOT/.arc"
ROUTER_CONFIG="$ARC_DIR/router.json"

echo "=== ARC XT Kill-Switch ==="
echo "Workspace: $WORKSPACE_ROOT"
echo ""

# Create .arc directory if missing
if [ ! -d "$ARC_DIR" ]; then
    echo "Creating .arc directory..."
    mkdir -p "$ARC_DIR"
fi

# Backup existing config if present
if [ -f "$ROUTER_CONFIG" ]; then
    BACKUP="$ROUTER_CONFIG.backup.$(date +%Y%m%d%H%M%S)"
    echo "Backing up existing config: $BACKUP"
    cp "$ROUTER_CONFIG" "$BACKUP"
fi

# Write rule-only config (model lane DISABLED)
echo "Disabling model lane..."
cat > "$ROUTER_CONFIG" << 'EOF'
{
  "mode": "RULE_ONLY",
  "local_lane_enabled": false,
  "cloud_lane_enabled": false,
  "governance_mode": "ENFORCE"
}
EOF

echo ""
echo "=== Configuration Applied ==="
cat "$ROUTER_CONFIG"
echo ""

# Verify file was written
if [ -f "$ROUTER_CONFIG" ]; then
    echo "✅ Model lane DISABLED"
    echo ""
    echo "Next steps:"
    echo "1. Reload VS Code window (Ctrl+Shift+P → 'Developer: Reload Window')"
    echo "2. Verify extension operates in rule-only mode"
    echo "3. Check Extension Host logs for any errors"
    echo ""
    echo "To re-enable model lane (if needed):"
    echo "  Edit $ROUTER_CONFIG"
    echo "  Set: \"local_lane_enabled\": true"
    echo "  Ensure Ollama is running: ollama serve"
else
    echo "❌ Failed to write configuration"
    exit 1
fi
