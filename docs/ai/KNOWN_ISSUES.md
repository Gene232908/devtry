# KNOWN_ISSUES.md

Record unresolved bugs, risks, and technical debt.

## ISSUE-001 — Backend not yet approved

**Severity:** Expected limitation  
**Status:** Open

The system does not yet have the final approved Supabase implementation.

Resolution trigger:

```text
FINISH THE PRODUCT
```

## ISSUE-002 - WhatsApp number format too strict

**Severity:** Low  
**Status:** Resolved

**Description:**  
The public valuation form only accepted the exact `+971...` format, so a valid UAE number typed as `971564145781` or `0564145781` was rejected.

**Impact:**  
Some customers could not continue past Step 1 even when they entered a valid UAE mobile number.

**Affected feature:**  
Public valuation form.

**Workaround:**  
Previously, users had to enter the number exactly as `+971...`.

**Planned fix:**  
Allow local UAE mobile and country-code UAE mobile input formats while still rejecting non-UAE mobile numbers.

**Resolved date:**  
2026-07-02

## Issue template

### ISSUE-XXX — Title

**Severity:** Low | Medium | High | Critical  
**Status:** Open | Investigating | Planned | Resolved

**Description:**  
**Impact:**  
**Affected feature:**  
**Workaround:**  
**Planned fix:**  
**Resolved date:**
