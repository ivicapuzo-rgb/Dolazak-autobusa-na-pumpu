// Jednostavno poređenje verzija (semver-lite): "1.2.3" / "v1.2.3".
function parse(v: string): number[] {
  return v
    .trim()
    .replace(/^v/i, "")
    .split(/[.\-+]/)
    .map((n) => parseInt(n, 10))
    .filter((n) => !Number.isNaN(n));
}

// Vraća true ako je `latest` veća verzija od `current`.
export function isNewerVersion(latest: string, current: string): boolean {
  const a = parse(latest);
  const b = parse(current);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x > y) return true;
    if (x < y) return false;
  }
  return false;
}
