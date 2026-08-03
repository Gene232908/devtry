// Verification build that leaves a running dev server alone.
//
// `next dev` and `next build` both write to `.next`. Building while the dev
// server is running strips its compiled CSS and the site renders as unstyled
// HTML until `.next` is deleted and dev restarted. This runs the same build
// against `.next-build` instead (see `distDir` in next.config.mjs).
//
// Written as a script rather than an inline env var in package.json because
// `VAR=value cmd` is shell syntax that does not work on Windows, and this
// project is developed there.

import { spawnSync } from "node:child_process";

const result = spawnSync("next", ["build"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, NEXT_DIST_DIR: ".next-build" },
});

process.exit(result.status ?? 1);
