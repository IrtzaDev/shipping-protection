import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { Page, Layout, Button } from "@shopify/polaris";
import { requireAuthenticatedUser } from "~/services/auth/auth.server";

import { useState } from "react";
import FixedAmountModal from "./component/FixedAmountModal";
import prisma from "~/db.server";
import { useLoaderData } from "@remix-run/react";
import PercentageAmountModal from "./component/PercentageAmountModal";

export async function loader({ request }: LoaderFunctionArgs) {
  await requireAuthenticatedUser(request);

  const fixedProduct = await prisma.products.findMany({
    where: {
      name: "Fixed Amount Product",
    },
  });

  const percentageProduct = await prisma.products.findMany({
    where: {
      name: "Percentage Product",
    },
  });
console.log(percentageProduct, 'percentageProductpercentageProduct')
  return json({
    fixedProductData: fixedProduct?.length ? fixedProduct?.[0] : null,
    percentageProductData: percentageProduct?.length
      ? percentageProduct?.[0]
      : null,
  });
}

export default function Index() {
  const [active, setActive] = useState(false);
  const [percentageActive, setPercentageActive] = useState(false);

  const { fixedProductData, percentageProductData } =
    useLoaderData<typeof loader>();
    const parsedData = JSON.parse(fixedProductData?.data || "{}");
    const parsedPercentageData = JSON.parse(percentageProductData?.data || "{}");

  const handleModalChange = () => setActive(!active);
  const handlePercentageModalChange = () =>
    setPercentageActive(!percentageActive);

  const styles = {
    wrapper: {
      display: "flex",
      flexWrap: "wrap",
      gap: "24px",
      justifyContent: "center",
      marginTop: "32px",
    },
    card: {
      border: "1px solid #d1d5db",
      borderRadius: "16px",
      width: "320px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
      backgroundColor: "white",
      height: "350px",
      transition: "box-shadow 0.2s ease-in-out",
    },
    cardHover: {
      boxShadow: "0 4px 8px rgba(0, 0, 0, 0.08)",
    },
    cardTitle: {
      fontSize: "26px",
      fontWeight: 700,
      marginBottom: "16px",
      display: "flex",
      alignItems: "center",
      gap: "6px",
    },
    infoIcon: {
      display: "inline-block",
      fontSize: "12px",
      color: "#888",
      border: "1px solid #ccc",
      borderRadius: "50%",
      width: "16px",
      height: "16px",
      textAlign: "center",
      lineHeight: "16px",
      cursor: "default",
    },
    cardValue: {
      fontSize: "24px",
      fontWeight: "bold",
      marginBottom: "24px",
    },
    subtext: {
      fontSize: "14px",
      fontWeight: "normal",
      color: "#666",
      marginLeft: "4px",
    },
    cardButton: {
      padding: "10px 16px",
      fontSize: "14px",
      fontWeight: 600,
      color: "#005bd3",
      backgroundColor: "white",
      border: "2px solid #005bd3",
      borderRadius: "8px",
      cursor: "pointer",
      transition: "background-color 0.2s ease-in-out",
    },
    buttonBox: {
      borderTop: "1px solid #d1d5db",
      padding: "24px",
      display: "flex",
      justifyContent: "center",
    },
    cardBox: {
      paddingTop: "44px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      width: "100%",
      gap: "25px",
    },
  };

  return (
    <Page title="Guarantee Fee Type">
      <Layout>
        <Layout.Section>
          <FixedAmountModal
            active={active}
            handleModalChange={handleModalChange}
            fixedProductData={fixedProductData}
          />
          <PercentageAmountModal
            active={percentageActive}
            handleModalChange={handlePercentageModalChange}
            percentageProductData={percentageProductData}
          />

          <div style={styles.wrapper as {}}>
            <div style={styles.card as {}}>
              <div style={styles.cardBox as {}}>
                <div style={styles.cardTitle as {}}>
                  Fixed
                </div>
                <div style={styles.cardValue as {}}>
                  ${parsedData?.defaultFee || 3}<span style={styles.subtext as {}}>Default fee</span>
                </div>
              </div>
              <div style={styles.buttonBox as {}}>
                <Button onClick={handleModalChange} fullWidth variant="primary">
                  Create rules & Activate
                </Button>
              </div>
            </div>

            <div style={styles.card as {}}>
              <div style={styles.cardBox as {}}>
                <div style={styles.cardTitle as {}}>
                  Percentage
                </div>
                <div style={styles.cardValue as {}}>
                  {parsedPercentageData?.cartValue || 3}% <span style={styles.subtext as {}}>/Order</span>
                </div>
              </div>
              <div style={styles.buttonBox}>
                <Button
                  onClick={handlePercentageModalChange}
                  fullWidth
                  variant="primary"
                >
                  Activate
                </Button>
              </div>
            </div>
          </div>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
