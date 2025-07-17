import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { GraphQLClient } from "graphql-request";

const STOREFRONT_API_URL = `https://shipping-production.myshopify.com/api/2025-04/graphql.json`;
const STOREFRONT_ACCESS_TOKEN = 'd9442dfec703e5f22f45652226535931';

const client = new GraphQLClient(STOREFRONT_API_URL, {
  headers: {
    "X-Shopify-Storefront-Access-Token": STOREFRONT_ACCESS_TOKEN,
    "Content-Type": "application/json",
  },
});

export const action = async ({ request }: ActionFunctionArgs) => {
  const prisma = (await import("../db.server")).default;

  const { topic, payload, admin } = await authenticate.webhook(request);

  switch (topic) {
    case "CARTS_UPDATE":
      console.log("hook called");

      // Example: Fetch products
// const query = `
// {
//   products(first: 5) {
//     edges {
//       node {
//         id
//         title
//       }
//     }
//   }
// }
// `;

// const data = await client.request(query);
// console.log(data, 'datadatadatadata');

      const products = await prisma.products.findMany();
      const productId = products?.[0]?.productId;

      if (!productId) {
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
        const response = await admin.graphql(query, {
          variables: { id: productId },
        });

        const json = await response.json();
        console.log(json?.data?.product, "Shopify Product Data");
      } catch (err) {
        console.error("Error fetching product from Shopify GraphQL", err);
      }

      break;

    default:
      break;
  }

  return new Response();
};