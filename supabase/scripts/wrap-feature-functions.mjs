import fs from "node:fs";
import path from "node:path";

function resolveRepoRoot(cwd) {
  // Preferred: run from repo root (pnpm scripts do this)
  if (fs.existsSync(path.join(cwd, "supabase", "config.toml"))) return cwd;
  // Back-compat: if someone runs this from `supabase/`
  const parent = path.join(cwd, "..");
  if (fs.existsSync(path.join(parent, "supabase", "config.toml"))) return parent;
  // Fall back to cwd (better error messages will come from missing dirs later)
  return cwd;
}

const REPO_ROOT = resolveRepoRoot(process.cwd());
const SUPABASE_FUNCTIONS_DIR = path.join(REPO_ROOT, "supabase", "functions");
const SRC_DIR = path.join(REPO_ROOT, "src");
const args = new Set(process.argv.slice(2));
const force = args.has("--force");
const dryRun = args.has("--dry-run");

// globs without deps: walk ../src and find:
// - edge_functions/<fn>/index.ts
// - lib/edge/<fn>/index.ts
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

const candidates = walk(SRC_DIR).filter(isEdgeEntrypoint);

let wouldCreate = 0;
let wouldOverwrite = 0;
let wouldSkip = 0;

for (const implPath of candidates) {
  // function name is the folder name right above index.ts
  const fnName = path.basename(path.dirname(implPath));
  const fnDir = path.join(SUPABASE_FUNCTIONS_DIR, fnName);
  const wrapper = path.join(fnDir, "index.ts");

  // ensure real directory (remove symlink if present)
  if (fs.existsSync(fnDir) && fs.lstatSync(fnDir).isSymbolicLink()) {
    if (dryRun) {
      console.log(`[dry-run] would replace symlink dir for ${fnName}: ${path.relative(REPO_ROOT, fnDir)}`);
    }
    fs.unlinkSync(fnDir);
  }
  if (!dryRun) {
    fs.mkdirSync(fnDir, { recursive: true });
  }

  const relImport = path.relative(fnDir, implPath).replaceAll("\\", "/");
  const importPath = relImport.startsWith("../") ? relImport : "./" + relImport;
  const expected =
    `import "jsr:@supabase/functions-js/edge-runtime.d.ts";\n` + `import "${importPath}";\n`;

  let existing = null;
  if (fs.existsSync(wrapper)) {
    existing = fs.readFileSync(wrapper, "utf8");
  }

  if (!force && existing === expected) {
    wouldSkip += 1;
    console.log(`skipped ${fnName} (already wrapped)`);
    continue;
  }

  if (dryRun) {
    if (existing == null) {
      wouldCreate += 1;
      console.log(`[dry-run] would create ${path.relative(REPO_ROOT, wrapper)} -> ${relImport}`);
    } else {
      wouldOverwrite += 1;
      console.log(`[dry-run] would overwrite ${path.relative(REPO_ROOT, wrapper)} -> ${relImport}`);
    }
    continue;
  }

  fs.mkdirSync(fnDir, { recursive: true });
  fs.writeFileSync(wrapper, expected);
  console.log(`wrapped ${fnName} -> ${relImport}`);
}

if (dryRun) {
  console.log(
    `\n[dry-run] Processed ${candidates.length} edge function(s) (would create ${wouldCreate}, would overwrite ${wouldOverwrite}, would skip ${wouldSkip}).`
  );
}