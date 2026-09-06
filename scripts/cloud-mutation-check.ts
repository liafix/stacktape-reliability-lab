import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export type ScanContext = 'script' | 'workflow' | 'documentation' | 'fixture';

export interface CloudMutationViolation {
  readonly code: 'CLOUD_MUTATION_BLOCKED';
  readonly command: string;
}

const FORBIDDEN_PATTERNS: readonly RegExp[] = [
  /\bstacktape\s+deploy\b/i,
  /\bstacktape\s+delete\b/i,
  /\bstacktape\s+codebuild:deploy\b/i,
  /\baws\s+cloudformation\s+deploy\b/i,
  /\baws\s+cloudformation\s+delete-stack\b/i
];

export function findCloudMutationViolationsInText(
  text: string,
  context: ScanContext
): CloudMutationViolation[] {
  if (context === 'documentation' || context === 'fixture') {
    return [];
  }

  const violations: CloudMutationViolation[] = [];
  for (const pattern of FORBIDDEN_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[0]) {
      violations.push({ code: 'CLOUD_MUTATION_BLOCKED', command: match[0] });
    }
  }
  return violations;
}

function listFiles(root: string): string[] {
  const ignored = new Set(['node_modules', '.git', 'coverage', 'dist', 'evidence']);
  const output: string[] = [];

  for (const entry of readdirSync(root)) {
    if (ignored.has(entry)) continue;
    const path = resolve(root, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      output.push(...listFiles(path));
    } else {
      output.push(path);
    }
  }
  return output;
}

function contextFor(relativePath: string): ScanContext | null {
  if (relativePath === 'package.json') return 'script';
  if (relativePath.startsWith('.github/workflows/')) return 'workflow';
  if (relativePath.startsWith('scripts/') && !relativePath.endsWith('cloud-mutation-check.ts')) return 'script';
  return null;
}

export function scanRepositoryForCloudMutation(root: string): string[] {
  const violations: string[] = [];
  for (const path of listFiles(root)) {
    const rel = relative(root, path).replaceAll('\\', '/');
    const context = contextFor(rel);
    if (context === null) continue;
    const findings = findCloudMutationViolationsInText(readFileSync(path, 'utf8'), context);
    for (const finding of findings) {
      violations.push(`${rel}: ${finding.code}: ${finding.command}`);
    }
  }
  return violations.sort();
}

function runCli(): void {
  const root = process.cwd();
  const violations = scanRepositoryForCloudMutation(root);
  if (violations.length > 0) {
    console.error(violations.join('\n'));
    process.exitCode = 1;
    return;
  }
  console.log('cloud-mutation guard: PASS (0 executable cloud mutation commands)');
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === currentFile) {
  runCli();
}
