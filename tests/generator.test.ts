import { describe, it, expect } from 'vitest';
import { matchSemanticProperty } from '../src/generator/semantic-matcher.js';
import { generateMockFromSchema } from '../src/generator/schema-generator.js';

describe('Semantic Matcher (schema-synthesizer)', () => {
  it('matches semantic property names to realistic faker values', () => {
    expect(matchSemanticProperty('userEmail')).toMatch(/@/);
    expect(matchSemanticProperty('account_id')).toEqual(expect.any(Number));
    expect(matchSemanticProperty('id')).toEqual(expect.any(Number));
    expect(matchSemanticProperty('user_uuid')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
    expect(matchSemanticProperty('avatarUrl')).toMatch(/^https?:\/\//i);
    expect(matchSemanticProperty('phone_number')).toEqual(expect.any(String));
    expect(matchSemanticProperty('firstName')).toEqual(expect.any(String));
    expect(matchSemanticProperty('lastName')).toEqual(expect.any(String));
    expect(matchSemanticProperty('fullName')).toEqual(expect.any(String));
    expect(matchSemanticProperty('name')).toEqual(expect.any(String));
    expect(matchSemanticProperty('total_price')).toBeGreaterThanOrEqual(5);
    expect(matchSemanticProperty('currency')).toHaveLength(3);
    expect(new Date(matchSemanticProperty('created_at') as string).getTime()).not.toBeNaN();
    expect(matchSemanticProperty('city')).toEqual(expect.any(String));
    expect(matchSemanticProperty('country')).toEqual(expect.any(String));
    expect(matchSemanticProperty('website_url')).toMatch(/^https?:\/\//i);
  });

  it('returns undefined when property name has no semantic match', () => {
    expect(matchSemanticProperty('arbitraryCustomKey123')).toBeUndefined();
  });
});

describe('Schema Mock Data Synthesis Engine (schema-synthesizer)', () => {
  it('synthesizes primitives correctly', () => {
    const stringResult = generateMockFromSchema({ type: 'string' });
    expect(typeof stringResult).toBe('string');

    const intResult = generateMockFromSchema({ type: 'integer', minimum: 10, maximum: 20 });
    expect(typeof intResult).toBe('number');
    expect(intResult).toBeGreaterThanOrEqual(10);
    expect(intResult).toBeLessThanOrEqual(20);

    const boolResult = generateMockFromSchema({ type: 'boolean' });
    expect(typeof boolResult).toBe('boolean');
  });

  it('synthesizes enums by selecting one of the values', () => {
    const enumVals = ['active', 'pending', 'inactive'];
    const result = generateMockFromSchema({ enum: enumVals });
    expect(enumVals).toContain(result);
  });

  it('synthesizes arrays respecting minItems and maxItems', () => {
    const schema = {
      type: 'array',
      minItems: 2,
      maxItems: 4,
      items: { type: 'string' },
    };
    const result = generateMockFromSchema(schema);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result.length).toBeLessThanOrEqual(4);
    result.forEach((item: any) => expect(typeof item).toBe('string'));
  });

  it('merges allOf schemas into a unified object', () => {
    const schema = {
      allOf: [
        {
          type: 'object',
          properties: { id: { type: 'integer' }, name: { type: 'string' } },
        },
        {
          type: 'object',
          properties: { email: { type: 'string' } },
        },
      ],
    };
    const result = generateMockFromSchema(schema);
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('email');
  });

  it('picks one branch for oneOf / anyOf', () => {
    const schema = {
      oneOf: [
        { type: 'object', properties: { catName: { type: 'string' } } },
        { type: 'object', properties: { dogName: { type: 'string' } } },
      ],
    };
    const result = generateMockFromSchema(schema);
    expect(result.catName !== undefined || result.dogName !== undefined).toBe(true);
  });

  it('applies semantic matcher precedence over generic type for properties', () => {
    const schema = {
      type: 'object',
      properties: {
        email: { type: 'string' },
        avatar: { type: 'string' },
        created_at: { type: 'string' },
        price: { type: 'number' },
      },
    };
    const result = generateMockFromSchema(schema);
    expect(result.email).toMatch(/@/);
    expect(result.avatar).toMatch(/^https?:\/\//i);
    expect(result.price).toBeGreaterThanOrEqual(5);
    expect(new Date(result.created_at).getTime()).not.toBeNaN();
  });

  it('prevents stack overflow on recursive schemas via depth limit and cycle breaker', () => {
    // Schema with direct self-reference
    const recursiveSchema: any = {
      type: 'object',
      properties: {
        id: { type: 'integer' },
        name: { type: 'string' },
      },
    };
    recursiveSchema.properties.parent = recursiveSchema;
    recursiveSchema.properties.children = {
      type: 'array',
      items: recursiveSchema,
    };

    // Must not throw RangeError: Maximum call stack size exceeded
    expect(() => {
      const result = generateMockFromSchema(recursiveSchema, { maxDepth: 3 });
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    }).not.toThrow();
  });
});
