import ts from 'typescript';

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

export function normalizeTsAst(sourceFile: ts.SourceFile): NormalizedAstNode {
  const children = sourceFile.statements
    .map((statement) => normalizeNode(statement))
    .filter((entry): entry is NormalizedAstNode => entry !== undefined);

  return {
    kind: 'SourceFile',
    children,
  };
}

function normalizeNode(node: ts.Node): NormalizedAstNode | undefined {
  const kind = ts.SyntaxKind[node.kind];
  if (!KIND_ALLOWLIST.has(kind)) {
    return undefined;
  }

  const descendants = node
    .getChildren()
    .map((child) => normalizeNode(child))
    .filter((entry): entry is NormalizedAstNode => entry !== undefined);

  return descendants.length > 0 ? { kind, children: descendants } : { kind };
}
