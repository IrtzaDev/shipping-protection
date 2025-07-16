import { redirect } from '@remix-run/node';
import { Authenticator } from '@shopify/shopify-app-remix/server';
import shopifyApp  from '~/shopify.server';

export async function requireAuthenticatedUser(request: Request) {
  const { admin } = await shopifyApp.authenticate.admin(request);
  
  if (!admin) {
    throw redirect('/auth/login');
  }

  return admin;
}

export async function requireAuthenticatedShop(request: Request) {
  const { session } = await shopifyApp.authenticate.public(request);
  
  if (!session) {
    throw redirect('/auth/login');
  }

  return session;
}

export async function requireAuthenticatedWebhook(request: Request) {
  try {
    const { webhook } = await shopifyApp.authenticate.webhook(request);
    return webhook;
  } catch (error) {
    console.error('Webhook authentication failed:', error);
    throw new Response('Unauthorized', { status: 401 });
  }
} 