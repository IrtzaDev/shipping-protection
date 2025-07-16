import { useFetcher } from "@remix-run/react";
import { Modal, TextField } from "@shopify/polaris";
import { useEffect, useState } from "react";

export default function PercentageAmountModal({
  active,
  percentageProductData,
  handleModalChange,
}: {
  active: boolean;
  percentageProductData: any;
  handleModalChange: () => void;
}) {
  const [defaultFee, setDefaultFee] = useState("3");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const fetcher: any = useFetcher();

  useEffect(() => {
    const data = JSON.parse(percentageProductData?.data || "{}");
    setDefaultFee(data?.cartValue || "3");
    setMinPrice(data?.minPrice || "");
    setMaxPrice(data?.maxPrice || "");
  }, [percentageProductData]);

  const handleSubmit = () => {
    if (Number(minPrice) > Number(maxPrice)) {
      shopify.toast.show("Minimum should not be greater than Maximum", {
        isError: true,
      });
      return;
    }
    const formPayload = {
      cartValue: defaultFee,
      minPrice,
      maxPrice,
    };
    fetcher.submit(formPayload, {
      action: "/api/create-percentage-product",
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
              label="% Of Cart Value"
              value={defaultFee}
              onChange={(value) => {
                const numericValue = Number(value);
                if (!isNaN(numericValue)) {
                  if (numericValue > 100 || numericValue < 0) {
                    return;
                  }
                  setDefaultFee(value);
                }
              }}
              autoComplete="off"
              type="number"
              min={0}
            />
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              margin: "12px 0",
            }}
          >
            <div style={{ width: "50%" }}>
              <TextField
                label="Minimum"
                value={minPrice}
                onChange={(value) => {
                  const numericValue = Number(value);
                  if (!isNaN(numericValue)) {
                    if (numericValue < 0) {
                      return;
                    }
                    setMinPrice(value);
                  }
                }}
                autoComplete="off"
                type="number"
              />
            </div>
            <div style={{ width: "50%" }}>
              <TextField
                label="Maximum"
                value={maxPrice}
                onChange={(value) => {
                  const numericValue = Number(value);
                  if (!isNaN(numericValue)) {
                    if (numericValue < 0) {
                      return;
                    }
                    setMaxPrice(value);
                  }
                }}
                autoComplete="off"
                type="number"
              />
            </div>
          </div>
        </Modal.Section>
      </Modal>
    </>
  );
}
