import { describe, it, expect, vi } from 'vitest';
import { createMockApp, openApiPathToHonoPath } from '../src/core/router.js';
import type { OpenAPISpec } from '../src/core/parser.js';

describe('Path Syntax Conversion (server-and-chaos)', () => {
  it('converts OpenAPI path parameters to Hono route syntax', () => {
    expect(openApiPathToHonoPath('/users/{userId}')).toBe('/users/:userId');
    expect(openApiPathToHonoPath('/users/{userId}/posts/{postId}')).toBe(
      '/users/:userId/posts/:postId'
    );
    expect(openApiPathToHonoPath('/simple/path')).toBe('/simple/path');
  });
});

describe('HTTP Mock Server & Chaos Pipeline (server-and-chaos)', () => {
  const sampleSpec: OpenAPISpec = {
    openapi: '3.0.3',
    paths: {
      '/users': {
        get: {
          responses: {
            '200': {
              description: 'Users list',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer' },
                        email: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/users/{id}': {
        get: {
          responses: {
            '200': {
              description: 'Single user',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer' },
                      email: { type: 'string' },
                    },
                  },
                },
              },
            },
            '404': {
              description: 'User not found',
            },
          },
        },
      },
    },
  };

  it('serves default HTML welcome page at / when not defined in spec', async () => {
    const app = createMockApp(sampleSpec, { stateless: true });
    const res = await app.request('/');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('MockForge API');
    expect(html).toContain('/users');
  });

  it('serves mocked response for mapped route', async () => {
    const app = createMockApp(sampleSpec, { stateless: true });
    const res = await app.request('/users');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body[0]).toHaveProperty('email');
  });

  it('handles CORS preflight and headers', async () => {
    const app = createMockApp(sampleSpec, { stateless: true });
    const res = await app.request('/users', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:3000',
        'Access-Control-Request-Method': 'GET',
      },
    });
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });

  it('intercepts Prefer: code=404 or status=500 header', async () => {
    const app = createMockApp(sampleSpec, { stateless: true });
    const res404 = await app.request('/users', {
      headers: { Prefer: 'code=404' },
    });
    expect(res404.status).toBe(404);
    const body404 = await res404.json();
    expect(body404.message).toMatch(/Simulated error via Prefer header/i);

    const res500 = await app.request('/users', {
      headers: { Prefer: 'status=500' },
    });
    expect(res500.status).toBe(500);
    const body500 = await res500.json();
    expect(body500.message).toMatch(/Simulated error via Prefer header/i);
  });

  it('applies artificial delay via Prefer: delay=100', async () => {
    const app = createMockApp(sampleSpec, { stateless: true });
    const start = Date.now();
    const res = await app.request('/users', {
      headers: { Prefer: 'delay=100' },
    });
    const elapsed = Date.now() - start;
    expect(res.status).toBe(200);
    expect(elapsed).toBeGreaterThanOrEqual(80); // allowing slight timing jitter
  });

  it('triggers chaos monkey failures when chaos rate = 1.0', async () => {
    const app = createMockApp(sampleSpec, { chaos: 1.0, stateless: true });
    const res = await app.request('/users');
    expect([500, 503]).toContain(res.status);
  });

  it('does not trigger chaos monkey failures when chaos rate = 0', async () => {
    const app = createMockApp(sampleSpec, { chaos: 0, stateless: true });
    const res = await app.request('/users');
    expect(res.status).toBe(200);
  });
});
