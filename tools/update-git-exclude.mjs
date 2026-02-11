/**
 * Updates .git/info/exclude with feature artifact patterns.
 *
 * Discovers feature edge functions (from src/app) and feature migration
 * patterns, then writes a managed section in .git/info/exclude so these
 * generated files stay hidden from `git status`.
 *
 * Safe to run repeatedly — only the managed section between the markers
 * is replaced; any user-added entries outside the markers are preserved.
 *
 * Usage:
 *   node supabase/scripts/update-git-exclude.mjs
 */

import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = process.cwd();
const GIT_EXCLUDE_PATH = path.join(REPO_ROOT, ".git", "info", "exclude");
const SRC_DIR = path.join(REPO_ROOT, "src");

const BEGIN_MARKER = "# BEGIN FEATURE ARTIFACTS (auto-generated, do not edit)";
const END_MARKER = "# END FEATURE ARTIFACTS";

// ---------------------------------------------------------------------------
// Discover feature edge functions (same logic as wrap-feature-functions.mjs)
// ---------------------------------------------------------------------------

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const isEdgeEntrypoint = (p) => {
  const endsWithIndex = p.endsWith(`${path.sep}index.ts`);
  const isAppEdgeFn = p.includes(`${path.sep}edge_functions${path.sep}`);
  const isLibEdgeFn = p.includes(`${path.sep}lib${path.sep}edge${path.sep}`);
  return endsWithIndex && (isAppEdgeFn || isLibEdgeFn);
};

function discoverFeatureFunctions() {
  if (!fs.existsSync(SRC_DIR)) return [];
  const candidates = walk(SRC_DIR).filter(isEdgeEntrypoint);
  const names = candidates.map((p) => path.basename(path.dirname(p)));
  return [...new Set(names)].sort();
}

// ---------------------------------------------------------------------------
// Build exclude entries
// ---------------------------------------------------------------------------

function buildManagedSection() {
  const lines = [];

  lines.push(BEGIN_MARKER);
  lines.push("");

  // Feature migration symlinks
  lines.push("# Feature migration symlinks (double-underscore convention)");
  lines.push(
    "supabase/migrations/[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]__*"
  );
  lines.push("");

  // Feature edge function wrappers
  const functions = discoverFeatureFunctions();
  if (functions.length > 0) {
    lines.push("# Feature edge function wrappers");
    for (const fn of functions) {
      lines.push(`supabase/functions/${fn}/`);
    }
  } else {
    lines.push("# No feature edge functions discovered");
  }

  lines.push("");
  lines.push(END_MARKER);

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Update .git/info/exclude
// ---------------------------------------------------------------------------

function updateExcludeFile() {
  if (!fs.existsSync(GIT_EXCLUDE_PATH)) {
    console.error(
      "No .git/info/exclude found — is this a git repository?"
    );
    process.exit(1);
  }

  const content = fs.readFileSync(GIT_EXCLUDE_PATH, "utf8");
  const managed = buildManagedSection();

  const beginIdx = content.indexOf(BEGIN_MARKER);
  const endIdx = content.indexOf(END_MARKER);

  let updated;
  if (beginIdx !== -1 && endIdx !== -1) {
    // Replace existing managed section
    const before = content.slice(0, beginIdx);
    const after = content.slice(endIdx + END_MARKER.length);
    updated = before + managed + after;
  } else {
    // Append managed section
    const separator = content.endsWith("\n") ? "\n" : "\n\n";
    updated = content + separator + managed + "\n";
  }

  fs.writeFileSync(GIT_EXCLUDE_PATH, updated, "utf8");

  const functions = discoverFeatureFunctions();
  console.log(
    `Updated .git/info/exclude (${functions.length} feature function(s), migration pattern)`
  );
  for (const fn of functions) {
    console.log(`  - supabase/functions/${fn}/`);
  }
}

updateExcludeFile();
