---
name: Always bump VERSION
description: Bump VERSION in config.js on every single commit, no exceptions
type: feedback
---

Bump `VERSION` in `js/config.js` on every commit. The user explicitly asked for this and it was missed for 5 consecutive commits after v1.1.0. Treat it as a required step like staging files.

**Why:** The user needs to confirm which build they're running from a visible version string. Without bumping, stale-cache bugs are invisible.

**How to apply:** Before every `git commit`, edit config.js to increment the patch version. No exceptions.
