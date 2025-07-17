import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

import { io } from "socket.io-client";


const socket = io('http://localhost:3001');

export const action = async ({ request }: ActionFunctionArgs) => {
  const prisma = (await import("../db.server")).default;

  const { topic, payload, admin } = await authenticate.webhook(request);
console.log(payload, 'payloadpayloadpayloadpayload');  
  switch (topic) {
    case "CARTS_CREATE":
    case "CARTS_UPDATE":
      console.log("hook called");
      const products = await prisma.products.findMany();
      const product = products?.[0];

      if (!product?.productId) {
        console.error("No productId found in DB.");
        break;
      }

      const query = `
        query GetProduct($id: ID!) {
          product(id: $id) {
            id
            title
            descriptionHtml
            variants(first: 5) {
              edges {
                node {
                  id
                  title
                  price
                }
              }
            }
          }
        }
      `;

      try {
        if (!admin) {
          console.error("Admin client is undefined. Cannot fetch product from Admin API.");
          break;
        }
        // 1. Fetch product from Admin API
        const response = await admin.graphql(query, {
          variables: { id: product?.productId },
        });
        const json = await response.json();
        const variantId = json?.data?.product?.variants?.edges?.[0]?.node?.id?.split('/').pop();;
        // const variantId = "gid://shopify/ProductVariant/55642115375473".split('/').pop();
        console.log(JSON.stringify(json?.data?.product?.variants?.edges), "Shopify Product Data");
        console.log(variantId, "Variant ID to add to cart");

        // Check if variant already exists in cart
        const cartItems = payload?.line_items || [];
        const variantExistsInCart = cartItems.some((item: any) => {
          console.log(item?.id, variantId, "item?.id");
         return item?.id == variantId
        }
        );

        const cartTotal = cartItems.reduce((sum: number, item: any) => sum + (parseFloat(item.price) * Number(item.quantity) || 0), 0);
console.log(cartTotal, 'cartTotal')
        const minPrice = JSON.parse(product?.data)?.minPrice;
        const maxPrice = JSON.parse(product?.data)?.maxPrice;
        const isWithinRange = cartTotal >= minPrice && cartTotal <= maxPrice;
console.log(isWithinRange, 'isWithinRangeisWithinRange')
        
        if (cartItems.length > 0 && !variantExistsInCart && isWithinRange) {
          console.log("Variant not found in cart, emitting socket event");
          socket.emit("cart:update", {variantId});
        } else if (cartItems.length > 0 && variantExistsInCart && !isWithinRange) {
          console.log("Variant exists in cart but outside price range, removing from cart");
          socket.emit("cart:remove", {variantId});
        } else {
          console.log("Variant already exists in cart, skipping socket emit");
        }
      } catch (err) {
        console.error("Error fetching product from Shopify GraphQL or adding to cart", err);
      }

      break;

    default:
      break;
  }

  return new Response();
};