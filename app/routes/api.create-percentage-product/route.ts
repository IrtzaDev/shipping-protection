import { ActionFunctionArgs, json } from "@remix-run/node";
import prisma from "~/db.server";
import { authenticate } from "~/shopify.server";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.json();
  console.log(formData, "formDataformData");
  const cartValue = formData.cartValue;
  const minPrice = formData.minPrice;
  const maxPrice = formData.maxPrice;

  const { admin } = await authenticate.admin(request);

  const title = "Percentage Product";
  const selectedItems = {
    cartValue,
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
        query: `title:'Fixed Amount Product'`,
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
        name: "Fixed Amount Product",
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
    },
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
                namespace: "percentage-product",
                key: "percentage",
                type: "json",
                value: JSON.stringify(selectedItems),
              },
            ],
          },
        },
      },
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
            productType: "percentage-product",
            status: "ACTIVE",
            publishedAt: new Date().toISOString(),
            metafields: [
              {
                namespace: "percentage-product",
                key: "percentage",
                type: "json",
                value: JSON.stringify(selectedItems),
              },
            ],
          },
        },
      },
    );

    response = await createResponse.json();
    productId = response?.data?.productCreate?.product?.id;
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
      500,
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

  console.log(productId, "productIdproductId");

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
  console.log(JSON.stringify(productOptionsJson, null, 2), "productOptionsJson");
  const colorOption = productOptionsJson?.data?.product?.options?.find((opt: any) => opt.name === "Title");
  const optionId = colorOption?.id;
  console.log(optionId, "optionIdoptionId");
  if (!optionId) {
    return json({
      success: false,
      error: "Could not find 'Color' option for product",
    }, 500);
  }

  // --- DELETE EXISTING VARIANTS BEFORE CREATING NEW ONES ---
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
console.log(productId,variantIds, 'variantIdsvariantIds')
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
      },
    );
    const bulkDeleteJson = await bulkDeleteResponse.json();
    const deleteErrors = bulkDeleteJson?.data?.productVariantsBulkDelete?.userErrors;
    if (deleteErrors && deleteErrors.length > 0) {
      console.warn("Failed to bulk delete variants:", deleteErrors);
    }
  }
  // --- END DELETE VARIANTS ---

  const min = Number(minPrice);
  const max = Number(maxPrice);
  const variants = [];
  if(min && max) {
    for (let i = min; i <= max; i++) {
      variants.push({
        optionValues: [
          { name: i.toString(), optionId },
        ],
      });
    }
  }
  console.log(variants, "variantsvariants");

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
  console.log(variantErrors, "variantErrorsvariantErrors");
  if (variantErrors && variantErrors.length > 0) {
    return json({
      success: false,
      error: "Variant creation failed",
      userErrors: variantErrors,
    }, 500);
  }
  // --- VARIANT CREATION LOGIC END ---

  return json({ success: true, productId });
}
