export const ROUTES = {
  home: '/',
  login: '/login',
  webhooks: '/webhooks',
  webhookEdit: '/webhooks/$webhookId',
} as const;

export const ROUTE_IDS = {
  protected: '/_protected',
  webhooks: '/_protected/webhooks',
  webhookEdit: '/_protected/webhooks/$webhookId',
} as const;
