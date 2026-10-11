/** Nền tảng bộ cài được hỗ trợ. */
export const PLATFORMS = ["windows", "macos"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const PLATFORM_LABEL: Record<Platform, string> = {
  windows: "Windows",
  macos: "macOS",
};

export function isPlatform(v: unknown): v is Platform {
  return v === "windows" || v === "macos";
}

export const SEMVER_RE = /^\d+\.\d+\.\d+$/;

/** So sánh semver "1.2.10" > "1.2.9" (số học từng phần). */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d;
  }
  return 0;
}
