# ARCHITECTURE.md

## Preferred flow

```text
UI
→ feature hook or controller
→ service or repository interface
→ mock adapter now
→ Supabase adapter later
```

The UI must not directly depend on Supabase-specific code.

## Recommended feature structure

```text
features/
  vehicles/
    components/
    hooks/
    services/
    repositories/
    schemas/
    types/
    tests/
```

## Responsibilities

### UI

- Renders data.
- Handles user interaction.
- Shows loading, empty, success, and error states.

### Feature logic

- Coordinates forms, state, permissions, and services.

### Domain

- Contains business rules and shared types.

### Data layer

- Contains repository interfaces.
- Uses mock adapters now.
- Uses Supabase adapters after approval.

## Architecture update rule

Update this file only when folder structure, data flow, state management, shared abstractions, or integration boundaries change.
