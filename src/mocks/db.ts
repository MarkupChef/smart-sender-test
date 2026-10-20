import type { User, Webhook } from '@/api/schemas';

export const CSRF_TOKEN = 'mock-csrf-token-7f3a';
export const USER_PASSWORD = 'password123';
export const user: User = {
  id: 1,
  email: 'admin@smartsender.test',
  first_name: 'Ruslan',
  last_name: 'Rastehaiev',
  name: 'Ruslan Rastehaiev',
};

const WEBHOOK_NAMES = [
  'Order created',
  'Order paid hook',
  'Payment hook',
  'CRM sync',
  'Lead captured',
  'Subscriber added hook',
  'Subscriber removed',
  'Cart abandoned hook',
  'Invoice issued',
  'Refund hook',
  'Telegram bot events',
  'Viber bot hook',
  'Delivery status',
  'Inventory sync hook',
  'Analytics export',
  'Support ticket hook',
  'Newsletter opened',
  'Link clicked hook',
  'Form submitted',
  'Webhook audit log',
  'Slack notifier hook',
  'Shipping update',
  'Coupon redeemed hook',
  'User registered',
  'Password reset hook',
  'Subscription renewed',
  'Billing failed hook',
  'Daily report',
];

function seedWebhooks(): Webhook[] {
  return WEBHOOK_NAMES.map((name, index) => {
    const id = index + 1;
    return {
      id,
      name,
      url: `https://hooks.example.com/${name.toLowerCase().replaceAll(' ', '-')}`,
      active: id % 3 !== 0,
      created_at: new Date(Date.UTC(2026, 0, id, 9, 30)).toISOString(),
    };
  });
}

const DEFAULT_SESSION_TTL_MS = 30_000;

interface MockDb {
  webhooks: Webhook[];
  deviceTokens: Map<string, string>;
  session: { fingerprint: string; expiresAt: number } | undefined;
  sessionTtlMs: number;
  updateShouldFail: boolean;
}

function initialState(): MockDb {
  return {
    webhooks: seedWebhooks(),
    deviceTokens: new Map(),
    session: undefined,
    sessionTtlMs: DEFAULT_SESSION_TTL_MS,
    updateShouldFail: false,
  };
}

export const db: MockDb = initialState();

export function resetDb(): void {
  Object.assign(db, initialState());
}

export function expireSession(): void {
  if (db.session) db.session.expiresAt = Date.now() - 1;
}

export function endSession(): void {
  db.session = undefined;
}

export function failNextUpdate(): void {
  db.updateShouldFail = true;
}
