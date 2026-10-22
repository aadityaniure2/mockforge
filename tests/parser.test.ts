import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { parseSpec } from '../src/core/parser.js';

describe('Spec Parser (spec-parser)', () => {
  const fixturesDir = path.resolve(__dirname, 'fixtures');

  it('loads and dereferences a valid OpenAPI 3.0 YAML spec', async () => {
    const petstorePath = path.join(fixturesDir, 'simple-petstore.yaml');
    const result = await parseSpec(petstorePath);

    expect(result).toBeDefined();
    expect(result.openapi).toMatch(/^3\./);
    expect(result.paths).toBeDefined();
    expect(result.paths['/pets']).toBeDefined();

    // Verify $ref is dereferenced
    const getPetSchema = result.paths['/pets']?.get?.responses?.['200']?.content?.['application/json']?.schema;
    expect(getPetSchema).toBeDefined();
    expect(getPetSchema.items).toBeDefined();
    expect(getPetSchema.items.properties?.name).toBeDefined();
  });

  it('handles circular / recursive schemas with circular: ignore', async () => {
    const recursivePath = path.join(fixturesDir, 'recursive-loop.yaml');
    const result = await parseSpec(recursivePath);

    expect(result).toBeDefined();
    expect(result.paths['/trees']).toBeDefined();
    const treeSchema = result.paths['/trees']?.get?.responses?.['200']?.content?.['application/json']?.schema;
    expect(treeSchema).toBeDefined();
    // circular ref should be safely handled without throwing
    expect(result.components?.schemas?.TreeNode).toBeDefined();
  });

  it('loads and validates JSON OpenAPI spec string', async () => {
    const jsonSpec = JSON.stringify({
      openapi: '3.0.1',
      info: { title: 'Test JSON', version: '1.0' },
      paths: {
        '/ping': {
          get: {
            responses: {
              '200': {
                description: 'pong',
                content: {
                  'application/json': {
                    schema: { type: 'string', example: 'pong' },
                  },
                },
              },
            },
          },
        },
      },
    });

    const result = await parseSpec(jsonSpec, { isRawContent: true });
    expect(result.openapi).toBe('3.0.1');
    expect(result.paths['/ping']?.get?.responses?.['200']).toBeDefined();
  });

  it('throws descriptive error if paths object is missing or empty', async () => {
    // We can test inline object or invalid spec
    await expect(parseSpec(JSON.stringify({ openapi: '3.0.0' }), { isRawContent: true }))
      .rejects
      .toThrow(/missing or empty 'paths'/i);

    await expect(parseSpec(JSON.stringify({ openapi: '3.0.0', paths: {} }), { isRawContent: true }))
      .rejects
      .toThrow(/missing or empty 'paths'/i);
  });

  it('throws error for unsupported Swagger 2.0 or missing version', async () => {
    await expect(parseSpec(JSON.stringify({ swagger: '2.0', paths: { '/x': {} } }), { isRawContent: true }))
      .rejects
      .toThrow(/Swagger 2\.0 is not fully supported/i);

    await expect(parseSpec(JSON.stringify({ paths: { '/x': {} } }), { isRawContent: true }))
      .rejects
      .toThrow(/Missing OpenAPI version/i);
  });

  it('throws descriptive error for non-existent file', async () => {
    await expect(parseSpec('non-existent-spec-file.yaml'))
      .rejects
      .toThrow();
  });
});
