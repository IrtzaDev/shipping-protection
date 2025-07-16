import { useFetcher } from "@remix-run/react";
import { Modal, TextField } from "@shopify/polaris";
import { useEffect, useState } from "react";

export default function FixedAmountModal({
  active,
  fixedProductData,
  handleModalChange,
}: {
  active: boolean;
  fixedProductData: any;
  handleModalChange: () => void;
}) {
  const [defaultFee, setDefaultFee] = useState("3");
  const [minPrice, setMinPrice] = useState("0");
  const [maxPrice, setMaxPrice] = useState("0");
  const fetcher: any = useFetcher();

  useEffect(() => {
    const data = JSON.parse(fixedProductData?.data || "{}");
    setDefaultFee(data?.defaultFee || "3");
    setMinPrice(data?.minPrice || "0");
    setMaxPrice(data?.maxPrice || "0");
  }, [fixedProductData]);

  const handleSubmit = () => {
    const formPayload = {
      defaultFee,
      minPrice,
      maxPrice,
    };
    fetcher.submit(formPayload, {
      action: "/api/create-product",
      method: "POST",
      encType: "application/json",
    });
  };

  useEffect(() => {
    if (fetcher.data && fetcher.data.success) {
      handleModalChange();
    }
  }, [fetcher.data]);

  return (
    <>
      <Modal
        open={active}
        onClose={handleModalChange}
        title="Guarantee fee"
        primaryAction={{
          content: "Save Changes",
          onAction: handleSubmit,
          loading: fetcher.state === "submitting",
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: handleModalChange,
          },
        ]}
      >
        <Modal.Section>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            <TextField
              label="Default guarantee fee (static):"
              value={defaultFee}
              onChange={(value) => {
                const numericValue = Number(value);
                if (!isNaN(numericValue)) {
                  if (numericValue < 0) {
                    return;
                  }
                  setDefaultFee(value)
                }
              }}
              autoComplete="off"
              type="number"
            />
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: "12px",
              marginTop: "12px",
            }}
          >
            <TextField
              label="Price range"
              value={minPrice}
              onChange={(value) => {
                const numericValue = Number(value);
                if (!isNaN(numericValue)) {
                  if (numericValue < 0) {
                    return;
                  }
                  setMinPrice(value)
                }
              }}
              autoComplete="off"
              type="number"
            />
            <span style={{ fontSize: "20px", marginBottom: "6px" }}>–</span>
            <TextField
              label=""
              value={maxPrice}
              onChange={(value) => {
                const numericValue = Number(value);
                if (!isNaN(numericValue)) {
                  if (numericValue < 0) {
                    return;
                  }
                  setMaxPrice(value)
                }
              }}
              autoComplete="off"
              type="number"
            />
          </div>
        </Modal.Section>
      </Modal>
    </>
  );
}
