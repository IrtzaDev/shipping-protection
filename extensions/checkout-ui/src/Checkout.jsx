import {
  reactExtension,
  Banner,
  BlockStack,
  Checkbox,
  Text,
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
  const { extension, lines } = useApi();
  const instructions = useInstructions();
  const applyCartLinesChange = useApplyCartLinesChange();
  const [removedProtectionProduct, setRemovedProtectionProduct] = useState(null);
  
  console.log(lines, "lineslineslineslineslineslines");
  const hasProtectionProduct = lines?.current?.some(
    (line) => line.merchandise?.product?.productType === 'fixed-product' || line.merchandise?.product?.productType === 'percentage-product'
  );

  if (!instructions.attributes.canUpdateAttributes) {
    return (
      <Banner title="checkout-ui" status="warning">
        {translate("attributeChangesAreNotSupported")}
      </Banner>
    );
  }

  if(!hasProtectionProduct) {
    return null;
  }

  return (
    <BlockStack border={"dotted"} padding={"tight"}>
      <Checkbox onChange={onCheckboxChange} checked={!hasProtectionProduct}>
        {hasProtectionProduct ? "Remove Protection" : "Add Protection"}
      </Checkbox>
    </BlockStack>
  );

  async function onCheckboxChange(isChecked) {
    try {
      if (isChecked) {
        const lineToRemove = lines?.current?.find(
          (line) => line.merchandise?.product?.productType === 'fixed-product' || line.merchandise?.product?.productType === 'percentage-product'
        );
        if (lineToRemove) {
          const protectionInfo = {
            variantId: lineToRemove.merchandise?.id,
          };
          setRemovedProtectionProduct(protectionInfo);
          
          const result = await applyCartLinesChange({
            type: 'updateCartLine',
            id: lineToRemove.id,
            quantity: 0,
          });
          console.log(result, 'removeProtectionResult')
        }
      } else {
        // Add protection product back from state
        if (removedProtectionProduct) {
          try {
            console.log('Adding back protection product:', removedProtectionProduct);
            
            const result = await applyCartLinesChange({
              type: 'addCartLine',
              merchandiseId: removedProtectionProduct.variantId,
              quantity: 1,
            });
            console.log(result, 'addProtectionResult')
            
            // Clear the stored protection info after successful addition
            setRemovedProtectionProduct(null);
          } catch (error) {
            console.error('Error adding protection product back:', error);
            // Clear invalid stored data
            setRemovedProtectionProduct(null);
          }
        } else {
          console.log('No stored protection product found');
        }
      }
    } catch (error) {
      console.error('Error with protection product toggle:', error);
    }
  }
}