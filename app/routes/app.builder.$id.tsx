import { json } from '@remix-run/node';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { Page, Layout, Card } from '@shopify/polaris';
import { ProductBuilder } from '~/components/features/ProductBuilder';
import { requireAuthenticatedUser } from '~/services/auth/auth.server';
import { BuilderService } from '~/services/builders/builder.server';

export async function loader({ request, params }: LoaderFunctionArgs) {
  await requireAuthenticatedUser(request);

  try {
    const builder = await BuilderService.getBuilderById(params.id!);
    if (!builder) {
      throw new Response('Builder not found', { status: 404 });
    }

    const categories = await BuilderService.getBuilderCategories(params.id!);
    
    return json({
      builder,
      categories,
    });
  } catch (error) {
    console.error('Failed to load builder:', error);
    throw new Response('Failed to load builder', { status: 500 });
  }
}

export default function BuilderPage() {
  const { builder, categories } = useLoaderData<typeof loader>();

  return (
    <Page
      title={builder.name}
      subtitle="Configure your product options"
      backAction={{ content: 'Builders', url: '/app/builders' }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <ProductBuilder
              builderId={builder.id}
              initialCategories={categories}
              depositPrice={builder.deposit_price}
            />
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
} 