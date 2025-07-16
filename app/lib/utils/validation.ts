import type { Order } from '~/types/order';
import type { BuilderConfig } from '~/types/builder';
import { ERROR_MESSAGES } from '~/constants/config';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validateOrder(data: Partial<Order>): void {
  if (!data.shopify_order_id) {
    throw new ValidationError(ERROR_MESSAGES.INVALID_ORDER);
  }

  if (!data.customer_name || !data.customer_email) {
    throw new ValidationError('Customer information is required');
  }

  if (!data.build_config) {
    throw new ValidationError(ERROR_MESSAGES.INVALID_BUILDER);
  }

  validateBuilderConfig(data.build_config);
}

export function validateBuilderConfig(config: Partial<BuilderConfig>): void {
  if (!config.mainCategory?.id || !config.subCategory?.id) {
    throw new ValidationError('Category selection is required');
  }

  if (!config.totalPrice || config.totalPrice <= 0) {
    throw new ValidationError('Invalid total price');
  }

  if (!config.depositAmount || config.depositAmount <= 0) {
    throw new ValidationError('Invalid deposit amount');
  }

  if (config.depositAmount > config.totalPrice) {
    throw new ValidationError('Deposit amount cannot exceed total price');
  }
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePhoneNumber(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s-()]{10,}$/;
  return phoneRegex.test(phone);
} 