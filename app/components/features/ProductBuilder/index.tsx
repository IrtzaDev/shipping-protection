import { useState } from 'react';
import { Card, BlockStack, Text } from '@shopify/polaris';
import type { MainCategory } from '~/types/builder';

interface ProductBuilderProps {
  builderId: string;
  initialCategories: MainCategory[];
  depositPrice: number;
}

export function ProductBuilder({ builderId, initialCategories, depositPrice }: ProductBuilderProps) {
  const [categories] = useState(initialCategories);

  return (
    <Card>
      <BlockStack gap="400">
        <Text as="h2" variant="headingMd">
          Product Configuration
        </Text>
        <Text as="p" variant="bodyMd">
          Deposit Price: ${depositPrice}
        </Text>

        <BlockStack gap="400">
          {categories.map((category) => (
            <Card key={category.id}>
              <BlockStack gap="200">
                <Text as="h3" variant="headingMd">
                  {category.title}
                </Text>
                <Text as="p" variant="bodyMd">
                  {category.short_detail}
                </Text>
                
                <BlockStack gap="200">
                  {category.sub_categories.map((subCategory) => (
                    <Card key={subCategory.id}>
                      <BlockStack gap="200">
                        <Text as="h4" variant="headingSm">
                          {subCategory.title}
                        </Text>
                        <Text as="p" variant="bodySm">
                          ${subCategory.price}
                        </Text>
                      </BlockStack>
                    </Card>
                  ))}
                </BlockStack>
              </BlockStack>
            </Card>
          ))}
        </BlockStack>
      </BlockStack>
    </Card>
  );
} 