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

  return app;
}
