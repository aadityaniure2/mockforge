---
name: stateful-store
description: Use this skill when implementing in-memory CRUD persistence for mock routes, enabling stateful prototyping where POSTed items can be fetched by GET.
---

# In-Memory Stateful Prototyping Store

## Goal
Enable an in-memory database mode so frontend developers can perform stateful CRUD operations during development without a real database.

## Architecture & Storage Logic
1. **Resource Collection Mapping**:
   - Normalize routes into collection names. Example: `/api/users` -> collection `users`.
   - For `/api/users/:id`, bind the route to the `users` collection filtered by the key `:id`.
2. **CRUD Operations**:
   - `GET /collection`: Return all records in the collection. If collection is empty, pre-seed with 3 generated mock items.
   - `POST /collection`: Ingest payload. If missing `id`, generate a random `id` (numeric or UUID). Store record in memory. Return HTTP 201 with stored entity.
   - `GET /collection/:id`: Query collection for entity matching `id`. If found, return HTTP 200. If not found, return HTTP 404.
   - `PUT / PATCH /collection/:id`: Update existing in-memory entity. Return HTTP 200 with updated entity.
   - `DELETE /collection/:id`: Remove entity from collection. Return HTTP 204 No Content.
3. **Stateless Flag**:
   - When `--stateless` CLI flag is set, bypass the store entirely and synthesize fresh random data on every single request.
