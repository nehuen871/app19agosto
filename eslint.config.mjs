import js from '@eslint/js';
import ts from 'typescript-eslint';
export default ts.config({ ignores: ['**/node_modules/**', '**/.next/**', '**/generated/**', '19Agosto/**', '**/next-env.d.ts', '**/dist/**'] }, js.configs.recommended, ...ts.configs.recommended, { files: ['**/*.ts', '**/*.tsx'], rules: { '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }] } });
