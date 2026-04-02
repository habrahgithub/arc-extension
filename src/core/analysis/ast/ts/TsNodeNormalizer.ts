// import ts from 'typescript'; // Removed to enable lazy loading

export interface NormalizedAstNode {
  kind: string;
  children?: NormalizedAstNode[];
}

const KIND_ALLOWLIST = new Set<string>([
  'ImportDeclaration',
  'ExportDeclaration',
  'ExportAssignment',
  'VariableStatement',
  'VariableDeclaration',
  'Parameter',
  'FunctionDeclaration',
  'ClassDeclaration',
  'InterfaceDeclaration',
  'TypeAliasDeclaration',
  'EnumDeclaration',
  'MethodDeclaration',
  'PropertyDeclaration',
  'Constructor',
  'ArrowFunction',
  'Block',
  'CallExpression',
  'PropertyAccessExpression',
  'NewExpression',
  'BinaryExpression',
  'ObjectLiteralExpression',
  'ArrayLiteralExpression',
  'ConditionalExpression',
  'TemplateExpression',
  'TypeReference',
  'UnionType',
  'IntersectionType',
  'HeritageClause',
  'IfStatement',
  'SwitchStatement',
  'TryStatement',
  'ForStatement',
  'ForOfStatement',
  'ForInStatement',
  'WhileStatement',
  'DoStatement',
  'ReturnStatement',
  'AwaitExpression',
  'JsxElement',
  'JsxSelfClosingElement',
  'JsxFragment',
]);

export function normalizeTsAst(sourceFile: any): NormalizedAstNode {
  const ts = require('typescript'); // Lazy load
  const children = sourceFile.statements
    .map((statement: any) => normalizeNode(statement, ts))
    .filter((entry: any): entry is NormalizedAstNode => entry !== undefined);

  return {
    kind: 'SourceFile',
    children,
  };
}

function normalizeNode(node: any, ts: any): NormalizedAstNode | undefined {
  const kind = ts.SyntaxKind[node.kind];
  if (!KIND_ALLOWLIST.has(kind)) {
    return undefined;
  }

  const descendants = node
    .getChildren()
    .map((child: any) => normalizeNode(child, ts))
    .filter((entry: any): entry is NormalizedAstNode => entry !== undefined);

  return descendants.length > 0 ? { kind, children: descendants } : { kind };
}
