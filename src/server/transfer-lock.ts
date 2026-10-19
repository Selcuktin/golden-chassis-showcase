// Opt-in during account transfer. Apply before redirects, authentication and storage access.
export function transferWriteLock(request: Request, env: unknown): Response | null {
  const enabled = (env as { TRANSFER_WRITE_LOCK?: string } | undefined)?.TRANSFER_WRITE_LOCK;
  if (enabled !== "true" || ["GET", "HEAD", "OPTIONS"].includes(request.method)) return null;
  return Response.json(
    {
      error:
        "Hesap aktarımı nedeniyle kayıt işlemleri geçici olarak kapalı. Lütfen daha sonra tekrar deneyin.",
      code: "TRANSFER_WRITE_LOCK",
    },
    {
      status: 503,
      headers: {
        "Retry-After": "300",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
