---
name: spec-parser
description: Use this skill when loading, validating, reading, or dereferencing OpenAPI 3.0 and 3.1 specifications from local files or remote URLs.
---

# OpenAPI Specification Loader & Dereferencer

## Goal
Ingest arbitrary OpenAPI specs (YAML or JSON, local path or HTTP URL) and resolve all internal and external `$ref` pointers into a single in-memory document.

## Architecture & Dependencies
- Package: `@apidevtools/json-schema-ref-parser`
- Package: `yaml`
- Package: `zod` or manual structural guard for OpenAPI version validation.

## Implementation Protocol
1. **Source Ingestion**:
   - Detect if input is a local file path (`.yaml`, `.yml`, `.json`) or a remote URL (`http://`, `https://`).
   - For remote URLs, fetch using native `fetch` with a 10-second timeout.
   - For local files, resolve relative paths against `process.cwd()`.

2. **Dereferencing & Circular Handling**:
   - Use `$RefParser.dereference(source, { dereference: { circular: 'ignore' } })`.
   - Never use naive string replacement for `$ref`. The dereferencer must handle complex local pointers (`#/components/schemas/Pet`) and remote file pointers.

3. **Validation & Version Guard**:
   - Check top-level keys: `openapi` or `swagger`.
   - If `swagger: "2.0"`, log a warning or convert basics; prioritize full support for `openapi: 3.0.x` and `3.1.x`.
   - Validate that `paths` is an object. If `paths` is missing or empty, throw a descriptive, colored user error.
