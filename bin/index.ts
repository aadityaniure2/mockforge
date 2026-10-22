#!/usr/bin/env node

import { serve } from '@hono/node-server';
import type { ServerType } from '@hono/node-server';
import pc from 'picocolors';
import { parseCliArgs } from '../src/cli/args.js';
import { parseSpec } from '../src/core/parser.js';
import { createMockApp, openApiPathToHonoPath } from '../src/core/router.js';
import { setupSpecWatcher } from '../src/core/watcher.js';

async function main() {
  const options = parseCliArgs(process.argv);

  if (!options.spec) {
    console.error(pc.red('Error: Missing required argument <spec-path-or-url>'));
    console.log(pc.yellow('Usage: mockforge <spec-path-or-url> [options]'));
    process.exit(1);
  }

  console.log(pc.cyan(pc.bold('\n╭──────────────────────────────────────────────╮')));
  console.log(pc.cyan(pc.bold('│       🔥 MockForge OpenAPI Mock Server       │')));
  console.log(pc.cyan(pc.bold('╰──────────────────────────────────────────────╯\n')));

  console.log(pc.dim(`Loading specification from: ${pc.cyan(options.spec)}`));

  let spec: any;
  try {
    spec = await parseSpec(options.spec);
  } catch (err: any) {
    console.error(err.message);
    process.exit(1);
  }

  const routeCount = Object.keys(spec.paths || {}).length;
  console.log(
    pc.green(
      `✓ Spec verified: "${spec.info?.title || 'OpenAPI Specification'}" (v${spec.info?.version || '1.0.0'})`
    )
  );
  console.log(pc.dim(`  Loaded ${routeCount} endpoint paths\n`));

  let currentApp = createMockApp(spec, {
    delay: options.delay,
    chaos: options.chaos,
    stateless: options.stateless,
    silent: false,
  });

  // Watcher setup
  if (options.watch) {
    const watcher = setupSpecWatcher(options.spec, {
      onReload: (newSpec) => {
        currentApp = createMockApp(newSpec, {
          delay: options.delay,
          chaos: options.chaos,
          stateless: options.stateless,
          silent: false,
        });
      },
    });

    if (watcher) {
      console.log(pc.magenta('  👁 Watch mode active: Auto-reloading on changes'));
    }
  }

  // Auto-increment port if in use
  const startServer = (
    initialPort: number
  ): Promise<{ server: ServerType; port: number }> => {
    return new Promise((resolve, reject) => {
      let port = initialPort;

      const tryListen = () => {
        let server: ServerType;
        try {
          server = serve(
            {
              fetch: (req) => currentApp.fetch(req),
              port,
            },
            () => {
              resolve({ server, port });
            }
          );

          server.on('error', (err: any) => {
            if (err.code === 'EADDRINUSE') {
              console.log(
                pc.yellow(`  ⚠ Port ${port} in use, attempting port ${port + 1}...`)
              );
              port++;
              tryListen();
            } else {
              reject(err);
            }
          });
        } catch (err: any) {
          if (err.code === 'EADDRINUSE') {
            port++;
            tryListen();
          } else {
            reject(err);
          }
        }
      };

      tryListen();
    });
  };

  try {
    const { port } = await startServer(options.port);

    console.log(
      pc.bold(
        `\n  🚀 Server listening on: ${pc.cyan(pc.underline(`http://localhost:${port}`))}`
      )
    );
    console.log(
      pc.dim(
        `  • Mode: ${options.stateless ? pc.yellow('Stateless') : pc.green('Stateful (in-memory CRUD)')}`
      )
    );
    if (options.delay > 0) {
      console.log(pc.dim(`  • Artificial Delay: ${pc.yellow(`${options.delay}ms`)}`));
    }
    if (options.chaos > 0) {
      console.log(
        pc.dim(`  • Chaos Rate: ${pc.red(`${Math.round(options.chaos * 100)}%`)}`)
      );
    }

    console.log(pc.dim('\n  Available routes:'));
    for (const [openApiPath, methods] of Object.entries(spec.paths || {})) {
      const honoPath = openApiPathToHonoPath(openApiPath);
      const methodList = Object.keys(methods as any)
        .map((m) => m.toUpperCase())
        .join(', ');
      console.log(`    ${pc.cyan(honoPath.padEnd(25))} ${pc.dim(`[${methodList}]`)}`);
    }

    console.log(pc.dim('\n  Press Ctrl+C to terminate\n'));
  } catch (err: any) {
    console.error(pc.red(`Failed to start server: ${err.message}`));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(pc.red(err.message));
  process.exit(1);
});
