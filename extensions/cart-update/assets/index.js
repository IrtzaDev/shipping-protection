class ThemeExtensionBody extends HTMLElement {
  constructor() {
    super();
    console.log("cart-update constructor");

    document.addEventListener('DOMContentLoaded', function () {
      const socket = io('http://localhost:3001');

      // Track pending removals by cartId
      const pendingRemovals = {};

      socket.on('cart:remove', async (data) => {
        const cartId = data.cartId;
        if (cartId) {
          // Percentage-based product logic (with confirmation)
          if (!pendingRemovals[cartId]) {
            pendingRemovals[cartId] = { total: 0, completed: 0 };
          }
          pendingRemovals[cartId].total += 1;
        }

        console.log('remove socket called', data)

        const response = await fetch(
          `https://mailboxdealer.com/cart/change.js`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              "id": data?.variantId,
              "quantity": 0
            }),
          },
        );

        if (cartId) {
          // Percentage-based: track completion and emit removalComplete if done
          pendingRemovals[cartId].completed += 1;
          if (pendingRemovals[cartId].completed === pendingRemovals[cartId].total) {
            socket.emit('cart:removalComplete', { cartId });
            delete pendingRemovals[cartId];
          }

          if(data?.isFIxedAmount){
            window.location.href = '/cart';
          }
        } else {
          // Fixed Amount Product: redirect as before
          if (response.ok) {
            window.location.href = '/cart';
          }
        }
      });

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
          `https://mailboxdealer.com/cart/add.js`,
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