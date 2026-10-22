import fs from 'node:fs';
import path from 'node:path';
import $RefParser from '@apidevtools/json-schema-ref-parser';
import YAML from 'yaml';
import pc from 'picocolors';

export interface OpenAPIParameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required?: boolean;
  schema?: any;
  description?: string;
  example?: any;
}

export interface OpenAPIOperation {
  summary?: string;
  operationId?: string;
  parameters?: OpenAPIParameter[];
  requestBody?: {
    required?: boolean;
    content?: Record<string, { schema?: any; example?: any }>;
  };
  responses: Record<string, {
    description?: string;
    content?: Record<string, { schema?: any; example?: any }>;
    headers?: Record<string, any>;
  }>;
}

export interface OpenAPISpec {
  openapi: string;
  info?: {
    title?: string;
    version?: string;
    description?: string;
  };
  paths: Record<string, Record<string, OpenAPIOperation>>;
  components?: {
    schemas?: Record<string, any>;
    responses?: Record<string, any>;
    parameters?: Record<string, any>;
  };
  [key: string]: any;
}

export interface ParseOptions {
  isRawContent?: boolean;
  timeoutMs?: number;
}

export async function parseSpec(
  source: string,
  options: ParseOptions = {}
): Promise<OpenAPISpec> {
  const timeoutMs = options.timeoutMs ?? 10000;
  let rawDoc: any;

  if (options.isRawContent) {
    try {
      rawDoc = YAML.parse(source);
    } catch (err: any) {
      throw new Error(`Failed to parse specification string: ${err.message}`);
    }
  } else if (/^https?:\/\//i.test(source)) {
    try {
      const response = await fetch(source, {
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      const text = await response.text();
      rawDoc = YAML.parse(text);
    } catch (err: any) {
      throw new Error(
        pc.red(`Failed to fetch OpenAPI spec from remote URL "${source}": ${err.message}`)
      );
    }
  } else {
    const resolvedPath = path.isAbsolute(source)
      ? source
      : path.resolve(process.cwd(), source);

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(pc.red(`Specification file not found at path: "${resolvedPath}"`));
    }

    try {
      const content = fs.readFileSync(resolvedPath, 'utf-8');
      rawDoc = YAML.parse(content);
    } catch (err: any) {
      throw new Error(
        pc.red(`Failed to read/parse specification file "${resolvedPath}": ${err.message}`)
      );
    }
  }

  // Pre-dereferencing validation
  if (!rawDoc || typeof rawDoc !== 'object') {
    throw new Error(pc.red('Invalid specification: content does not resolve to an object.'));
  }

  if (rawDoc.swagger === '2.0') {
    throw new Error(
      pc.yellow('Swagger 2.0 is not fully supported; please upgrade to OpenAPI 3.0.x or 3.1.x.')
    );
  }

  if (!rawDoc.openapi || typeof rawDoc.openapi !== 'string' || !rawDoc.openapi.startsWith('3.')) {
    throw new Error(
      pc.red(`Missing OpenAPI version or unsupported version "${rawDoc.openapi}". Expected openapi: 3.0.x or 3.1.x.`)
    );
  }

  let inputTarget: any = rawDoc;
  if (!options.isRawContent && !/^https?:\/\//i.test(source)) {
    const resolvedPath = path.isAbsolute(source)
      ? source
      : path.resolve(process.cwd(), source);
    inputTarget = resolvedPath;
  }

  // Dereferencing with circular: 'ignore'
  let dereferenced: OpenAPISpec;
  try {
    dereferenced = (await $RefParser.dereference(inputTarget, {
      dereference: {
        circular: 'ignore',
      },
    })) as OpenAPISpec;
  } catch (err: any) {
    throw new Error(pc.red(`Failed to dereference OpenAPI schemas: ${err.message}`));
  }

  // Post-dereferencing validation
  if (
    !dereferenced.paths ||
    typeof dereferenced.paths !== 'object' ||
    Object.keys(dereferenced.paths).length === 0
  ) {
    throw new Error(
      pc.red("Invalid OpenAPI specification: missing or empty 'paths' object. At least one route must be defined.")
    );
  }

  return dereferenced;
}
