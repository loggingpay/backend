const { BrevoClient } = require("@getbrevo/brevo");

const brevo = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY,
});

const sendVerificationEmail = async (email, token) => {
  const verificationUrl = `${process.env.APP_BASE_URL}/api/v1/verification?token=${encodeURIComponent(token)}`;

  const result = await brevo.transactionalEmails.sendTransacEmail({
    sender: {
      name: process.env.BREVO_SENDER_NAME || "LoggingPay",
      email: process.env.BREVO_SENDER_EMAIL || "contact@loggingpay.com",
    },
    to: [{ email }],
    subject: "Verify your LoggingPay email address",
    htmlContent: `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify your LoggingPay email</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f6f9; padding: 40px 10px;">
        <tr>
          <td align="center">
            <!-- Main Email Container -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); border: 1px solid #e5e7eb;">
              
              <!-- Header Brand Banner -->
              <tr>
                <td style="background-color: #0f172a; padding: 32px 40px; text-align: left;">
                  <span style="color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">LoggingPay</span>
                </td>
              </tr>

              <!-- Body Content -->
              <tr>
                <td style="padding: 40px; text-align: left;">
                  <h1 style="color: #0f172a; font-size: 22px; font-weight: 700; margin: 0 0 16px 0; line-height: 1.3;">
                    Verify your email address
                  </h1>
                  
                  <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
                    Welcome to <strong>LoggingPay</strong>! Thank you for signing up. Please verify your email address to secure your account and activate full access to your developer dashboard.
                  </p>

                  <!-- Call to Action Button -->
                  <table border="0" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                    <tr>
                      <td align="center" style="border-radius: 8px; background-color: #2563eb;">
                        <a href="${verificationUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 8px; font-family: inherit;">
                          Verify Email Address &rarr;
                        </a>
                      </td>
                    </tr>
                  </table>

                  <!-- Fallback Link Section -->
                  <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 0 0 12px 0;">
                    If the button above doesn't work, copy and paste this URL into your web browser:
                  </p>
                  <p style="margin: 0 0 24px 0; word-break: break-all;">
                    <a href="${verificationUrl}" style="color: #2563eb; font-size: 13px; text-decoration: underline;">
                      ${verificationUrl}
                    </a>
                  </p>

                  <!-- Expiration Note Box -->
                  <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 4px; margin-bottom: 24px;">
                    <p style="color: #475569; font-size: 13px; margin: 0; line-height: 1.5;">
                      ⏰ <strong>Note:</strong> This verification link will expire in <strong>24 hours</strong> and can only be used once.
                    </p>
                  </div>

                  <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; margin: 0;">
                    If you didn't create a LoggingPay account, you can safely ignore this email.
                  </p>
                </td>
              </tr>

              <!-- Footer Section -->
              <tr>
                <td style="background-color: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #f1f5f9;">
                  <p style="color: #94a3b8; font-size: 12px; margin: 0 0 8px 0;">
                    &copy; ${new Date().getFullYear()} LoggingPay. All rights reserved.
                  </p>
                  <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                    Automated transactional message. Please do not reply directly to this email.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `,
    textContent: `Welcome to LoggingPay! Please verify your email address by opening the following link in your browser: ${verificationUrl}\n\nThis link will expire in 24 hours. If you did not create an account, please ignore this email.`,
  });
  return result;
};

module.exports = {
  sendVerificationEmail,
};
