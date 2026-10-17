const webhookIdPattern = /^[1-9]\d*$/;

export function parseWebhookId(raw: string): number | undefined {
  if (!webhookIdPattern.test(raw)) return undefined;
  const id = Number(raw);
  return Number.isSafeInteger(id) ? id : undefined;
}
