import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export type SecretScanContext = 'config' | 'script' | 'source' | 'fixture' | 'documentation';

export interface SecretViolation {
  readonly code: 'SECRET_POLICY_FAILED';
  readonly detector: string;
}

const SYNTHETIC_MARKERS = ['EXAMPLE', 'PLACEHOLDER', 'SYNTHETIC', 'FAKE', 'DUMMY'];

const SECRET_PATTERNS: readonly { readonly detector: string; readonly pattern: RegExp }[] = [
  { detector: 'aws-access-key-id', pattern: /\bAKIA[0-9A-Z]{16}\b/g },
  { detector: 'aws-secret-assignment', pattern: /\bAWS_SECRET_ACCESS_KEY\s*=\s*[^\s'"]+/gi },
  { detector: 'stacktape-token-assignment', pattern: /\bSTACKTAPE(?:_API)?_TOKEN\s*=\s*[^\s'"]+/gi },
  { detector: 'generic-private-key', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g }
];

function looksSynthetic(match: string): boolean {
  const upper = match.toUpperCase();
  return SYNTHETIC_MARKERS.some((marker) => upper.includes(marker));
}

export function findSecretViolationsInText(
  text: string,
  context: SecretScanContext
): SecretViolation[] {
  if (context === 'documentation' || context === 'fixture') {
    return [];
  }

  const violations: SecretViolation[] = [];
  for (const { detector, pattern } of SECRET_PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      if (!looksSynthetic(match[0])) {
        violations.push({ code: 'SECRET_POLICY_FAILED', detector });
      }
    }
  }
  return violations;
}

function listFiles(root: string): string[] {
  const ignored = new Set(['node_modules', '.git', 'coverage', 'dist', 'evidence', 'tests']);
  const output: string[] = [];
  for (const entry of readdirSync(root)) {
    if (ignored.has(entry)) continue;
    const path = resolve(root, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) output.push(...listFiles(path));
    else output.push(path);
  }
  return output;
}

function contextFor(relativePath: string): SecretScanContext | null {
  if (relativePath === 'package.json') return 'config';
  if (relativePath.startsWith('.github/workflows/')) return 'config';
  if (relativePath.startsWith('scripts/') && !relativePath.endsWith('secret-check.ts')) return 'script';
  if (relativePath.startsWith('apps/') || relativePath.startsWith('packages/')) return 'source';
  return null;
}

export function scanRepositoryForSecrets(root: string): string[] {
  const violations: string[] = [];
  for (const path of listFiles(root)) {
    const rel = relative(root, path).replaceAll('\\', '/');
    const context = contextFor(rel);
    if (context === null) continue;
    const findings = findSecretViolationsInText(readFileSync(path, 'utf8'), context);
    for (const finding of findings) {
      violations.push(`${rel}: ${finding.code}: ${finding.detector}`);
    }
  }
  return violations.sort();
}

function runCli(): void {
  const violations = scanRepositoryForSecrets(process.cwd());
  if (violations.length > 0) {
    console.error(violations.join('\n'));
    process.exitCode = 1;
    return;
  }
  console.log('secret guard: PASS (0 likely plaintext secrets in executable/source surfaces)');
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === currentFile) {
  runCli();
}

