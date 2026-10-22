---
name: cli-and-watcher
description: Use this skill when building the command-line interface, parsing flags with Commander, packaging the executable binary, or setting up Chokidar hot-reloading.
---

# CLI Interface, Binary Packaging & Hot Reload

## Goal
Create a polished terminal experience with instant start, colored diagnostics, and zero-downtime hot-reloading on spec edits.

## CLI Specification (`commander`)
- Command: `mockforge <spec-path-or-url>`
- Flags:
  - `-p, --port <number>`: Port to bind server (default: `4000`, auto-increments if port is busy).
  - `-d, --delay <ms>`: Fixed artificial delay in milliseconds (default: `0`).
  - `-c, --chaos <rate>`: Failure rate between `0.0` and `1.0` (default: `0`).
  - `-s, --stateless`: Disable stateful in-memory CRUD persistence.
  - `-w, --watch`: Watch local spec file for changes and hot-reload.
  - `-v, --version`: Output version.

## Hot-Reloading Protocol (`chokidar`)
1. Only initialize file watching when the spec is a local file path.
2. Debounce file changes by 200ms to avoid reading partial file writes.
3. On modification event:
   - Re-parse and dereference the file.
   - If invalid syntax, print a non-fatal terminal error and keep previous server routes active.
   - If valid, dynamically swap route handlers without restarting the Node process or changing the bound port.
