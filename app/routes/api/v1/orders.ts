import { json } from '@remix-run/node';
import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { OrderService } from '~/services/orders/order.server';
import { requireAuthenticatedUser } from '~/services/auth/auth.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await requireAuthenticatedUser(request);
  
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const search = url.searchParams.get('search') || '';
  const status = url.searchParams.get('status');

  try {
    const { orders, total } = await OrderService.getOrders({
      page,
      limit,
      search,
      status: status as any,
    });

    return json({
      orders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Failed to fetch orders:', error);
    return json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  await requireAuthenticatedUser(request);

  switch (request.method) {
    case 'POST': {
      try {
        const data = await request.json();
        const order = await OrderService.createOrder(data);
        return json(order, { status: 201 });
      } catch (error) {
        console.error('Failed to create order:', error);
        return json({ error: 'Failed to create order' }, { status: 400 });
      }
    }

    case 'PUT': {
      try {
        const data = await request.json();
        const order = await OrderService.updateOrder(data.id, data);
        return json(order);
      } catch (error) {
        console.error('Failed to update order:', error);
        return json({ error: 'Failed to update order' }, { status: 400 });
      }
    }

    case 'DELETE': {
      try {
        const data = await request.json();
        await OrderService.deleteOrder(data.id);
        return json({ success: true });
      } catch (error) {
        console.error('Failed to delete order:', error);
        return json({ error: 'Failed to delete order' }, { status: 400 });
      }
    }

    default:
      return json({ error: 'Method not allowed' }, { status: 405 });
  }
} 