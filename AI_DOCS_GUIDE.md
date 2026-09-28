# CarVibe AI Documentation Guide

This is the simple AI-assisted development setup for CarVibe.

## Folder structure

```text
CarVibe/
├── AGENTS.md
├── RULES.md
├── AI_DOCS_GUIDE.md
├── CarVibe_Calling_Commands.txt
├── README.md
├── package.json
└── docs/
    └── ai/
        ├── PROJECT_CONTEXT.md
        ├── ARCHITECTURE.md
        ├── FEATURES.md
        ├── TASKS.md
        ├── WORK_LOG.md
        ├── CHANGELOG.md
        ├── DATABASE_PLAN.md
        ├── SECURITY_COMPLIANCE.md
        ├── RESPONSIVE_PERFORMANCE.md
        ├── RELEASE_OPERATIONS.md
        ├── REPORTING.md
        ├── FINALIZATION_PROTOCOL.md
        ├── DECISIONS.md
        ├── KNOWN_ISSUES.md
        └── HANDOFF.md
```

## Why this version is simpler

The AI reads only the core project files during normal coding.

Security, database, responsive, performance, deployment, and reporting documents are read only when relevant.

The AI reads everything only when you send:

```text
FINISH THE PRODUCT
```

## First prompt in a new AI session

```text
Read AGENTS.md and follow the documented CarVibe workflow. Inspect the actual affected code before making changes.
```

Then send your actual task.

## Public repository safety

These documentation files are safe to commit only when they contain no:

- API keys.
- Passwords.
- Tokens.
- Real customer data.
- Identity documents.
- Database dumps.
- Private production URLs.
- Unfixed exploit details.
- Internal incident contacts.

Keep real secrets in environment settings, never in Markdown files.

## Important

Do not replace your existing Next.js `README.md` with this file.

Keep this file as:

```text
AI_DOCS_GUIDE.md
```
