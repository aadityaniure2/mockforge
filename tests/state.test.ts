import { describe, it, expect } from 'vitest';
import { createMockApp } from '../src/core/router.js';
import type { OpenAPISpec } from '../src/core/parser.js';

describe('In-Memory Stateful Prototyping Store (stateful-store)', () => {
  const spec: OpenAPISpec = {
    openapi: '3.0.3',
    paths: {
      '/api/pets': {
        get: {
          responses: {
            '200': {
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer' },
                        name: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          responses: {
            '201': {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer' },
                      name: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/pets/{petId}': {
        get: {
          responses: {
            '200': {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer' },
                      name: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
        put: {
          responses: {
            '200': {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer' },
                      name: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
        delete: {
          responses: {
            '204': {
              description: 'Pet deleted',
            },
          },
        },
      },
    },
  };

  it('pre-seeds collection with 3 items on empty GET /collection', async () => {
    const app = createMockApp(spec, { stateless: false });
    const res = await app.request('/api/pets');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(3);
    expect(body[0]).toHaveProperty('id');
    expect(body[0]).toHaveProperty('name');
  });

  it('persists a POSTed item and allows retrieval by GET /collection/:id', async () => {
    const app = createMockApp(spec, { stateless: false });
    
    // Create new pet
    const postRes = await app.request('/api/pets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Rex', tag: 'dog' }),
    });
    expect(postRes.status).toBe(201);
    const createdPet = await postRes.json();
    expect(createdPet.name).toBe('Rex');
    expect(createdPet.id).toBeDefined();

    // Fetch the newly created pet
    const getRes = await app.request(`/api/pets/${createdPet.id}`);
    expect(getRes.status).toBe(200);
    const fetchedPet = await getRes.json();
    expect(fetchedPet.id).toBe(createdPet.id);
    expect(fetchedPet.name).toBe('Rex');
  });

  it('updates an item via PUT /collection/:id', async () => {
    const app = createMockApp(spec, { stateless: false });

    // Seed list first
    const listRes = await app.request('/api/pets');
    const pets = await listRes.json();
    const targetPet = pets[0];

    // Update pet
    const updateRes = await app.request(`/api/pets/${targetPet.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'UpdatedName' }),
    });
    expect(updateRes.status).toBe(200);
    const updatedBody = await updateRes.json();
    expect(updatedBody.name).toBe('UpdatedName');
    expect(updatedBody.id).toBe(targetPet.id);

    // Verify change is persisted
    const verifyRes = await app.request(`/api/pets/${targetPet.id}`);
    const verifyBody = await verifyRes.json();
    expect(verifyBody.name).toBe('UpdatedName');
  });

  it('deletes an item via DELETE /collection/:id', async () => {
    const app = createMockApp(spec, { stateless: false });

    // Seed list
    const listRes = await app.request('/api/pets');
    const pets = await listRes.json();
    const targetPet = pets[0];

    // Delete
    const deleteRes = await app.request(`/api/pets/${targetPet.id}`, {
      method: 'DELETE',
    });
    expect(deleteRes.status).toBe(204);

    // Verify 404
    const getDeleted = await app.request(`/api/pets/${targetPet.id}`);
    expect(getDeleted.status).toBe(404);
  });

  it('returns 404 when querying non-existent item id', async () => {
    const app = createMockApp(spec, { stateless: false });
    const res = await app.request('/api/pets/999999999');
    expect(res.status).toBe(404);
  });

  it('bypasses stateful store when --stateless is set', async () => {
    const app = createMockApp(spec, { stateless: true });

    // POST item
    const postRes = await app.request('/api/pets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'StatelessPet' }),
    });
    // In stateless mode, returns synthesized mock data
    expect(postRes.status).toBe(201);

    // GET /api/pets/12345 should synthesize random data instead of 404
    const getRes = await app.request('/api/pets/12345');
    expect(getRes.status).toBe(200);
  });
});
