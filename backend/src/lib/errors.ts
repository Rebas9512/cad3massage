export const apiError = (code: string, message: string, details?: unknown) => ({
  error: { code, message, ...(details === undefined ? {} : { details }) },
});

/** Extract a Postgres SQLSTATE from a thrown (possibly drizzle-wrapped) error. */
export function pgCode(e: unknown): string | null {
  const any = e as { code?: string; cause?: { code?: string } } | null;
  return any?.code ?? any?.cause?.code ?? null;
}

export const PG = {
  UNIQUE_VIOLATION: '23505',
  EXCLUSION_VIOLATION: '23P01',
} as const;
