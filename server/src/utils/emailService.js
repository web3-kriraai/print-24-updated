/**
 * Email Service - Email Sending with Nodemailer
 * Supports both Gmail SMTP and Google SMTP Relay
 */

import nodemailer from 'nodemailer';

/**
 * Create email transporter based on environment configuration
 */
const createTransporter = () => {
  const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.EMAIL_PORT || '587');
  const user = process.env.EMAIL_USER || '';
  const pass = process.env.EMAIL_PASSWORD || '';

  // If using smtp-relay.gmail.com, credentials should be empty
  const isRelayService = host.includes('smtp-relay');

  const config = {
    host,
    port,
    secure: port === 465, // true for 465 (SSL), false for 587 (TLS)
    tls: {
      rejectUnauthorized: false, // Allow self-signed certificates (needed for some networks/firewalls)
    },
  };

  // Only add auth if not using relay service
  if (!isRelayService && user && pass) {
    config.auth = {
      user,
      pass,
    };
  }

  return nodemailer.createTransport(config);
};

const transporter = createTransporter();

/**
 * Send email function
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @returns {Promise<Object>} - Result object
 */
export const sendEmail = async ({ to, subject, html }) => {
  try {
    const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@print24.com';

    const mailOptions = {
      from: fromAddress,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email Service] Email sent to ${to}. Message ID: ${info.messageId}`);

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error('[Email Service] Error sending email:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Send OTP email function
 * @param {string} email - Recipient email
 * @param {string} otp - OTP code
 * @returns {Promise<Object>} - Result object
 */
export const sendOtpEmail = async (email, otp) => {
  try {
    const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@print24.com';

    const mailOptions = {
      from: fromAddress,
      to: email,
      subject: 'Your Print24 Verification Code',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Print24</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Email Verification</h2>
                      <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 0 0 20px 0;">
                        Thank you for signing up with Print24! Please use the verification code below to complete your registration:
                      </p>
                      
                      <!-- OTP Box -->
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 30px 0;">
                        <tr>
                          <td align="center" style="background-color: #f8f9fa; border: 2px dashed #667eea; border-radius: 8px; padding: 20px;">
                            <div style="font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                              ${otp}
                            </div>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="color: #666666; font-size: 14px; line-height: 1.5; margin: 20px 0 0 0;">
                        This verification code will expire in <strong>10 minutes</strong>.
                      </p>
                      <p style="color: #999999; font-size: 13px; line-height: 1.5; margin: 10px 0 0 0;">
                        If you didn't request this code, please ignore this email or contact our support team if you have concerns.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e9ecef;">
                      <p style="color: #999999; font-size: 12px; margin: 0; line-height: 1.5;">
                        © ${new Date().getFullYear()} Print24. All rights reserved.
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
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email Service] OTP email sent to ${email}. Message ID: ${info.messageId}`);

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error('[Email Service] Error sending OTP email:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

export default { sendEmail, sendOtpEmail };
