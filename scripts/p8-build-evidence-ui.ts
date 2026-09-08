import {
  cp,
  mkdir,
  readFile,
  rm
} from 'node:fs/promises';
import { resolve } from 'node:path';

interface EvidenceSummary {
  readonly schemaVersion: number;
  readonly total: number;
  readonly passed: number;
  readonly failed: number;
  readonly scenarios: readonly unknown[];
}

interface ReleaseManifest {
  readonly p7ArtifactId: number;
  readonly p7ArtifactDigest: string;
  readonly runtimeBoundary: string;
}

const root = process.cwd();
const source = resolve(root, 'apps', 'evidence-ui');
const dist = resolve(source, 'dist');

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T;
}

const summary = await readJson<EvidenceSummary>(
  resolve(source, 'data', 'evidence-summary.json')
);
const release = await readJson<ReleaseManifest>(
  resolve(source, 'data', 'release.json')
);

if (
  summary.schemaVersion !== 1 ||
  summary.total !== 5 ||
  summary.passed !== 5 ||
  summary.failed !== 0 ||
  summary.scenarios.length !== 5
) {
  throw new Error('PASS 8 refused invalid P7 evidence snapshot.');
}

if (
  release.p7ArtifactId !== 10044979752 ||
  release.p7ArtifactDigest !==
    'sha256:900198da641a40bcda3d791e8b841b1d0c225941b90ebe6f3c3bd44f46bd3cb5' ||
  release.runtimeBoundary !== 'static-snapshot-only'
) {
  throw new Error('PASS 8 release provenance contract failed.');
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const filename of ['index.html', 'styles.css', 'app.js']) {
  await cp(resolve(source, filename), resolve(dist, filename));
}

await cp(resolve(source, 'data'), resolve(dist, 'data'), {
  recursive: true
});

console.log('PASS 8 evidence UI build: PASS (static CI-backed snapshot)');
console.log(`PASS 8 output: ${dist}`);
