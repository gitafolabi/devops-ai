interface OrderItem {
  product?: { name?: string; imageUrl?: string };
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  totalAmount: number;
  items: OrderItem[];
  shippingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  status?: string;
  createdAt?: string;
}

const formatPrice = (amount: number): string =>
  `$${(typeof amount === 'string' ? parseFloat(amount) : amount).toFixed(2)}`;

const renderItems = (items: OrderItem[]): string =>
  items.map(item => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;">
        <p style="margin:0;font-size:14px;color:#1a1a1a;font-weight:600;">${item.product?.name || 'Product'}</p>
        <p style="margin:4px 0 0;font-size:12px;color:#888888;">Qty: ${item.quantity}</p>
      </td>
      <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;text-align:right;vertical-align:top;">
        <p style="margin:0;font-size:14px;color:#1a1a1a;">${formatPrice(item.price * item.quantity)}</p>
      </td>
    </tr>
  `).join('');

export const orderConfirmationTemplate = (order: Order): string => {
  const orderRef = order.id ? order.id.slice(-8).toUpperCase() : 'N/A';
  const shipping = order.shippingAddress;
  const shippingCost = order.totalAmount > 500 ? 0 : 15;
  const estimatedDelivery = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Order Confirmed – #${orderRef}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.10);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a1a1a 0%,#2d2d2d 100%);padding:40px;text-align:center;">
              <p style="margin:0 0 8px;font-size:11px;letter-spacing:4px;color:#d4af37;text-transform:uppercase;">Luxury Boutique</p>
              <div style="width:48px;height:48px;background:#d4af37;border-radius:50%;margin:0 auto 12px;display:flex;align-items:center;justify-content:center;">
                <p style="margin:0;font-size:22px;">✓</p>
              </div>
              <h1 style="margin:0 0 4px;font-size:24px;color:#ffffff;font-weight:700;">Order Confirmed!</h1>
              <p style="margin:0;font-size:14px;color:#aaaaaa;letter-spacing:1px;">Order #${orderRef}</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#555555;">
                Thank you for your order. We're preparing it for dispatch and will send you a shipping notification shortly.
              </p>

              <!-- Estimated Delivery -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf8f0;border:1px solid #e8d88a;border-radius:6px;margin-bottom:32px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 4px;font-size:12px;color:#b8941f;font-weight:700;letter-spacing:1px;text-transform:uppercase;font-family:Arial,sans-serif;">Estimated Delivery</p>
                    <p style="margin:0;font-size:16px;color:#1a1a1a;font-weight:600;">${estimatedDelivery}</p>
                  </td>
                </tr>
              </table>

              <!-- Order Items -->
              <h3 style="margin:0 0 16px;font-size:16px;color:#1a1a1a;border-bottom:2px solid #d4af37;padding-bottom:8px;">Order Summary</h3>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                ${renderItems(order.items || [])}
              </table>

              <!-- Totals -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td style="padding:6px 0;font-size:14px;color:#888;">Subtotal</td>
                  <td style="padding:6px 0;font-size:14px;color:#888;text-align:right;">${formatPrice(order.totalAmount)}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:14px;color:#888;">Shipping</td>
                  <td style="padding:6px 0;font-size:14px;color:#888;text-align:right;">${shippingCost === 0 ? 'FREE' : formatPrice(shippingCost)}</td>
                </tr>
                <tr>
                  <td style="padding:12px 0 0;font-size:16px;color:#1a1a1a;font-weight:700;border-top:1px solid #f0f0f0;">Total</td>
                  <td style="padding:12px 0 0;font-size:18px;color:#d4af37;font-weight:700;text-align:right;border-top:1px solid #f0f0f0;">${formatPrice(order.totalAmount + shippingCost)}</td>
                </tr>
              </table>

              ${shipping ? `
              <!-- Shipping Address -->
              <h3 style="margin:0 0 12px;font-size:16px;color:#1a1a1a;">Shipping To</h3>
              <p style="margin:0;font-size:14px;color:#555555;line-height:1.7;">
                ${shipping.street || ''}<br/>
                ${shipping.city || ''}, ${shipping.state || ''} ${shipping.zipCode || ''}<br/>
                ${shipping.country || ''}
              </p>
              ` : ''}

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin:32px 0 0;">
                <tr>
                  <td style="background:linear-gradient(135deg,#1a1a1a 0%,#2d2d2d 100%);border-radius:6px;padding:14px 32px;">
                    <a href="https://test.chellrach.com/orders" style="color:#d4af37;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:1px;font-family:Arial,sans-serif;">
                      VIEW MY ORDERS
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#1a1a1a;padding:24px 40px;text-align:center;">
              <p style="margin:0 0 8px;font-size:12px;color:#d4af37;letter-spacing:2px;text-transform:uppercase;">Luxury Boutique</p>
              <p style="margin:0;font-size:11px;color:#888;">
                Questions? <a href="mailto:support@luxuryboutique.com" style="color:#d4af37;text-decoration:none;">support@luxuryboutique.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
};
