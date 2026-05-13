export const welcomeEmailTemplate = (firstName: string): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to Luxury Boutique</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.10);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a1a1a 0%,#2d2d2d 100%);padding:48px 40px;text-align:center;">
              <p style="margin:0 0 8px 0;font-size:12px;letter-spacing:4px;color:#d4af37;text-transform:uppercase;">Welcome to</p>
              <h1 style="margin:0;font-size:32px;font-weight:700;color:#ffffff;letter-spacing:2px;">Luxury Boutique</h1>
              <div style="width:60px;height:2px;background:#d4af37;margin:16px auto 0;"></div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:48px 40px;">
              <h2 style="margin:0 0 16px;font-size:22px;color:#1a1a1a;">Hello, ${firstName} 👋</h2>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#555555;">
                Welcome to <strong>Luxury Boutique</strong> — your destination for curated luxury fashion, accessories, and fine jewellery.
              </p>
              <p style="margin:0 0 32px;font-size:16px;line-height:1.7;color:#555555;">
                Your account is now active. Explore our handpicked collection and enjoy free shipping on orders over $500.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                <tr>
                  <td style="background:linear-gradient(135deg,#d4af37 0%,#b8941f 100%);border-radius:6px;padding:14px 32px;">
                    <a href="https://test.chellrach.com/products" style="color:#1a1a1a;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:1px;font-family:Arial,sans-serif;">
                      SHOP THE COLLECTION
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Benefits -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f0f0f0;padding-top:24px;">
                <tr>
                  <td width="33%" style="text-align:center;padding:16px 8px;">
                    <p style="margin:0 0 4px;font-size:22px;">🚚</p>
                    <p style="margin:0;font-size:13px;color:#888;line-height:1.4;">Free Shipping<br/>over $500</p>
                  </td>
                  <td width="33%" style="text-align:center;padding:16px 8px;border-left:1px solid #f0f0f0;border-right:1px solid #f0f0f0;">
                    <p style="margin:0 0 4px;font-size:22px;">↩️</p>
                    <p style="margin:0;font-size:13px;color:#888;line-height:1.4;">30-Day<br/>Returns</p>
                  </td>
                  <td width="33%" style="text-align:center;padding:16px 8px;">
                    <p style="margin:0 0 4px;font-size:22px;">🔒</p>
                    <p style="margin:0;font-size:13px;color:#888;line-height:1.4;">Secure<br/>Payments</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#1a1a1a;padding:24px 40px;text-align:center;">
              <p style="margin:0 0 8px;font-size:12px;color:#d4af37;letter-spacing:2px;text-transform:uppercase;">Luxury Boutique</p>
              <p style="margin:0;font-size:11px;color:#888888;">
                You received this because you created an account with us.<br/>
                <a href="https://test.chellrach.com" style="color:#d4af37;text-decoration:none;">Visit our store</a>
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
