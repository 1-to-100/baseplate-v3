import fs from "node:fs/promises";
import path from "node:path";

const REPO_ROOT = process.cwd();

const MANIFEST_PATH = path.join(REPO_ROOT, "src/app/feature-migrations.json");
const FEATURE_REGISTRY_PATH = path.join(REPO_ROOT, "src/app/feature-registry.json");
const MIGRATIONS_DIR = path.join(REPO_ROOT, "supabase/migrations");
const LOCKFILE_PATH = path.join(MIGRATIONS_DIR, ".feature-migrations-lock.json");

function isFeatureMigrationFile(name) {
  // Feature migrations are numbered like: 0001_create.sql, 0002_rls.sql, ...
  // This avoids pulling in README.md or other non-migration SQL files in lib/sql.
  return /^\d{4}_.+\.sql$/i.test(name);
}

function toposort(features) {
  const bySlug = new Map(features.map((f) => [f.slug, f]));

  /** @type {Map<string, Set<string>>} */
  const incoming = new Map();
  /** @type {Map<string, Set<string>>} */
  const outgoing = new Map();

  for (const f of features) {
    incoming.set(f.slug, new Set());
    outgoing.set(f.slug, new Set());
  }

  for (const f of features) {
    for (const dep of f.dependsOn ?? []) {
      if (!bySlug.has(dep)) {
        throw new Error(`Unknown dependency '${dep}' referenced by feature '${f.slug}'`);
      }
      incoming.get(f.slug).add(dep);
      outgoing.get(dep).add(f.slug);
    }
  }

  const queue = [];
  for (const [slug, deps] of incoming.entries()) {
    if (deps.size === 0) queue.push(slug);
  }
  queue.sort();

  const ordered = [];
  while (queue.length) {
    const slug = queue.shift();
    ordered.push(slug);
    for (const child of outgoing.get(slug)) {
      incoming.get(child).delete(slug);
      if (incoming.get(child).size === 0) {
        queue.push(child);
        queue.sort();
      }
    }
  }

  const hasCycle = [...incoming.values()].some((deps) => deps.size > 0);
  if (hasCycle) {
    const remaining = [...incoming.entries()]
      .filter(([, deps]) => deps.size > 0)
      .map(([slug, deps]) => `${slug} -> [${[...deps].join(", ")}]`)
      .join("\n");
    throw new Error(`Dependency cycle detected in feature manifest:\n${remaining}`);
  }

  return ordered.map((slug) => bySlug.get(slug));
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function fileExists(p) {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

function normalizePathFromRegistry(registryPath) {
  // feature-registry.json stores feature "path" as a URL-ish path starting with "/".
  // Example: "/(scalekit)/content-forge/(sub-features)/import"
  if (typeof registryPath !== "string") return null;
  const trimmed = registryPath.trim();
  if (!trimmed.startsWith("/")) return null;
  // We only support "app feature roots" under /src/app/(features) or /src/app/(scalekit)
  if (!(trimmed.startsWith("/(features)/") || trimmed.startsWith("/(scalekit)/"))) return null;
  return trimmed.replace(/\/+$/, ""); // remove trailing slash(es)
}

function inferGroupFromRegistryPath(registryPath) {
  if (registryPath.startsWith("/(scalekit)/")) return "scalekit";
  if (registryPath.startsWith("/(features)/")) return "features";
  return "unknown";
}

async function deriveFeaturesFromRegistry() {
  if (!(await fileExists(FEATURE_REGISTRY_PATH))) return [];
  const registry = await readJson(FEATURE_REGISTRY_PATH);
  const entries = Array.isArray(registry?.features) ? registry.features : [];

  /** @type {Array<{ slug: string, group: string, migrationsPath: string, dependsOn: string[] }>} */
  const derived = [];

  for (const f of entries) {
    // Only auto-wire enabled features. (Explicit feature-migrations.json entries can still include disabled ones.)
    if (!f?.enabled) continue;
    if (!f?.slug || typeof f.slug !== "string") continue;

    const normalized = normalizePathFromRegistry(f.path);
    if (!normalized) continue;

    const migrationsPath = path.join("src", "app", normalized.slice(1), "lib", "sql");
    const migrationsAbs = path.join(REPO_ROOT, migrationsPath);
    if (!(await fileExists(migrationsAbs))) continue;

    // Only include if it contains at least one migration file (0001_*.sql, 0002_*.sql, ...)
    const names = await fs.readdir(migrationsAbs);
    const hasMigrations = names.some(isFeatureMigrationFile);
    if (!hasMigrations) continue;

    derived.push({
      slug: f.slug,
      group: inferGroupFromRegistryPath(normalized),
      migrationsPath,
      dependsOn: Array.isArray(f.dependencies) ? f.dependencies : [],
    });
  }

  return derived;
}

function parseLeadingNumber(filename) {
  // Supabase migrations are commonly named:
  // - 20251117200646_add_foo.sql
  // - 20260101000000__feature__0001_create.sql
  const m = filename.match(/^(\d{14})(?:__|_)/);
  if (!m) return null;
  return Number(m[1]);
}

async function getMaxExistingPrefix() {
  const entries = await fs.readdir(MIGRATIONS_DIR);
  let max = 0;
  for (const name of entries) {
    const n = parseLeadingNumber(name);
    if (typeof n === "number" && Number.isFinite(n)) max = Math.max(max, n);
  }
  return max;
}

async function getMaxBaseMigrationPrefix() {
  // “Base/global” migrations typically look like:
  // 20251117200646_add_user_self_registration_policy.sql
  // i.e. `YYYYMMDDHHmmss_...` (single underscore). Feature symlinks use `__`.
  const entries = await fs.readdir(MIGRATIONS_DIR);
  let max = 0;
  for (const name of entries) {
    const m = name.match(/^(\d{14})_/);
    if (!m) continue;
    const n = Number(m[1]);
    if (Number.isFinite(n)) max = Math.max(max, n);
  }
  return max;
}

function utcNowPrefix() {
  const d = new Date();
  const YYYY = String(d.getUTCFullYear()).padStart(4, "0");
  const MM = String(d.getUTCMonth() + 1).padStart(2, "0");
  const DD = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  const ss = String(d.getUTCSeconds()).padStart(2, "0");
  return Number(`${YYYY}${MM}${DD}${hh}${mm}${ss}`);
}

function computeInitialPrefix(existingMaxPrefix) {
  const now = utcNowPrefix();
  if (existingMaxPrefix && Number.isFinite(existingMaxPrefix) && existingMaxPrefix > 0) {
    return Math.max(now, existingMaxPrefix + 1);
  }
  return now;
}

async function loadLockfile() {
  if (!(await fileExists(LOCKFILE_PATH))) {
    return { version: 1, mappings: {}, lastAssignedPrefix: 0 };
  }
  const data = await readJson(LOCKFILE_PATH);
  return {
    version: data.version ?? 1,
    mappings: data.mappings ?? {},
    lastAssignedPrefix: data.lastAssignedPrefix ?? 0,
  };
}

async function saveLockfile(lock) {
  const json = JSON.stringify(lock, null, 2) + "\n";
  await fs.writeFile(LOCKFILE_PATH, json, "utf8");
}

function ensureFeatureShape(f) {
  if (!f || typeof f !== "object") throw new Error("Invalid feature entry (not an object)");
  if (!f.slug || typeof f.slug !== "string") throw new Error("Invalid feature entry: missing slug");
  if (!f.migrationsPath || typeof f.migrationsPath !== "string") {
    throw new Error(`Invalid feature '${f.slug}': missing migrationsPath`);
  }
  if (f.dependsOn && !Array.isArray(f.dependsOn)) {
    throw new Error(`Invalid feature '${f.slug}': dependsOn must be an array`);
  }
}

function formatPrefix(n) {
  return String(n).padStart(14, "0");
}

async function ensureSymlink(linkPath, targetRelative) {
  try {
    const stat = await fs.lstat(linkPath);
    if (!stat.isSymbolicLink()) {
      throw new Error(`Refusing to overwrite non-symlink at ${linkPath}`);
    }
    const existingTarget = await fs.readlink(linkPath);
    if (path.normalize(existingTarget) === path.normalize(targetRelative)) {
      return { changed: false };
    }
    await fs.unlink(linkPath); // wrong target, replace
  } catch (err) {
    if (err && err.code !== "ENOENT") throw err;
  }
  await fs.symlink(targetRelative, linkPath);
  return { changed: true };
}

function extractCreatedTables(sqlText) {
  /** @type {Set<string>} */
  const tables = new Set();

  const patterns = [
    /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+public\.([a-zA-Z0-9_]+)/gi,
    /CREATE\s+TABLE\s+public\.([a-zA-Z0-9_]+)/gi,
  ];

  for (const re of patterns) {
    let m;
    while ((m = re.exec(sqlText)) !== null) {
      tables.add(m[1]);
    }
  }
  return tables;
}

function extractReferencedTables(sqlText) {
  /** @type {Set<string>} */
  const tables = new Set();
  const re = /REFERENCES\s+public\.([a-zA-Z0-9_]+)/gi;
  let m;
  while ((m = re.exec(sqlText)) !== null) {
    tables.add(m[1]);
  }
  return tables;
}

function isCoreOrExternalTable(tableName) {
  // These tables/functions are owned by the core Baseplate schema, not feature SQL.
  const core = new Set([
    "users",
    "customers",
    "customer_users",
    "roles",
    "role_assignments",
    "permissions",
  ]);
  return core.has(tableName);
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has("--dry-run");
  const strict = args.has("--strict");
  const rebuildLock = args.has("--rebuild-lock");

  /** @type {{ features?: any[] } | null} */
  let manifest = null;
  /** @type {any[]} */
  let features = [];

  if (await fileExists(MANIFEST_PATH)) {
    manifest = await readJson(MANIFEST_PATH);
    features = Array.isArray(manifest?.features) ? manifest.features : [];
  }

  // Auto-discover additional feature (and sub-feature) migrations from feature-registry.json.
  // This is especially important now that features can be nested under "(sub-features)/...".
  const derived = await deriveFeaturesFromRegistry();
  if (derived.length) {
    const existing = new Set(features.map((f) => f?.slug).filter(Boolean));
    for (const f of derived) {
      if (!existing.has(f.slug)) features.push(f);
    }
  }

  if (!Array.isArray(features) || features.length === 0) {
    throw new Error(`No features found (checked ${MANIFEST_PATH} and ${FEATURE_REGISTRY_PATH})`);
  }
  for (const f of features) ensureFeatureShape(f);

  const orderedFeatures = toposort(features);
  const dependsOnByFeature = new Map(orderedFeatures.map((f) => [f.slug, new Set(f.dependsOn ?? [])]));

  /** @type {Array<{ id: string, feature: string, name: string, sourceAbs: string, sourceRelRepo: string }>} */
  const allMigrations = [];
  /** @type {Map<string, string[]>} */
  const migrationsByFeature = new Map();

  for (const f of orderedFeatures) {
    const migrationsAbs = path.join(REPO_ROOT, f.migrationsPath);
    const names = await fs.readdir(migrationsAbs);
    const sqlNames = names
      .filter(isFeatureMigrationFile)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    migrationsByFeature.set(
      f.slug,
      sqlNames.map((name) => path.join(migrationsAbs, name))
    );
    for (const name of sqlNames) {
      const sourceAbs = path.join(migrationsAbs, name);
      const sourceRelRepo = path.relative(REPO_ROOT, sourceAbs);
      const id = `${f.slug}:${sourceRelRepo}`;
      allMigrations.push({ id, feature: f.slug, name, sourceAbs, sourceRelRepo });
    }
  }

  // Validation: ensure manifest deps cover cross-feature FK references.
  /** @type {Map<string, string>} */
  const tableOwner = new Map();
  /** @type {string[]} */
  const validationWarnings = [];

  for (const [feature, files] of migrationsByFeature.entries()) {
    for (const fileAbs of files) {
      const sql = await fs.readFile(fileAbs, "utf8");
      const created = extractCreatedTables(sql);
      for (const table of created) {
        if (!tableOwner.has(table)) {
          tableOwner.set(table, feature);
        } else if (tableOwner.get(table) !== feature) {
          validationWarnings.push(
            `Table ownership conflict: public.${table} appears created in both '${tableOwner.get(table)}' and '${feature}'`
          );
        }
      }
    }
  }

  for (const [feature, files] of migrationsByFeature.entries()) {
    const deps = dependsOnByFeature.get(feature) ?? new Set();
    for (const fileAbs of files) {
      const sql = await fs.readFile(fileAbs, "utf8");
      const refs = extractReferencedTables(sql);
      for (const refTable of refs) {
        if (isCoreOrExternalTable(refTable)) continue;
        const owner = tableOwner.get(refTable);
        if (!owner) continue; // unknown/externally owned table
        if (owner === feature) continue;
        if (!deps.has(owner)) {
          validationWarnings.push(
            `Missing dependency: feature '${feature}' references public.${refTable} (owned by '${owner}') but does not dependOn '${owner}'`
          );
        }
      }
    }
  }

  if (validationWarnings.length) {
    console.warn("Feature migration validation warnings:");
    for (const w of validationWarnings) {
      console.warn(`- ${w}`);
    }
    if (strict) {
      throw new Error(`Validation failed with ${validationWarnings.length} warning(s) (run without --strict to only warn).`);
    }
  }

  const lock = await loadLockfile();
  // If the repo has been restructured (migrations moved/renamed), rebuild is safest.
  if (rebuildLock) {
    lock.mappings = {};
    lock.lastAssignedPrefix = 0;
  }

  const existingMax = await getMaxExistingPrefix();
  const startingMax = Math.max(lock.lastAssignedPrefix || 0, existingMax);
  // Allocate prefixes for NEW migrations using "now" (UTC timestamp), like normal Supabase migrations.
  //
  // We still need to guarantee uniqueness/monotonicity across existing migrations:
  // - If "now" is after everything, we start at "now".
  // - If "now" is earlier than the latest existing prefix, we start at (latest + 1).
  //
  // Note: we intentionally do NOT use lastAssignedPrefix as the *source* of timestamps,
  // only as a floor to prevent collisions if the lockfile is ahead of disk state.
  const maxBase = await getMaxBaseMigrationPrefix();
  const floor = Math.max(startingMax, maxBase);
  let nextPrefix = Math.max(utcNowPrefix(), floor + 1);

  // Allocate filenames for new migrations in stable global order.
  for (const m of allMigrations) {
    if (!lock.mappings[m.id]) {
      const prefix = formatPrefix(nextPrefix++);
      const filename = `${prefix}__${m.feature}__${m.name}`;
      lock.mappings[m.id] = { filename, source: m.sourceRelRepo };
      lock.lastAssignedPrefix = Number(prefix);
    }
  }

  // Prune lockfile entries that no longer exist (keeps the lockfile from growing forever)
  const currentIds = new Set(allMigrations.map((m) => m.id));
  for (const key of Object.keys(lock.mappings)) {
    if (!currentIds.has(key)) {
      delete lock.mappings[key];
    }
  }

  if (!dryRun) {
    await fs.mkdir(MIGRATIONS_DIR, { recursive: true });
    await saveLockfile(lock);
  }

  // Build expected symlink set (by filename) for current features/migrations.
  /** @type {Map<string, { targetRelative: string }>} */
  const expectedLinks = new Map();
  for (const m of allMigrations) {
    const entry = lock.mappings[m.id];
    if (!entry?.filename) {
      throw new Error(`Missing lockfile entry for ${m.id}`);
    }
    const linkPath = path.join(MIGRATIONS_DIR, entry.filename);
    const targetRelative = path.relative(MIGRATIONS_DIR, m.sourceAbs);
    expectedLinks.set(path.basename(linkPath), { targetRelative });
  }

  // Remove stale feature migration symlinks for the current known slugs
  const slugs = new Set(orderedFeatures.map((f) => f.slug));
  const existing = await fs.readdir(MIGRATIONS_DIR);
  for (const name of existing) {
    if (!name.includes("__")) continue;
    const match = name.match(/^\d{14}__([^_]+(?:-[^_]+)*)__.+\.sql$/);
    if (!match) continue;
    const slug = match[1];
    if (!slugs.has(slug)) continue;
    const p = path.join(MIGRATIONS_DIR, name);
    try {
      const stat = await fs.lstat(p);
      if (stat.isSymbolicLink()) {
        const shouldKeep = expectedLinks.has(name);
        if (!shouldKeep || rebuildLock) {
          if (dryRun) {
            console.log(`[dry-run] rm ${path.relative(REPO_ROOT, p)}`);
          } else {
            await fs.unlink(p);
          }
        }
      }
    } catch {
      // ignore
    }
  }

  // Create/update symlinks
  let createdOrUpdated = 0;
  let skipped = 0;
  let wouldUpdate = 0;
  let wouldSkip = 0;
  for (const m of allMigrations) {
    const entry = lock.mappings[m.id];
    if (!entry?.filename) {
      throw new Error(`Missing lockfile entry for ${m.id}`);
    }
    const linkPath = path.join(MIGRATIONS_DIR, entry.filename);
    const targetRelative = path.relative(MIGRATIONS_DIR, m.sourceAbs);
    if (dryRun) {
      // In dry-run mode, try to detect whether we'd actually change anything.
      let wouldChange = true;
      try {
        const stat = await fs.lstat(linkPath);
        if (stat.isSymbolicLink()) {
          const existingTarget = await fs.readlink(linkPath);
          if (path.normalize(existingTarget) === path.normalize(targetRelative)) {
            wouldChange = false;
          }
        }
      } catch {
        // does not exist -> would change
      }

      if (wouldChange) {
        wouldUpdate += 1;
        console.log(`[dry-run] ln -s ${targetRelative} ${path.relative(REPO_ROOT, linkPath)}`);
      } else {
        wouldSkip += 1;
      }
    } else {
      const result = await ensureSymlink(linkPath, targetRelative);
      if (result.changed) {
        createdOrUpdated += 1;
        console.log(`Linked ${path.relative(REPO_ROOT, linkPath)} -> ${targetRelative}`);
      } else {
        skipped += 1;
      }
    }
  }

  if (dryRun) {
    console.log(
      `\n[dry-run] Processed ${allMigrations.length} total feature migrations for linking into ${path.relative(REPO_ROOT, MIGRATIONS_DIR)} (would update ${wouldUpdate}, would skip ${wouldSkip}).`
    );
  } else {
    console.log(
      `\nProcessed ${allMigrations.length} total feature migrations for linking into ${path.relative(REPO_ROOT, MIGRATIONS_DIR)} (updated ${createdOrUpdated}, skipped ${skipped})`
    );
  }
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
