import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

import { io } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";

const socket = io("http://localhost:3001");

// In-memory map to track pending removals: { [cartId]: { variantId: string, closestVariantId: string } }
const pendingRemovals = new Map();

// Listen for removal complete from client
socket.on("cart:removalComplete", ({ cartId }) => {
  const info = pendingRemovals.get(cartId);
  if (info) {
    console.log(`All removals complete for cart ${cartId}, adding closest variant ${info.closestVariantId}`);
    socket.emit("cart:update", { variantId: info.closestVariantId });
    pendingRemovals.delete(cartId);
  }
});

export const action = async ({ request }: ActionFunctionArgs) => {
  const prisma = (await import("../db.server")).default;

  const { topic, payload, admin } = await authenticate.webhook(request);
  console.log(payload, "payloadpayloadpayloadpayload");
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
            variants(first: 250) {
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
          console.error(
            "Admin client is undefined. Cannot fetch product from Admin API.",
          );
          break;
        }
        // 1. Fetch product from Admin API
        const response = await admin.graphql(query, {
          variables: { id: product?.productId },
        });
        const variantData = await response.json();
        const variantId = variantData?.data?.product?.variants?.edges?.[0]?.node?.id
          ?.split("/")
          .pop();
        // const variantId = "gid://shopify/ProductVariant/55642115375473".split('/').pop();
        console.log(
          JSON.stringify(variantData?.data?.product?.variants?.edges),
          "Shopify Product Data",
        );
        console.log(variantId, "Variant ID to add to cart");

        // Check if variant already exists in cart
        const cartItems = payload?.line_items || [];
        const variantExistsInCart = cartItems.some((item: any) => {
          console.log(item?.id, variantId, "item?.id");
          return item?.id == variantId;
        });

        let cartTotal = cartItems.reduce(
          (sum: number, item: any) =>
            sum + (parseFloat(item.price) * Number(item.quantity) || 0),
          0,
        );

        if (product?.name === "Fixed Amount Product") {
          // Calculate cart total without the fixed amount product
          let cartTotalWithoutFee = cartItems
            .filter((item: any) => item.id != variantId)
            .reduce(
              (sum: number, item: any) =>
                sum + (parseFloat(item.price) * Number(item.quantity) || 0),
              0,
            );
          let defaultFee = JSON.parse(product?.data)?.defaultFee;
          const minPrice = JSON.parse(product?.data)?.minPrice;
          const maxPrice = JSON.parse(product?.data)?.maxPrice;
          defaultFee = Number(defaultFee);

          const isWithinRangeWithFee = cartTotalWithoutFee >= minPrice && cartTotalWithoutFee <= maxPrice;
          if (cartItems.length > 0 && !variantExistsInCart && isWithinRangeWithFee) {
            // Add the product
            console.log("Variant not found in cart, emitting socket event");
            socket.emit("cart:update", { variantId, cartId: payload?.id });
          } else if (
            cartItems.length > 0 &&
            variantExistsInCart &&
            !isWithinRangeWithFee
          ) {
            // Remove the product
            console.log(
              "Variant exists in cart but outside price range, removing from cart",
            );
            socket.emit("cart:remove", { variantId, cartId: payload?.id, isFIxedAmount: true });
          } else {
            // Do nothing (already in cart and in range, or not in cart and not in range)
            console.log("No cart update needed for Fixed Amount Product");
          }
        } else {
          if (cartItems.length === 0) {
            console.log("Cart is empty, skipping percentage product logic and socket events.");
            break;
          }
          const variants = variantData?.data?.product?.variants?.edges || [];
          const allVariantIds = variants.map((edge: any) => edge.node.id?.split("/").pop()?.toString());
          // Subtract price of any percentage product variants already in cart
          const percentageVariantsInCart = cartItems.filter((item: any) => {
            return allVariantIds.includes(item?.id?.toString());
          });
          let cartTotalWithoutPercentageProduct = cartTotal;
          for (const item of percentageVariantsInCart) {
            cartTotalWithoutPercentageProduct -= (parseFloat(item.price) * Number(item.quantity) || 0);
          }
          const cartPercent = cartTotalWithoutPercentageProduct * (JSON.parse(product?.data)?.cartValue)/100;
          const roundedCartPercent = Math.round(cartPercent);
          console.log(`percentage ${roundedCartPercent}`);
          let closestVariant = null;
          let minDiff = Infinity;
          for (const edge of variants) {
            const variant = edge.node;
            const variantTitleNum = parseFloat(variant.title);
            const diff = Math.abs(variantTitleNum - roundedCartPercent);
            if (diff < minDiff) {
              minDiff = diff;
              closestVariant = variant;
            }
          }
          if (closestVariant) {
            const closestVariantId = closestVariant.id?.split("/").pop()?.toString();
            console.log("All variant IDs:", allVariantIds);
            console.log("Cart item IDs:", cartItems.map((i: any) => i.id?.toString()));
            console.log("Closest variant ID:", closestVariantId);
            // Only remove percentage variants that are not the closest one
            const percentageVariantsToRemove = cartItems.filter((item: any) => {
              return allVariantIds.includes(item?.id?.toString()) && item?.id?.toString() != closestVariantId;
            });
            console.log("Variants to remove:", percentageVariantsToRemove.map((i: any) => i.id?.toString()));
            const closestVariantExistsInCart = cartItems.some((item: any) => {
              return item?.id?.toString() == closestVariantId;
            });
            // Generate a unique cartId for this operation (in real app, use actual cart id)
            const cartId = payload?.id || uuidv4();
            if (percentageVariantsToRemove.length > 0) {
              // Remove all other percentage-based variants from cart
              for (const item of percentageVariantsToRemove) {
                console.log(`Removing previous percentage variant from cart: ${item.id}`);
                socket.emit("cart:remove", { variantId: String(item.id), cartId });
              }
              // Store info for later addition
              pendingRemovals.set(cartId, { closestVariantId });
              // Do NOT emit cart:update yet; wait for removalComplete
            } else if (!closestVariantExistsInCart) {
              // No removals needed, just add
              console.log(`match variant for in else ${roundedCartPercent}:`, closestVariant.id, closestVariant.title);
              socket.emit("cart:update", { variantId: closestVariantId });
            } else {
              console.log("Closest variant already exists in cart, skipping socket emit");
            }
          } else {
            console.log('No variants found.');
          }
        }
      } catch (err) {
        console.error(
          "Error fetching product from Shopify GraphQL or adding to cart",
          err,
        );
      }

      break;

    default:
      break;
  }

  return new Response();
};