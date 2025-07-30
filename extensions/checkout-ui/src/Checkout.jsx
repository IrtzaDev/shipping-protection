import {
  reactExtension,
  Banner,
  BlockStack,
  Checkbox,
  useApi,
  useInstructions,
  useTranslate,
  useApplyCartLinesChange,
} from "@shopify/ui-extensions-react/checkout";
import { useEffect, useState } from "react";

// 1. Choose an extension target
export default reactExtension("purchase.checkout.block.render", () => (
  <Extension />
));

function Extension() {
  const translate = useTranslate();
  const { lines, query } = useApi();
  const instructions = useInstructions();
  const applyCartLinesChange = useApplyCartLinesChange();
  const [removedProtectionProduct, setRemovedProtectionProduct] =
    useState(null);

  const fetchProtectionProducts = async () => {
    try {
      const queryString = `
      query GetProtectionProducts {
  products(first: 50, query: "product_type:'fixed-product' OR product_type:'percentage-product'") {
    edges {
      node {
        id
        title
        productType
        metafields(identifiers: [{namespace: "fixed-product", key: "fixed"}, {namespace: "percentage-product", key: "percentage"}]) {
          id
          key
          value
        }
        variants(first: 250) {
          edges {
            node {
              id
              title
              metafields(identifiers: [{namespace: "fixed-product", key: "fixed"}, {namespace: "percentage-product", key: "percentage"}]) {
                id
                key
                value
              }
            }
          }
        }
      }
    }
  }
}
    `;

      const result = await query(queryString);

      if (result.data) {
        const products =
          result.data.products?.edges?.map((edge) => edge.node) || [];
        if (
          products.length > 0 &&
          products?.[0]?.productType === "fixed-product"
        ) {
          let cartTotalWithoutFee = lines?.current
            .filter(
              (item) => item.merchandise?.product?.id != products?.[0]?.id,
            )
            .reduce(
              (sum, item) =>
                sum + (parseFloat(item?.cost?.totalAmount?.amount) || 0),
              0,
            );
          const metafield = products?.[0]?.metafields?.[0]?.value;
          const minPrice = JSON.parse(metafield)?.minPrice;
          const maxPrice = JSON.parse(metafield)?.maxPrice;

          const isWithinRangeWithFee =
            cartTotalWithoutFee >= Number(minPrice) &&
            cartTotalWithoutFee <= Number(maxPrice);
          if (isWithinRangeWithFee) {
            setRemovedProtectionProduct({
              variantId: products?.[0]?.variants?.edges?.[0]?.node?.id,
            });
          }
        }else if(products.length > 0 && products?.[0]?.productType === "percentage-product"){
          let cartTotalWithoutFee = lines?.current
            .filter(
              (item) => item.merchandise?.product?.id != products?.[0]?.id,
            )
            .reduce(
              (sum, item) =>
                sum + (parseFloat(item?.cost?.totalAmount?.amount) || 0),
              0,
            );

            const metafield = products?.[0]?.metafields?.[1]?.value;

            const cartPercent = cartTotalWithoutFee * (JSON.parse(metafield)?.cartValue)/100;
            const roundedCartPercent = Math.round(cartPercent);

            const variants = products?.[0]?.variants?.edges;
            let closestVariant = null;
            let minDiff = Infinity;
            
            for (const variant of variants) {
              const variantTitleNum = parseFloat(variant.node.title);
              const diff = Math.abs(variantTitleNum - roundedCartPercent);
              if (diff < minDiff) {
                minDiff = diff;
                closestVariant = variant;
              }
            }
            setRemovedProtectionProduct({
              variantId: closestVariant?.node?.id,
            });
        }
      } else {
        console.error("Failed to fetch protection products:", result.errors);
      }
    } catch (error) {
      console.error("Error fetching protection products:", error);
    }
  };

  useEffect(() => {
    fetchProtectionProducts();
  }, []);

  const hasProtectionProduct = lines?.current?.some(
    (line) =>
      line.merchandise?.product?.productType === "fixed-product" ||
      line.merchandise?.product?.productType === "percentage-product",
  );

  if (!instructions.attributes.canUpdateAttributes) {
    return (
      <Banner title="checkout-ui" status="warning">
        {translate("attributeChangesAreNotSupported")}
      </Banner>
    );
  }

  if(!hasProtectionProduct && !removedProtectionProduct) {
    return null;
  }

  return (
    <BlockStack border={"dotted"} padding={"tight"}>
      <Checkbox onChange={onCheckboxChange} checked={hasProtectionProduct}>
        Protection Added
      </Checkbox>
    </BlockStack>
  );

  async function onCheckboxChange(isChecked) {
    try {
      if (!isChecked) {
        const lineToRemove = lines?.current?.find(
          (line) =>
            line.merchandise?.product?.productType === "fixed-product" ||
            line.merchandise?.product?.productType === "percentage-product",
        );
        if (lineToRemove) {
          const protectionInfo = {
            variantId: lineToRemove.merchandise?.id,
          };
          setRemovedProtectionProduct(protectionInfo);

          const result = await applyCartLinesChange({
            type: "updateCartLine",
            id: lineToRemove.id,
            quantity: 0,
          });
        }
      } else {
        if (removedProtectionProduct) {
          try {

            const result = await applyCartLinesChange({
              type: "addCartLine",
              merchandiseId: removedProtectionProduct.variantId,
              quantity: 1,
            });
            console.log(result, "addProtectionResult");

            setRemovedProtectionProduct(null);
          } catch (error) {
            console.error("Error adding protection product back:", error);
            setRemovedProtectionProduct(null);
          }
        } else {
          console.log("No stored protection product found");
        }
      }
    } catch (error) {
      console.error("Error with protection product toggle:", error);
    }
  }
}
