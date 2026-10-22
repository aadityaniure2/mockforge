---
name: schema-synthesizer
description: Use this skill when generating mock data from JSON schemas, handling circular schema references, or mapping field names to realistic Faker.js generators.
---

# Schema Mock Data Synthesis Engine

## Goal
Convert any valid OpenAPI/JSON schema into realistic, schema-valid mock JavaScript objects without infinite recursion loops.

## Core Rules & Recursion Controls
1. **Branch Depth Limit**:
   - Maintain a `depth` counter across recursive calls.
   - Default max depth = `3`. If `depth > 3`, return `null` or a minimal primitive to truncate the tree.
2. **Cycle Breaker**:
   - Maintain a `visited = new Set<object>()` tracking object references within the current branch.
   - If an object schema reference has already been visited in the active branch, return `null` or `{}` immediately.

## Semantic Matching Rules (Property Name Precedence)
Before evaluating `type`, match property keys against the following regular expressions:
- `/email/i` -> `faker.internet.email()`
- `/uuid/i` -> `faker.string.uuid()`
- `/id$/i` -> `faker.number.int({ min: 1, max: 99999 })`
- `/avatar|image|photo/i` -> `faker.image.avatar()`
- `/phone|mobile/i` -> `faker.phone.number()`
- `/first.*name/i` -> `faker.person.firstName()`
- `/last.*name/i` -> `faker.person.lastName()`
- `/full.*name|name$/i` -> `faker.person.fullName()`
- `/price|amount|cost/i` -> `faker.number.float({ min: 5, max: 500, fractionDigits: 2 })`
- `/currency/i` -> `faker.finance.currencyCode()`
- `/created_at|updated_at|timestamp|date/i` -> `faker.date.recent().toISOString()`
- `/city/i` -> `faker.location.city()`
- `/country/i` -> `faker.location.country()`
- `/url|website/i` -> `faker.internet.url()`

## Schema Keyword Handling
- `enum`: Uniform random selection from `schema.enum`.
- `oneOf` / `anyOf`: Randomly select exactly one branch to generate.
- `allOf`: Deep merge properties across all listed schemas into a unified object.
- `array`: Generate an array with length bounded by `minItems` (default 1) and `maxItems` (default 3).
- `number` / `integer`: Respect `minimum` and `maximum` if provided.
- `string`: Respect `minLength` and `maxLength`. If `format` is provided (`date-time`, `ipv4`, `uri`), use matching Faker format.
