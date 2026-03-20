import type { SaveInput } from '../../src/contracts/types';

export function makeSaveInput(overrides: Partial<SaveInput>): SaveInput {
  return {
    filePath: 'src/components/Button.tsx',
    fileName: 'Button.tsx',
    text: 'export const Button = () => null;\n',
    previousText: 'export const Button = () => null;\n',
    saveMode: 'EXPLICIT',
    autoSaveMode: 'off',
    ...overrides,
  };
}

export const fixtureInputs = {
  button: makeSaveInput({}),
  auth: makeSaveInput({
    filePath: 'src/auth/session.ts',
    fileName: 'session.ts',
    text: 'export const startSession = () => true;\n',
    previousText: 'export const startSession = () => false;\n',
  }),
  schema: makeSaveInput({
    filePath: 'db/schema.sql',
    fileName: 'schema.sql',
    text: 'create table users(id int);\n',
    previousText: 'create table users(id bigint);\n',
  }),
  authSchema: makeSaveInput({
    filePath: 'src/auth/schema.sql',
    fileName: 'schema.sql',
    text: 'alter table sessions add column token text;\n',
    previousText: 'alter table sessions add column token varchar(32);\n',
  }),
  autoAuth: makeSaveInput({
    filePath: 'src/auth/session.ts',
    fileName: 'session.ts',
    text: 'export const startSession = () => true;\n',
    previousText: 'export const startSession = () => false;\n',
    saveMode: 'AUTO',
    autoSaveMode: 'afterDelay',
  }),
};
