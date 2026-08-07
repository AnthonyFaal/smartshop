type MonitoringContext = Record<string, unknown>;

export function reportError(error: unknown, context: MonitoringContext = {}) {
  const normalized = error instanceof Error ? error : new Error(String(error));
  const event = {
    service: "smartshop",
    environment: process.env.NODE_ENV ?? "unknown",
    timestamp: new Date().toISOString(),
    message: normalized.message,
    stack: normalized.stack,
    context,
  };
  console.error("[monitoring]", JSON.stringify(event));
  const endpoint = process.env.ERROR_REPORTING_WEBHOOK_URL;
  if (!endpoint || typeof fetch === "undefined") return;
  void fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(event),
  }).catch(() => undefined);
}
