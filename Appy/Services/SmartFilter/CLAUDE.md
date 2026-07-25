# CLAUDE.md — Smart Filter DSL (Services/SmartFilter/)

A JSON-array query DSL compiled into a LINQ `Expression<Func<T, bool>>` for EF Core `Where()` calls. The frontend builds the same structure in TypeScript and passes it through as a single URL query parameter — see `Appy-frontend/src/app/shared/CLAUDE.md` for that side.

A filter is a nested array of three forms — a field comparison, a logical combination, and a negation:

```json
[["client.name", "contains", "ana"], "and", ["status", "==", "Confirmed"]]
```

Read the compiler for the supported operators, value coercion, and nested-property resolution.

## Why Custom

Fully owned and dependency-free — no OData or GraphQL. The same JSON travels from the frontend URL through the controller into the service layer untouched.
