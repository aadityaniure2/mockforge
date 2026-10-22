# 🔥 MockForge

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/aadityaniure2/mockforge)
[![npm version](https://img.shields.io/badge/npm-v1.0.0-blue.svg)](https://www.npmjs.com/package/@aadi20/mockforge)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **Instant, zero-setup OpenAPI 3.0/3.1 mock server CLI with semantic data synthesis, stateful in-memory CRUD persistence, and chaos engineering.**

![MockForge Demo](./demo.gif)

---

## ⚡ Quickstart

Spin up an instant, standards-compliant mock server straight from your OpenAPI specification—no installation or configuration needed:

```bash
npx @aadi20/mockforge ./openapi.yaml
```

MockForge parses local files (`.yaml`, `.yml`, `.json`) and remote URLs (`https://api.example.com/openapi.json`), resolves circular `$ref` schemas, binds parameter routes, and starts serving realistic mock endpoints in milliseconds.

---

## ✨ Key Features

| Feature | Description |
| :--- | :--- |
| 🧠 **Semantic Data Synthesis** | Intelligently maps schema property names (`email`, `avatar`, `uuid`, `userId`, `price`, `created_at`) directly to realistic Faker.js generators instead of generic placeholder strings. |
| ⚡ **Zero-Downtime Hot Reloading** | Watches your local spec via Chokidar with 200ms debounce. Edits instantly swap active route definitions in-memory without dropping active connections or restarting the port. |
| 🎲 **Chaos & Latency Simulation** | Inject controlled network latency with `--delay <ms>` or simulate service degradation and outage rates with `--chaos <rate>` (0.0 to 1.0). |
| 💾 **Stateful Prototyping Store** | Complete in-memory CRUD database out-of-the-box. Items submitted via `POST` are stored and retrievable via `GET /collection/:id`, updateable with `PUT`/`PATCH`, and removable via `DELETE`. |
| 🎛️ **Developer Header Overrides** | Control responses on a per-request basis with standard `Prefer` headers (`Prefer: code=404`, `Prefer: status=500`, `Prefer: delay=1500`) to test frontend edge cases on demand. |
| 🌐 **Universal CORS & Fast HTTP** | Powered by Hono and `@hono/node-server` with out-of-the-box wildcard CORS headers and real-time ANSI terminal request logging. |

---

## 💻 CLI Flags Reference

```bash
mockforge [options] <spec-path-or-url>
```

| Flag | Long Flag | Description | Default |
| :--- | :--- | :--- | :--- |
| `-p` | `--port <number>` | Port number to bind the mock server to. Auto-increments if port is busy. | `4000` |
| `-d` | `--delay <ms>` | Global artificial latency applied to all requests in milliseconds. | `0` |
| `-c` | `--chaos <rate>` | Chaos monkey error probability between `0.0` (0%) and `1.0` (100%). | `0` |
| `-s` | `--stateless` | Disable stateful in-memory CRUD store; synthesizes fresh schema data per request. | `false` |
| `-w` | `--watch` | Watch local specification file for changes and hot-reload routes dynamically. | `false` |
| `-v` | `--version` | Output the current version of MockForge. | `1.0.0` |
| `-h` | `--help` | Display the CLI help manual and flag descriptions. | — |

---

## 🛠️ Real-World Testing Examples

### 1. Simulating Slow 3G / High Latency Networks
Simulate realistic mobile conditions to audit loading skeletons, spinners, and async UI states:

```bash
# Force a 1,500ms delay on all requests
npx mockforge ./specs/store.yaml --delay 1500
```

Or trigger latency on a single request from client code:
```bash
curl -H "Prefer: delay=2000" http://localhost:4000/api/products
```

---

### 2. Testing Frontend Error Boundaries (Chaos Engineering)
Test how resilient your React/Vue/Svelte error boundaries and retry logic are when backend microservices flap:

```bash
# Inject a 20% random failure rate (HTTP 500 / 503)
npx mockforge ./specs/store.yaml --chaos 0.2
```

Or simulate an exact error code instantaneously via header:
```bash
curl -i -H "Prefer: code=503" http://localhost:4000/api/users
```
```json
HTTP/1.1 503 Service Unavailable
Content-Type: application/json

{
  "message": "Simulated error via Prefer header",
  "status": 503
}
```

---

### 3. Stateful Checkout Flow Prototyping
Develop frontend carts, item creation, and detail views before backend APIs exist:

```bash
# Run in default stateful mode with spec hot-reloading
npx mockforge ./specs/ecommerce.yaml --watch
```

```bash
# 1. Fetch pre-seeded collection (auto-generates 3 realistic items)
curl http://localhost:4000/cart

# 2. Add an item
curl -X POST http://localhost:4000/cart \
  -H "Content-Type: application/json" \
  -d '{"name": "Mechanical Keyboard", "price": 129.99}'

# 3. Retrieve the newly created item by ID
curl http://localhost:4000/cart/101

# 4. Delete the item
curl -X DELETE http://localhost:4000/cart/101
```

---

## 🏗️ Architecture Pipeline

```text
  +-------------------------------------------------------------+
  |              OpenAPI 3.0 / 3.1 Spec (YAML/JSON)             |
  +-------------------------------------------------------------+
                                 │
                                 ▼
  +-------------------------------------------------------------+
  |    Spec Parser & Ingestion ($RefParser & Circular Guard)    |
  +-------------------------------------------------------------+
                                 │
                                 ▼
  +-------------------------------------------------------------+
  |           Hono HTTP Router (/users/:userId mapping)         |
  +-------------------------------------------------------------+
                                 │
                                 ▼
  +-------------------------------------------------------------+
  |                      Middleware Pipeline                    |
  |  1. Global CORS Handler (*)                                 |
  |  2. Prefer Header Overrides (code=404, delay=1500)          |
  |  3. Global Latency Simulator (--delay <ms>)                 |
  |  4. Chaos Monkey Injector (--chaos <rate>)                  |
  |  5. Terminal Logger ([METHOD] /path -> STATUS (duration))   |
  +-------------------------------------------------------------+
                                 │
                ┌────────────────┴────────────────┐
                │                                 │
       [Stateful Mode]                    [Stateless Mode / Miss]
                ▼                                 ▼
  +--------------------------+      +---------------------------+
  | Stateful In-Memory Store |      | Schema Synthesizer Engine |
  | (Pre-seed, POST/GET/DEL) |      | (Faker.js Heuristics)     |
  +--------------------------+      +---------------------------+
                │                                 │
                └────────────────┬────────────────┘
                                 │
                                 ▼
  +-------------------------------------------------------------+
  |                    HTTP JSON Client Response                |
  +-------------------------------------------------------------+
```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Ensure tests pass (`npm test`)
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
