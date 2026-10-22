import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { OpenAPISpec, OpenAPIOperation } from './parser.js';
import { createPipelineMiddleware } from '../middleware/chaos.js';
import { generateMockFromSchema } from '../generator/schema-generator.js';
import { StatefulStore } from '../state/store.js';

export interface ServerOptions {
  delay?: number;
  chaos?: number;
  stateless?: boolean;
  silent?: boolean;
}

export function openApiPathToHonoPath(openApiPath: string): string {
  // Convert {param} to :param
  return openApiPath.replace(/\{([^}]+)\}/g, ':$1');
}

export function findBestResponse(responses: Record<string, any>): {
  statusCode: number;
  schema?: any;
} {
  const codes = Object.keys(responses);

  // Look for 200, 201, or lowest 2xx
  let chosenCode = codes.find((code) => code === '200')
    || codes.find((code) => code === '201')
    || codes.find((code) => code.startsWith('2'));

  if (!chosenCode) {
    chosenCode = codes.find((code) => code === 'default') || codes[0] || '200';
  }

  const numCode = parseInt(chosenCode, 10) || 200;
  const respDef = responses[chosenCode];
  const content = respDef?.content;

  let schema: any;
  if (content) {
    if (content['application/json']?.schema) {
      schema = content['application/json'].schema;
    } else {
      const firstContentType = Object.keys(content)[0];
      if (firstContentType) {
        schema = content[firstContentType].schema;
      }
    }
  }

  return { statusCode: numCode, schema };
}

export function createMockApp(spec: OpenAPISpec, options: ServerOptions = {}): Hono {
  const app = new Hono();

  // 1. Global CORS
  app.use('*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowHeaders: ['*'],
    exposeHeaders: ['*'],
  }));

  // 2. Middleware Pipeline (Prefer headers, Delay, Chaos, Logger)
  app.use('*', createPipelineMiddleware({
    delay: options.delay,
    chaos: options.chaos,
    silent: options.silent ?? true, // silent in tests by default
  }));

  const store = !options.stateless ? new StatefulStore() : null;

  // 3. Register routes
  for (const [openApiPath, methods] of Object.entries(spec.paths || {})) {
    const honoPath = openApiPathToHonoPath(openApiPath);

    for (const [method, op] of Object.entries(methods)) {
      const httpMethod = method.toLowerCase();
      const operation = op as OpenAPIOperation;

      if (!['get', 'post', 'put', 'patch', 'delete', 'options', 'head'].includes(httpMethod)) {
        continue;
      }

      const handler = async (c: any) => {
        // Stateful handling if enabled
        if (store) {
          const storeResult = await store.handleRequest(c, httpMethod, honoPath, operation, spec);
          if (storeResult !== undefined) {
            return storeResult;
          }
        }

        // Stateless / Default Mock Generation
        const { statusCode, schema } = findBestResponse(operation.responses || {});

        if (statusCode === 204) {
          return c.body(null, 204);
        }

        if (schema) {
          const mockData = generateMockFromSchema(schema, { rootSpec: spec });
          return c.json(mockData, statusCode as any);
        }

        return c.json({ message: 'Success' }, statusCode as any);
      };

      (app as any)[httpMethod](honoPath, handler);
    }
  }

  // 4. Default welcome page if '/' is not defined in spec
  if (!spec.paths?.['/'] && !spec.paths?.['']) {
    app.get('/', (c) => {
      const endpoints = Object.keys(spec.paths || {})
        .map((p) => {
          const honoPath = openApiPathToHonoPath(p);
          const methods = Object.keys(spec.paths[p] || {})
            .map((m) => m.toUpperCase())
            .join(', ');
          return `<li><a href="${honoPath}">${honoPath}</a> <span style="color:#666">(${methods})</span></li>`;
        })
        .join('');

      return c.html(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>${spec.info?.title || 'MockForge Server'}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 2rem; max-width: 700px; margin: 0 auto; color: #222; background: #fafafa; }
            h1 { color: #f97316; margin-bottom: 0.25rem; }
            ul { line-height: 2; margin-top: 1rem; }
            a { color: #2563eb; text-decoration: none; font-weight: 500; font-family: monospace; font-size: 1.05rem; }
            a:hover { text-decoration: underline; }
            .badge { background: #e2e8f0; padding: 2px 8px; border-radius: 4px; font-size: 0.85rem; font-weight: normal; color: #333; }
            .box { background: #fff; padding: 1.5rem; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
          </style>
        </head>
        <body>
          <div class="box">
            <h1>🔥 ${spec.info?.title || 'MockForge API'} <span class="badge">v${spec.info?.version || '1.0.0'}</span></h1>
            <p style="color: #64748b;">${spec.info?.description || 'Instant mock server running locally.'}</p>
            <hr style="margin: 1.5rem 0; border: none; border-top: 1px solid #e2e8f0;" />
            <h3>Available Endpoints:</h3>
            <ul>${endpoints}</ul>
          </div>
        </body>
        </html>
      `);
    });
  }

  return app;
}
