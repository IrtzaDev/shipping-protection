import { ActionFunctionArgs, json } from "@remix-run/node";
import prisma from "~/db.server";
import { authenticate } from "~/shopify.server";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.json();
  const defaultFee = formData.defaultFee;
  const minPrice = formData.minPrice;
  const maxPrice = formData.maxPrice;

  const { admin } = await authenticate.admin(request);

  const title = "Fixed Amount Product";
  const selectedItems = {
    defaultFee,
    minPrice,
    maxPrice,
  };

  const deleteCheckResponse: any = await admin?.graphql(
    `#graphql
    query getPercentageProduct($query: String!) {
      products(first: 1, query: $query) {
        edges {
          node {
            id
            title
          }
        }
      }
    }`,
    {
      variables: {
        query: `title:'Percentage Product'`,
      },
    },
  );

  const deleteCheckJson = await deleteCheckResponse.json();
  const percentageProduct = deleteCheckJson?.data?.products?.edges?.[0]?.node;
  console.log(
    percentageProduct,
    deleteCheckJson,
    "deleteCheckJsondeleteCheckJson",
  );
  if (percentageProduct?.id) {
    const deleteResponse: any = await admin?.graphql(
      `#graphql
      mutation deleteProduct($input: ProductDeleteInput!) {
        productDelete(input: $input) {
          deletedProductId
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: {
          input: {
            id: percentageProduct.id,
          },
        },
      }
    );

    await prisma.products.delete({
      where: {
        name: "Percentage Product",
      },
    });
  
    const deleteJson = await deleteResponse.json();
    const deleteErrors = deleteJson?.data?.productDelete?.userErrors;
  
    if (deleteErrors?.length) {
      console.warn("Failed to delete Percentage Product:", deleteErrors);
    }
  } 

  // 🔍 Step 1: Check if product exists in Shopify
  const searchResponse: any = await admin?.graphql(
    `#graphql
    query getProductByTitle($query: String!) {
      products(first: 1, query: $query) {
        edges {
          node {
            id
            title
          }
        }
      }
    }`,
    {
      variables: {
        query: `title:'${title}'`,
      },
    }
  );

  const searchResult = await searchResponse.json();
  const existingProduct = searchResult?.data?.products?.edges?.[0]?.node;
  let productId = existingProduct?.id;

  let response;

  if (productId) {
    // 🛠 Step 2: Update existing product
    const updateResponse: any = await admin?.graphql(
      `#graphql
      mutation updateProduct($input: ProductInput!) {
        productUpdate(input: $input) {
          product {
            id
            title
            metafields(first: 1) {
              nodes {
                id
                key
                value
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: {
          input: {
            id: productId,
            metafields: [
              {
                namespace: "fixed-product",
                key: "fixed",
                type: "json",
                value: JSON.stringify(selectedItems),
              },
            ],
          },
        },
      }
    );

    response = await updateResponse.json();
  } else {
    // ➕ Step 3: Create product if it doesn’t exist
    const createResponse: any = await admin?.graphql(
      `#graphql
      mutation createProductWithMetafield($input: ProductInput!) {
        productCreate(input: $input) {
          product {
            id
            title
            metafields(first: 1) {
              nodes {
                id
                namespace
                key
                value
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: {
          input: {
            title,
            productType: "fixed-product",
            status: "ACTIVE",
            publishedAt: new Date().toISOString(),
            metafields: [
              {
                namespace: "fixed-product",
                key: "fixed",
                type: "json",
                value: JSON.stringify(selectedItems),
              },
            ],
          },
        },
      }
    );

    response = await createResponse.json();
    productId = response?.data?.productCreate?.product?.id;

    // --- Set inventory to 1 for the new product ---
    if (productId) {
      // 1. Get the default variant's inventoryItemId
      const variantRes = await admin.graphql(
        `#graphql
        query getProductVariantInventoryItem($id: ID!) {
          product(id: $id) {
            variants(first: 1) {
              edges {
                node {
                  id
                  inventoryItem {
                    id
                  }
                }
              }
            }
          }
        }
        `,
        { variables: { id: productId } }
      );
      const variantJson = await variantRes.json();
      const inventoryItemId = variantJson?.data?.product?.variants?.edges?.[0]?.node?.inventoryItem?.id;

      // 2. Get the first locationId
      const locationRes = await admin.graphql(
        `#graphql
        query getLocations {
          locations(first: 1) {
            edges {
              node {
                id
                name
              }
            }
          }
        }
        `
      );
      const locationJson = await locationRes.json();
      const locationId = locationJson?.data?.locations?.edges?.[0]?.node?.id;

      console.log(inventoryItemId, locationId, "inventoryItemId, locationId");
      // 3. Adjust inventory if both IDs are present
      if (inventoryItemId && locationId) {
        const adjustRes = await admin.graphql(
          `#graphql
          mutation inventoryAdjustQuantities($input: InventoryAdjustQuantitiesInput!) {
            inventoryAdjustQuantities(input: $input) {
              userErrors {
                field
                message
              }
              inventoryAdjustmentGroup {
                changes {
                  name
                  delta
                }
              }
            }
          }
          `,
          {
            variables: {
              input: {
                reason: "correction",
                name: "available",
                changes: [
                  {
                    delta: 1,
                    inventoryItemId,
                    locationId,
                  },
                ],
              },
            },
          }
        );
        const adjustJson = await adjustRes.json();
        if (adjustJson?.data?.inventoryAdjustQuantities?.userErrors?.length) {
          console.warn("Failed to set inventory:", adjustJson.data.inventoryAdjustQuantities.userErrors);
        }
      } else {
        console.warn("Could not set inventory: missing inventoryItemId or locationId", { inventoryItemId, locationId });
      }
    }
  }

  const userErrors =
    response?.data?.productUpdate?.userErrors ||
    response?.data?.productCreate?.userErrors;

  if (!productId || (userErrors && userErrors.length > 0)) {
    return json(
      {
        success: false,
        error: "Product operation failed",
        userErrors,
      },
      500
    );
  }

  // 🗃 Step 4: Save or update in local Prisma DB
  await prisma.products.upsert({
    where: {
      name: title,
    },
    update: {
      name: title,
      data: JSON.stringify(selectedItems),
      productId,
    },
    create: {
      name: title,
      data: JSON.stringify(selectedItems),
      productId,
    },
  });

  return json({ success: true, productId });
}