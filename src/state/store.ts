import { faker } from '@faker-js/faker';
import type { Context } from 'hono';
import type { OpenAPIOperation, OpenAPISpec } from '../core/parser.js';
import { generateMockFromSchema } from '../generator/schema-generator.js';

export interface RouteMeta {
  collection: string;
  isItemRoute: boolean;
  paramName?: string;
}

export function parseRouteMeta(honoPath: string): RouteMeta | null {
  const segments = honoPath.split('/').filter(Boolean);
  if (segments.length === 0) return null;

  const lastSegment = segments[segments.length - 1];
  if (lastSegment.startsWith(':')) {
    if (segments.length < 2) return null;
    const collection = segments[segments.length - 2];
    const paramName = lastSegment.slice(1);
    return { collection, isItemRoute: true, paramName };
  }

  return { collection: lastSegment, isItemRoute: false };
}

export class StatefulStore {
  // collectionName -> Map<id, entity>
  private collections = new Map<string, Map<string, any>>();

  private getCollection(name: string): Map<string, any> {
    let col = this.collections.get(name);
    if (!col) {
      col = new Map();
      this.collections.set(name, col);
    }
    return col;
  }

  async handleRequest(
    c: Context,
    method: string,
    honoPath: string,
    operation: OpenAPIOperation,
    spec: OpenAPISpec
  ): Promise<Response | undefined> {
    const meta = parseRouteMeta(honoPath);
    if (!meta) return undefined;

    const { collection, isItemRoute, paramName } = meta;
    const col = this.getCollection(collection);

    // 1. GET /collection
    if (method === 'get' && !isItemRoute) {
      if (col.size === 0) {
        // Pre-seed with 3 items
        const resp200 = operation.responses?.['200'] || operation.responses?.['201'] || operation.responses?.default;
        const schema = resp200?.content?.['application/json']?.schema;
        const itemSchema = schema?.type === 'array' ? schema.items : schema;

        for (let i = 1; i <= 3; i++) {
          const mock = itemSchema
            ? generateMockFromSchema(itemSchema, { rootSpec: spec })
            : {};
          const item = typeof mock === 'object' && mock !== null ? mock : { value: mock };
          if (item.id === undefined) {
            item.id = i;
          }
          col.set(String(item.id), item);
        }
      }
      return c.json(Array.from(col.values()), 200);
    }

    // 2. POST /collection
    if (method === 'post' && !isItemRoute) {
      const body = await c.req.json().catch(() => ({}));
      const item = { ...body };
      if (item.id === undefined || item.id === null) {
        item.id = faker.number.int({ min: 100, max: 99999 });
      }
      col.set(String(item.id), item);
      return c.json(item, 201);
    }

    // 3. GET /collection/:id
    if (method === 'get' && isItemRoute) {
      const id = paramName ? c.req.param(paramName) : Object.values(c.req.param() || {})[0];
      if (!id) return undefined;

      const item = col.get(String(id));
      if (!item) {
        return c.json({ message: `Entity with id ${id} not found in collection ${collection}` }, 404);
      }
      return c.json(item, 200);
    }

    // 4. PUT / PATCH /collection/:id
    if ((method === 'put' || method === 'patch') && isItemRoute) {
      const id = paramName ? c.req.param(paramName) : Object.values(c.req.param() || {})[0];
      if (!id) return undefined;

      const existing = col.get(String(id));
      if (!existing) {
        return c.json({ message: `Entity with id ${id} not found in collection ${collection}` }, 404);
      }

      const updates = await c.req.json().catch(() => ({}));
      const updated = { ...existing, ...updates, id: existing.id };
      col.set(String(id), updated);
      return c.json(updated, 200);
    }

    // 5. DELETE /collection/:id
    if (method === 'delete' && isItemRoute) {
      const id = paramName ? c.req.param(paramName) : Object.values(c.req.param() || {})[0];
      if (!id) return undefined;

      const existing = col.get(String(id));
      if (!existing) {
        return c.json({ message: `Entity with id ${id} not found in collection ${collection}` }, 404);
      }

      col.delete(String(id));
      return c.body(null, 204);
    }

    return undefined;
  }
}
