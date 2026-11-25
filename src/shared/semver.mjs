// Zero-dependency SemVer 2.0.0 parser & comparator (`src/shared/semver.mjs`).
// Shared across src/engine/updater.mjs, src/engine/tar-safe.mjs, scripts/pack-release.mjs, and tests.

export function parseSemver(raw) {
  if (raw === null || raw === undefined) return null;
  const clean = String(raw).trim().replace(/^v/i, '');
  const m = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/.exec(clean);
  if (!m) return null;
  const prerelease = m[4] ? m[4].split('.') : [];
  if (prerelease.some((id) => id.length === 0)) return null;
  const major = Number(m[1]);
  const minor = Number(m[2]);
  const patch = Number(m[3]);
  return {
    major,
    minor,
    patch,
    prerelease,
    build: m[5] || '',
    version: `${major}.${minor}.${patch}${m[4] ? `-${m[4]}` : ''}`,
  };
}

export function compareSemver(a, b) {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa && !pb) return String(a || '').localeCompare(String(b || ''));
  if (!pa) return -1;
  if (!pb) return 1;
  if (pa.major !== pb.major) return pa.major - pb.major;
  if (pa.minor !== pb.minor) return pa.minor - pb.minor;
  if (pa.patch !== pb.patch) return pa.patch - pb.patch;
  if (pa.prerelease.length === 0 && pb.prerelease.length === 0) return 0;
  if (pa.prerelease.length === 0) return 1;
  if (pb.prerelease.length === 0) return -1;
  const len = Math.max(pa.prerelease.length, pb.prerelease.length);
  for (let i = 0; i < len; i++) {
    const x = pa.prerelease[i];
    const y = pb.prerelease[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const nx = /^\d+$/.test(x) ? Number(x) : null;
    const ny = /^\d+$/.test(y) ? Number(y) : null;
    if (nx !== null && ny !== null) {
      if (nx !== ny) return nx - ny;
    } else if (nx !== null) {
      return -1;
    } else if (ny !== null) {
      return 1;
    } else if (x !== y) {
      return x < y ? -1 : 1;
    }
  }
  return 0;
}

export function isNewerVersion(candidate, current) {
  if (!parseSemver(candidate)) return false;
  if (!current) return true;
  if (!parseSemver(current)) return false;
  return compareSemver(candidate, current) > 0;
}
