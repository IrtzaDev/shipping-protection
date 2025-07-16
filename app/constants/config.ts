export const APP_CONFIG = {
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
  },
  DEPOSIT: {
    MIN_PERCENTAGE: 10,
    DEFAULT_PERCENTAGE: 20,
  },
  QUICKBOOKS: {
    WEBHOOK_EVENTS: {
      PAYMENT_RECEIVED: 'Payment.Create',
      INVOICE_PAID: 'Invoice.Paid',
    },
  },
  SHOPIFY: {
    WEBHOOK_EVENTS: {
      ORDER_CREATED: 'orders/create',
      ORDER_CANCELLED: 'orders/cancelled',
      ORDER_FULFILLED: 'orders/fulfilled',
    },
  },
} as const;

export const API_ROUTES = {
  ORDERS: '/api/v1/orders',
  BUILDERS: '/api/v1/builders',
  WEBHOOKS: {
    QUICKBOOKS: '/webhooks/quickbooks',
    SHOPIFY: '/webhooks/shopify',
  },
} as const;

export const ERROR_MESSAGES = {
  INVALID_BUILDER: 'Invalid builder configuration',
  INVALID_ORDER: 'Invalid order data',
  PAYMENT_FAILED: 'Payment processing failed',
  UNAUTHORIZED: 'Unauthorized access',
  NOT_FOUND: 'Resource not found',
  SERVER_ERROR: 'Internal server error',
} as const; 