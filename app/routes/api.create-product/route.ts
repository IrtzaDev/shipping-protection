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

    // --- Set price for the default variant to defaultFee when updating ---
    // 1. Get the default variant's ID
    const variantRes = await admin.graphql(
      `#graphql
      query getProductVariantInventoryItem($id: ID!) {
        product(id: $id) {
          variants(first: 1) {
            edges {
              node {
                id
              }
            }
          }
        }
      }
      `,
      { variables: { id: productId } }
    );
    const variantJson = await variantRes.json();
    const variantNode = variantJson?.data?.product?.variants?.edges?.[0]?.node;
    const variantId = variantNode?.id;
    if (variantId) {
      const updateVariantRes = await admin.graphql(
        `#graphql
        mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
          productVariantsBulkUpdate(productId: $productId, variants: $variants) {
            productVariants {
              id
              price
            }
            userErrors {
              field
              message
            }
          }
        }
        `,
        {
          variables: {
            productId,
            variants: [
              {
                id: variantId,
                price: defaultFee.toString(),
              },
            ],
          },
        }
      );
      const updateVariantJson = await updateVariantRes.json();
      if (updateVariantJson?.data?.productVariantsBulkUpdate?.userErrors?.length) {
        console.warn("Failed to set variant price (update):", updateVariantJson.data.productVariantsBulkUpdate.userErrors);
      }
    } else {
      console.warn("Could not set price (update): missing variantId");
    }
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

    // --- VARIANT CREATION LOGIC ---
    if (productId) {
      // Get product options to find the Title option
      const productOptionsResponse = await admin.graphql(
        `#graphql
        query getProductOptions($id: ID!) {
          product(id: $id) {
            options {
              id
              name
            }
          }
        }`,
        {
          variables: { id: productId }
        }
      );
      const productOptionsJson = await productOptionsResponse.json();
      const titleOption = productOptionsJson?.data?.product?.options?.find((opt: any) => opt.name === "Title");
      const optionId = titleOption?.id;
      
      if (!optionId) {
        return json({
          success: false,
          error: "Could not find 'Title' option for product",
        }, 500);
      }

      // Delete existing variants before creating new ones
      const existingVariantsResponse = await admin.graphql(
        `#graphql
        query getProductVariants($id: ID!) {
          product(id: $id) {
            variants(first: 100) {
              edges {
                node {
                  id
                }
              }
            }
          }
        }`,
        {
          variables: { id: productId }
        }
      );
      const existingVariantsJson = await existingVariantsResponse.json();
      const existingVariants = existingVariantsJson?.data?.product?.variants?.edges || [];
      const variantIds = existingVariants.map((edge: any) => edge.node.id);

      if (variantIds.length > 0) {
        const bulkDeleteResponse = await admin.graphql(
          `#graphql
          mutation bulkDeleteProductVariants($productId: ID!, $variantsIds: [ID!]!) {
            productVariantsBulkDelete(productId: $productId, variantsIds: $variantsIds) {
              product {
                id
                title
              }
              userErrors {
                field
                message
              }
            }
          }`,
          {
            variables: {
              productId,
              variantsIds: variantIds
            },
          }
        );
        const bulkDeleteJson = await bulkDeleteResponse.json();
        const deleteErrors = bulkDeleteJson?.data?.productVariantsBulkDelete?.userErrors;
        if (deleteErrors && deleteErrors.length > 0) {
          console.warn("Failed to bulk delete variants:", deleteErrors);
        }
      }

      // Create the 'Fixed' variant
      const variants = [{
        optionValues: [
          { name: "Fixed", optionId },
        ],
        price: defaultFee.toString(),
      }];

      const bulkCreateResponse = await admin.graphql(
        `#graphql
        mutation productVariantsBulkCreate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
          productVariantsBulkCreate(productId: $productId, variants: $variants) {
            productVariants {
              id
              title
            }
            userErrors {
              field
              message
            }
          }
        }
        `,
        {
          variables: {
            productId,
            variants: variants,
          },
        }
      );
      const bulkCreateJson = await bulkCreateResponse.json();
      const variantErrors = bulkCreateJson?.data?.productVariantsBulkCreate?.userErrors;
      
      if (variantErrors && variantErrors.length > 0) {
        return json({
          success: false,
          error: "Variant creation failed",
          userErrors: variantErrors,
        }, 500);
      }

      // Set inventory to 1 for the variant
      const allVariantsRes = await admin.graphql(
        `#graphql
        query getAllProductVariantsInventoryItems($id: ID!) {
          product(id: $id) {
            variants(first: 100) {
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
      const allVariantsJson = await allVariantsRes.json();
      const variantEdges = allVariantsJson?.data?.product?.variants?.edges || [];
      const inventoryChanges = variantEdges
        .map((edge: any) => {
          const inventoryItemId = edge.node?.inventoryItem?.id;
          return inventoryItemId ? { inventoryItemId, delta: 1 } : null;
        })
        .filter(Boolean);

      // Get the first locationId
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

      // Adjust inventory for all variants
      if (inventoryChanges.length > 0 && locationId) {
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
                changes: inventoryChanges.map((change: any) => ({
                  delta: 1,
                  inventoryItemId: change.inventoryItemId,
                  locationId,
                })),
              },
            },
          }
        );
        const adjustJson = await adjustRes.json();
        if (adjustJson?.data?.inventoryAdjustQuantities?.userErrors?.length) {
          console.warn("Failed to set inventory for variants:", adjustJson.data.inventoryAdjustQuantities.userErrors);
        }
      } else {
        console.warn("Could not set inventory for variants: missing inventoryItemIds or locationId", { inventoryChanges, locationId });
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