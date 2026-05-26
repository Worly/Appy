# CLAUDE.md — Smart Filter DSL (Services/SmartFilter/)

A JSON-array-based query DSL that is compiled into a LINQ `Expression<Func<T, bool>>` for use in EF Core `Where()` calls. Both the backend (expression trees) and the frontend (TypeScript types) share this format — see `Appy-frontend/src/app/shared/CLAUDE.md` for the frontend side.

## Syntax

Three forms:

**Field comparison** (leaf node):
```json
["propertyName", "operator", value]
```

**Logical combination**:
```json
[leftFilter, "and"|"or", rightFilter]
```

**Negation**:
```json
["not", filter]
```

## Supported Operators

`==`, `!=`, `<`, `>`, `<=`, `>=`, `contains` (case-insensitive substring match on strings)

## Value Types

Values are automatically coerced to match the target property's runtime type: `string`, numeric types, enum (matched by name), `DateOnly`.

## Nested Property Access

Dot notation resolves nested properties: `"client.name"` becomes the expression `x.Client.Name`.

## Why a Custom DSL?

Lightweight and fully owned — no dependency on OData, GraphQL, or other query frameworks. The same JSON structure passes from the frontend URL query parameter through the controller directly into the service layer.
