import {
  reactExtension,
  Banner,
  BlockStack,
  Checkbox,
  Text,
  useApi,
  useApplyAttributeChange,
  useInstructions,
  useTranslate,
  useApplyCartLinesChange,
} from "@shopify/ui-extensions-react/checkout";

// 1. Choose an extension target
export default reactExtension("purchase.checkout.block.render", () => (
  <Extension />
));

function Extension() {
  const translate = useTranslate();
  const { extension, lines } = useApi();
  const instructions = useInstructions();
  const applyAttributeChange = useApplyAttributeChange();
  const applyCartLinesChange = useApplyCartLinesChange();
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

  return (
    <BlockStack border={"dotted"} padding={"tight"}>
      <Checkbox onChange={onCheckboxChange}>
        Remove Protection
      </Checkbox>
    </BlockStack>
  );

  async function onCheckboxChange(isChecked) {
    if (isChecked) {
      // Find the first fixed-product line
      const lineToRemove = lines?.current?.find(
        (line) => line.merchandise?.product?.productType === 'fixed-product' || line.merchandise?.product?.productType === 'percentage-product'
      );
      console.log(lineToRemove.id, 'lineToRemove.id')
      if (lineToRemove) {
        const result = await applyCartLinesChange({
          type: 'updateCartLine',
          id: lineToRemove.id,
          quantity: 0,
        });
        console.log(result, 'resultresultresultresultresult')
        
      }
    }
  }
}