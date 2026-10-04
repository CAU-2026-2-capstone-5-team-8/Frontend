/** Never derive covers from titles/ISBNs or accept insecure image endpoints. */
export function safeCoverUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export function catalogLayout(available: number) {
  const columns =
    available >= 980
      ? 5
      : available >= 700
        ? 4
        : available >= 500
          ? 3
          : available >= 240
            ? 2
            : 1;
  const gap = available >= 700 ? 32 : 20;
  return {
    columns,
    gap,
    tileWidth: Math.max(
      1,
      Math.floor((available - gap * (columns - 1)) / columns),
    ),
  };
}
