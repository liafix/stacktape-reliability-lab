import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const host = '127.0.0.1';
const port = Number.parseInt(process.env.P8_UI_PORT ?? '4318', 10);
const root = resolve(process.cwd(), 'apps', 'evidence-ui', 'dist');

const mimeTypes: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

function safePath(urlPath: string): string | null {
  const raw = decodeURIComponent(urlPath.split('?')[0] ?? '/');
  const relativePath = raw === '/' ? 'index.html' : raw.replace(/^\/+/, '');
  const candidate = resolve(root, relativePath);

  if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) {
    return null;
  }

  return candidate;
}

const server = createServer(async (request, response) => {
  const path = safePath(request.url ?? '/');

  if (!path) {
    response.writeHead(400);
    response.end('Bad request');
    return;
  }

  try {
    const info = await stat(path);
    if (!info.isFile()) throw new Error('Not a file');

    const body = await readFile(path);
    response.writeHead(200, {
      'content-type': mimeTypes[extname(path)] ?? 'application/octet-stream',
      'cache-control': 'no-store'
    });
    response.end(body);
  } catch {
    response.writeHead(404, {
      'content-type': 'text/plain; charset=utf-8'
    });
    response.end('Not found');
  }
});

server.listen(port, host, () => {
  console.log(`PASS 8 static preview listening on http://${host}:${port}`);
});

function stop(): void {
  server.close(() => process.exit(0));
}

process.once('SIGINT', stop);
process.once('SIGTERM', stop);
