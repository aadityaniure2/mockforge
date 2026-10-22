import { faker } from '@faker-js/faker';
import { matchSemanticProperty } from './semantic-matcher.js';

export interface GeneratorOptions {
  maxDepth?: number;
  rootSpec?: any;
}

export function generateMockFromSchema(
  schema: any,
  options: GeneratorOptions = {},
  currentDepth: number = 0,
  visited: Set<any> = new Set()
): any {
  const maxDepth = options.maxDepth ?? 3;

  if (!schema || typeof schema !== 'object') {
    return null;
  }

  // 1. Depth Limit Check
  if (currentDepth > maxDepth) {
    return null;
  }

  // 2. Cycle Breaker
  if (visited.has(schema)) {
    return null;
  }

  // Handle unresolved $ref if rootSpec is available
  if (schema.$ref && typeof schema.$ref === 'string') {
    if (options.rootSpec && schema.$ref.startsWith('#/')) {
      const parts = schema.$ref.replace('#/', '').split('/');
      let current = options.rootSpec;
      for (const part of parts) {
        current = current?.[part];
      }
      if (current && typeof current === 'object') {
        return generateMockFromSchema(
          current,
          options,
          currentDepth + 1,
          new Set([...visited, schema])
        );
      }
    }
    return {};
  }

  // Create branch visited set
  const branchVisited = new Set(visited);
  branchVisited.add(schema);

  // 3. Enum
  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    return faker.helpers.arrayElement(schema.enum);
  }

  // 4. allOf - deep merge
  if (Array.isArray(schema.allOf) && schema.allOf.length > 0) {
    let merged: Record<string, any> = {};
    for (const subSchema of schema.allOf) {
      const subResult = generateMockFromSchema(
        subSchema,
        options,
        currentDepth + 1,
        branchVisited
      );
      if (subResult && typeof subResult === 'object' && !Array.isArray(subResult)) {
        merged = { ...merged, ...subResult };
      }
    }
    return merged;
  }

  // 5. oneOf / anyOf - pick one branch
  if (Array.isArray(schema.oneOf) && schema.oneOf.length > 0) {
    const chosen = faker.helpers.arrayElement(schema.oneOf);
    return generateMockFromSchema(chosen, options, currentDepth + 1, branchVisited);
  }
  if (Array.isArray(schema.anyOf) && schema.anyOf.length > 0) {
    const chosen = faker.helpers.arrayElement(schema.anyOf);
    return generateMockFromSchema(chosen, options, currentDepth + 1, branchVisited);
  }

  // 6. Schema Type resolution
  const type = schema.type || (schema.properties ? 'object' : schema.items ? 'array' : 'string');

  switch (type) {
    case 'string': {
      if (schema.format) {
        switch (schema.format) {
          case 'email':
            return faker.internet.email();
          case 'uuid':
            return faker.string.uuid();
          case 'uri':
          case 'url':
            return faker.internet.url();
          case 'date':
          case 'date-time':
            return faker.date.recent().toISOString();
          case 'ipv4':
            return faker.internet.ipv4();
          case 'ipv6':
            return faker.internet.ipv6();
        }
      }
      const minLength = schema.minLength ?? 3;
      const maxLength = schema.maxLength ?? 20;
      const word = faker.lorem.word();
      if (word.length < minLength) {
        return word.padEnd(minLength, 'x');
      }
      return word.slice(0, maxLength);
    }

    case 'integer': {
      const min = schema.minimum ?? 1;
      const max = schema.maximum ?? (min + 100);
      return faker.number.int({ min, max });
    }

    case 'number': {
      const min = schema.minimum ?? 1;
      const max = schema.maximum ?? (min + 100);
      return faker.number.float({ min, max, fractionDigits: 2 });
    }

    case 'boolean': {
      return faker.datatype.boolean();
    }

    case 'array': {
      const minItems = schema.minItems ?? 1;
      const maxItems = schema.maxItems ?? 3;
      const count = faker.number.int({ min: minItems, max: Math.max(minItems, maxItems) });
      const items: any[] = [];
      const itemSchema = schema.items || { type: 'string' };

      for (let i = 0; i < count; i++) {
        items.push(
          generateMockFromSchema(itemSchema, options, currentDepth + 1, branchVisited)
        );
      }
      return items;
    }

    case 'object': {
      const obj: Record<string, any> = {};
      const properties = schema.properties || {};

      for (const [key, propSchema] of Object.entries(properties)) {
        // Semantic matching precedence
        const semanticVal = matchSemanticProperty(key);
        if (semanticVal !== undefined) {
          obj[key] = semanticVal;
        } else {
          obj[key] = generateMockFromSchema(
            propSchema,
            options,
            currentDepth + 1,
            branchVisited
          );
        }
      }

      return obj;
    }

    default:
      return faker.lorem.word();
  }
}
