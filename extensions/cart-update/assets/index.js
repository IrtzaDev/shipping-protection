class ThemeExtensionBody extends HTMLElement {
  constructor() {
    super();
    console.log("cart-update constructor");

    document.addEventListener('DOMContentLoaded', function () {
      const socket = io('http://localhost:3001');

      socket.on('cart:remove', async (data) => {
        console.log('remove socket called', data)

        const response = await fetch(
          `https://shipping-production.myshopify.com/cart/change.js`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              "id": data?.variantId,
              "quantity": 0
            }),
          },
        );

        if (response.ok) {
          window.location.href = '/cart';
        }

      })

      socket.on('cart:update', async (data) => {
        console.log('socket called', data)

        const formData = {
          items: [
            {
              id: data?.variantId,
              quantity: 1,
            },
          ],
        };

        const response = await fetch(
          `https://shipping-production.myshopify.com/cart/add.js`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
          },
        );

        if (response.ok) {
          window.location.href = '/cart';
        }

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const responseData = await response.json();
          console.log(responseData, "responseData");
        } else {
          const text = await response.text();
          console.error("Non-JSON response:", text);
        }

      });
    });
  }
}

customElements.define("cart-update", ThemeExtensionBody);