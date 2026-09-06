import { createServer, type Server } from 'node:http';
import { type AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createFixtureApp } from './app.ts';
import { loadFixtureConfig } from './config.ts';
import type { FixtureConfig } from './types.ts';

export interface RunningFixtureServer {
  readonly host: FixtureConfig['host'];
  readonly port: number;
  readonly baseUrl: string;
  readonly server: Server;
  shutdown(): Promise<void>;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolveDelay) => {
    setTimeout(resolveDelay, milliseconds);
  });
}

export async function startFixtureServer(
  config: FixtureConfig = loadFixtureConfig()
): Promise<RunningFixtureServer> {
  const server = createServer(createFixtureApp(config));

  await new Promise<void>((resolveListen, rejectListen) => {
    const onError = (error: Error): void => {
      rejectListen(error);
    };

    server.once('error', onError);
    server.listen(config.port, config.host, () => {
      server.off('error', onError);
      resolveListen();
    });
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('Fixture service did not expose a TCP address.');
  }

  const port = (address as AddressInfo).port;

  return {
    host: config.host,
    port,
    baseUrl: `http://${config.host === '::1' ? '[::1]' : config.host}:${port}`,
    server,
    async shutdown() {
      if (config.faultMode === 'shutdown-delay' && config.shutdownDelayMs > 0) {
        await delay(config.shutdownDelayMs);
      }

      await new Promise<void>((resolveClose, rejectClose) => {
        server.close((error) => {
          if (error) {
            rejectClose(error);
            return;
          }
          resolveClose();
        });
      });
    }
  };
}

function isDirectExecution(): boolean {
  const currentFile = fileURLToPath(import.meta.url);
  return Boolean(process.argv[1] && resolve(process.argv[1]) === currentFile);
}

if (isDirectExecution()) {
  void startFixtureServer()
    .then((running) => {
      console.log(`fixture-service listening on ${running.baseUrl}`);

      let shuttingDown = false;
      const stop = (): void => {
        if (shuttingDown) return;
        shuttingDown = true;

        void running.shutdown().then(
          () => {
            process.exit(0);
          },
          (error: unknown) => {
            console.error(String(error));
            process.exitCode = 1;
          }
        );
      };

      process.once('SIGINT', stop);
      process.once('SIGTERM', stop);
    })
    .catch((error: unknown) => {
      console.error(String(error));
      process.exitCode = 1;
    });
}
