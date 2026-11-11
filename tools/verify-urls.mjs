// The URL contract check: no address the site has published may break.
//
//   node tools/verify-urls.mjs                 build, serve it with `wrangler dev`, check
//   node tools/verify-urls.mjs --no-build      check the existing dist/
//   node tools/verify-urls.mjs --base <url>    check a deployed site or preview
//
// For every entry in sites/main/url-contract.json it checks the status, the redirect's target
// (one hop, straight to the final address), and that the trailing-slash form of every address
// also gets there in one hop. Locally it also fails on a built page that ISN'T in the contract,
// so new addresses are only ever added on purpose (pnpm contract adds them).
import { spawn } from "node:child_process";
import { builtPages, CONTRACT, listing, readJson, SITE } from "./lib.mjs";

const args = process.argv.slice(2);
const baseArg = args.includes("--base") ? args[args.indexOf("--base") + 1] : undefined;
const contract = await readJson(CONTRACT);
const PORT = Number(process.env.VERIFY_PORT ?? 8797); // not the dev ports, so it can run beside `pnpm preview`

function run(cmd, cmdArgs) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, cmdArgs, { cwd: SITE, stdio: "inherit" });
    p.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${cmdArgs.join(" ")} exited ${code}`))));
  });
}

async function startWrangler() {
  const p = spawn("pnpm", ["exec", "wrangler", "dev", "--port", String(PORT), "--ip", "127.0.0.1", "--log-level", "warn"], {
    cwd: SITE,
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });
  let log = "";
  p.stdout.on("data", (d) => (log += d));
  p.stderr.on("data", (d) => (log += d));
  const base = `http://127.0.0.1:${PORT}`;
  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 500));
    try {
      await fetch(`${base}/`, { redirect: "manual" });
      return { base, stop: () => process.kill(-p.pid) };
    } catch {}
    if (p.exitCode !== null) break;
  }
  try {
    process.kill(-p.pid);
  } catch {}
  throw new Error(`wrangler dev did not start:\n${log}`);
}

// Location as a path + query, so local and deployed runs compare the same way.
function locationPath(res, base) {
  const loc = res.headers.get("location");
  if (!loc) return null;
  const u = new URL(loc, base);
  return u.pathname + u.search;
}

const failures = [];
const fail = (path, msg) => failures.push(`${path}: ${msg}`);

async function check(base, entry) {
  const res = await fetch(base + entry.path, { redirect: "manual" });
  if (res.status !== entry.expect) {
    await res.body?.cancel();
    fail(entry.path, `expected ${entry.expect}, got ${res.status}${res.headers.get("location") ? ` → ${res.headers.get("location")}` : ""}`);
    return;
  }
  if (entry.expect === 301) {
    const to = locationPath(res, base);
    if (to !== entry.to) fail(entry.path, `redirects to ${to}, expected ${entry.to}`);
  }
  if (entry.expect === 200 && entry.kind === "page") {
    const noindex = /<meta[^>]+name=["']robots["'][^>]+noindex/i.test(await res.text());
    if (entry.noindex && !noindex) fail(entry.path, "must be noindex");
    if (!entry.noindex && noindex) fail(entry.path, "is noindex but must be indexable");
  } else {
    await res.body?.cancel();
  }
  // The trailing-slash form must reach the same place in exactly one hop.
  if (entry.path !== "/" && !entry.path.includes("?") && entry.kind !== "file" && entry.expect !== 410) {
    const slashed = await fetch(`${base + entry.path}/`, { redirect: "manual" });
    await slashed.body?.cancel();
    const want = entry.expect === 301 ? entry.to : entry.path;
    const got = locationPath(slashed, base);
    if (slashed.status !== 301 || got !== want) fail(`${entry.path}/`, `expected 301 → ${want}, got ${slashed.status}${got ? ` → ${got}` : ""}`);
  }
}

// No server needed: every redirect lands on a 200 page of the contract (no chains, nothing
// pointing at a removed page).
const status = new Map(contract.map((e) => [e.path, e.expect]));
for (const e of contract.filter((x) => x.expect === 301)) {
  if (status.get(e.to) !== 200) fail(e.path, `redirect target ${e.to} is not a 200 page in the contract (${status.get(e.to) ?? "missing"})`);
}

let server;
let base = baseArg?.replace(/\/$/, "");
try {
  if (!base) {
    if (!args.includes("--no-build")) await run("pnpm", ["run", "build"]);
    server = await startWrangler();
    base = server.base;
  }
  console.log(`checking ${contract.length} contract entries against ${base}`);
  for (let i = 0; i < contract.length; i += 8) await Promise.all(contract.slice(i, i + 8).map((e) => check(base, e)));
  if (!baseArg) {
    const listed = new Set(contract.map((e) => e.path));
    for (const { path } of await builtPages()) if (!listed.has(path) && !listing(path)) fail(path, "built page is not in url-contract.json (add it on purpose: pnpm contract)");
  }
} finally {
  server?.stop();
}

if (failures.length) {
  console.error(`\n✗ ${failures.length} failure(s):\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`✓ all ${contract.length} contract addresses behave (and their trailing-slash forms)`);
