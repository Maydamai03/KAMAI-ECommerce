export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

export const isUniqueViolation = (e: unknown): boolean =>
  (e as { code?: string } | null)?.code === "P2002";