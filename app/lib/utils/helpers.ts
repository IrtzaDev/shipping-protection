import type { BuilderConfig } from '~/types/builder';
import { APP_CONFIG } from '~/constants/config';

export function calculateTotalPrice(config: BuilderConfig): number {
  const { subCategory, selectedOptions } = config;
  const basePrice = subCategory.price;
  const optionsPrice = Object.values(selectedOptions)
    .reduce((sum, option) => sum + (option.price || 0), 0);
  
  return basePrice + optionsPrice;
}

export function calculateDepositAmount(totalPrice: number): number {
  return Math.ceil(totalPrice * (APP_CONFIG.DEPOSIT.DEFAULT_PERCENTAGE / 100));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function generateOrderReference(shopifyOrderId: string): string {
  return `RAD-${shopifyOrderId.split('/').pop()}`;
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function validateBuilderConfig(config: Partial<BuilderConfig>): boolean {
  return !!(
    config.mainCategory?.id &&
    config.subCategory?.id &&
    config.totalPrice &&
    config.depositAmount
  );
}

export function getPaginationParams(page?: string, limit?: string) {
  const parsedPage = Math.max(1, parseInt(page || '1'));
  const parsedLimit = Math.min(
    APP_CONFIG.PAGINATION.MAX_PAGE_SIZE,
    Math.max(1, parseInt(limit || String(APP_CONFIG.PAGINATION.DEFAULT_PAGE_SIZE)))
  );

  return {
    page: parsedPage,
    limit: parsedLimit,
    offset: (parsedPage - 1) * parsedLimit,
  };
} 