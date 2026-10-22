---
name: server-and-chaos
description: Use this skill when building the HTTP server, mapping OpenAPI path parameters to Hono routes, implementing status code overrides via Prefer headers, or adding chaos latency.
---

# HTTP Mock Server, Routing & Chaos Pipeline

## Goal
Mount dereferenced OpenAPI paths onto an ultra-fast Hono HTTP server, supporting dynamic parameter matching, developer header overrides, and chaos injection.

## Route Registration Protocol
1. **Path Syntax Conversion**:
   - Convert OpenAPI syntax `/users/{userId}/posts/{postId}` into Hono parameter syntax `/users/:userId/posts/:postId`.
   - Support wildcards if path definitions include subpaths.
2. **Method Registration**:
   - Register distinct handlers for `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`, `HEAD`.
   - Add a global CORS middleware allowing all origins (`*`), headers, and methods.

## Middleware Execution Pipeline Order
Every incoming request must traverse middleware in this exact sequence:
1. **Prefer Header Overrides**:
   - Inspect request header `Prefer` (case-insensitive).
   - If `Prefer: code=404` or `Prefer: status=500`, skip mock synthesis and immediately return that status code with `{ "message": "Simulated error via Prefer header" }`.
   - If `Prefer: delay=1500`, force an artificial delay of 1500ms for this request.
2. **Global Artificial Latency**:
   - If CLI `--delay <ms>` is set, apply `await new Promise(r => setTimeout(r, ms))`.
3. **Chaos Monkey Injection**:
   - If CLI `--chaos <rate>` is set (e.g., `0.1` = 10% failure rate):
     - Generate `Math.random()`.
     - If `< rate`, randomly return HTTP `500 Internal Server Error` or `503 Service Unavailable`.
4. **Mock Execution & Response**:
   - Find response schema matching status `200`, `201`, or lowest `2xx` definition under `responses`.
   - Synthesize data via `schema-synthesizer` and return `c.json(data)`.
5. **Real-Time Request Logger**:
   - Print formatted terminal line: `[METHOD] /path -> STATUS (duration_ms)`.
