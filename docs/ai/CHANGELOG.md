# CHANGELOG.md

Use reverse chronological order.

## Unreleased

### Added

- Generated local JPG assets for premium vehicle/valuation visuals used after the hero.
- Marketplace-style homepage sections for vehicle discovery, brand browsing, featured vehicle previews, body-type browsing, selling experience, trust/statistics, financing preview, reviews, and final CTA.
- Simple AI development documentation setup.
- Client milestone package under `docs/client/`, including a proposal-aligned message, editable milestone plan, HTML, RTF, and PDF.

### Changed

- Refined the post-hero homepage around Milestone 1 sell-side valuation: the vehicle finder became an evaluation showcase, brand browse became accepted-brand badges, vehicle cards became valuation profiles, and body-type cards became passive guidance.
- Updated the public header to a darker glass-style navigation treatment with a valuation-first main action.
- Reduced repeated WhatsApp CTAs across the navbar, vehicle profile cards, financing preview, final CTA, and footer.
- Replaced the basic post-hero homepage flow with a premium black-and-gold automotive marketplace presentation while keeping buy-car, inventory, financing, and reviews as UI/request-based previews until approved.
- Modernized the public landing first impression with a two-tier dealership-style header, lighter main nav, cleaner logo treatment, updated font pairing, and less template-like hero typography.
- Aligned Milestone 1 public landing UI with Sir Nyash's form answers: free valuation messaging, WhatsApp-right header action, Buy a Car Coming Soon, approved How It Works wording, contact-first valuation form, inspection emirate field, and updated public contact/social details.
- Redesigned public How It Works, Contact, and Footer sections to better match the premium black/gold showroom direction.
- Reworked How It Works and Contact again with unique non-photo layouts so they no longer repeat the hero showroom image.

### Fixed

- Removed the floating WhatsApp button from the public layout to avoid narrow-screen content overlap and reduce repeated contact actions.
- Public valuation form now accepts common UAE WhatsApp/mobile formats such as `0564145781`, `971564145781`, and `+971564145781` instead of requiring only the exact `+971...` format.

### Security

- Phone validation remains UAE-mobile-only on the client side; final backend storage must normalize and revalidate before OTP or lead storage.

## Entry template

### YYYY-MM-DD — Title

**Type:** feature | fix | refactor | security | performance | docs | database

**Summary:**  
**Code files:**  
**Documentation updated:**  
**Verification:**  
**Remaining work:**
