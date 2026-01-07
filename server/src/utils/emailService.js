import nodemailer from "nodemailer";

// Create reusable transporter
const createTransporter = () => {
  // Use environment variables for email configuration
  // For Gmail, you can use app-specific password
  // For other services, adjust accordingly
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.EMAIL_PORT || "587"),
    secure: process.env.EMAIL_SECURE === "true", // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD, // App-specific password for Gmail
    },
  });
};

// Send account creation email
export const sendAccountCreationEmail = async (userEmail, userName, tempPassword) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn("Email credentials not configured. Skipping email send.");
      return;
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'Print24'}" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: "Welcome to Print24 - Your Account Has Been Created",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #8B7355; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #8B7355; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .password-box { background-color: #fff; padding: 15px; border: 2px dashed #8B7355; border-radius: 5px; margin: 20px 0; text-align: center; font-size: 18px; font-weight: bold; color: #8B7355; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Print24!</h1>
            </div>
            <div class="content">
              <p>Dear ${userName},</p>
              <p>Your account has been successfully created! We're excited to have you on board.</p>
              <p>Your account details:</p>
              <ul>
                <li><strong>Email:</strong> ${userEmail}</li>
                <li><strong>Temporary Password:</strong></li>
              </ul>
              <div class="password-box">${tempPassword}</div>
              <p><strong>Important:</strong> Please change your password after logging in for security purposes.</p>
              <p>You can now log in to your account and track your orders.</p>
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}/login" class="button">Login to Your Account</a>
              <div class="footer">
                <p>If you have any questions, please don't hesitate to contact us.</p>
                <p>Best regards,<br>The Print24 Team</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Welcome to Print24!
        
        Dear ${userName},
        
        Your account has been successfully created! We're excited to have you on board.
        
        Your account details:
        Email: ${userEmail}
        Temporary Password: ${tempPassword}
        
        Important: Please change your password after logging in for security purposes.
        
        You can now log in to your account and track your orders.
        Login URL: ${process.env.FRONTEND_URL || 'http://localhost:5000'}/login
        
        If you have any questions, please don't hesitate to contact us.
        
        Best regards,
        The Print24 Team
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Account creation email sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending account creation email:", error);
    // Don't throw error - email failure shouldn't block account creation
    return null;
  }
};

// Send order confirmation email
export const sendOrderConfirmationEmail = async (userEmail, userName, orderNumber, orderDetails) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn("Email credentials not configured. Skipping email send.");
      return;
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'Print24'}" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: `Order Confirmation - Order #${orderNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #8B7355; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .order-info { background-color: #fff; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .order-info h3 { color: #8B7355; margin-top: 0; }
            .order-info p { margin: 10px 0; }
            .button { display: inline-block; padding: 12px 24px; background-color: #8B7355; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Order Confirmation</h1>
            </div>
            <div class="content">
              <p>Dear ${userName},</p>
              <p>Thank you for your order! We've received your order and will begin processing it shortly.</p>
              <div class="order-info">
                <h3>Order Details</h3>
                <p><strong>Order Number:</strong> ${orderNumber}</p>
                <p><strong>Product:</strong> ${orderDetails.productName || 'N/A'}</p>
                <p><strong>Quantity:</strong> ${orderDetails.quantity || 'N/A'}</p>
                <p><strong>Total Price:</strong> ₹${orderDetails.totalPrice || '0.00'}</p>
                <p><strong>Status:</strong> ${orderDetails.status || 'Request'}</p>
              </div>
              <p>You can track your order status by logging into your account.</p>
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}/profile" class="button">View My Orders</a>
              <div class="footer">
                <p>If you have any questions about your order, please contact us.</p>
                <p>Best regards,<br>The Print24 Team</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Order Confirmation
        
        Dear ${userName},
        
        Thank you for your order! We've received your order and will begin processing it shortly.
        
        Order Details:
        Order Number: ${orderNumber}
        Product: ${orderDetails.productName || 'N/A'}
        Quantity: ${orderDetails.quantity || 'N/A'}
        Total Price: ₹${orderDetails.totalPrice || '0.00'}
        Status: ${orderDetails.status || 'Request'}
        
        You can track your order status by logging into your account.
        View Orders: ${process.env.FRONTEND_URL || 'http://localhost:5000'}/profile
        
        If you have any questions about your order, please contact us.
        
        Best regards,
        The Print24 Team
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Order confirmation email sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending order confirmation email:", error);
    // Don't throw error - email failure shouldn't block order creation
    return null;
  }
};


<<<<<<< HEAD

// Send OTP email
export const sendOtpEmail = async (userEmail, otp) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn("Email credentials not configured. Skipping email send.");
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEV MODE] OTP for ${userEmail}: ${otp}`);
      }
      return;
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'Print24'}" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: "Your OTP for Print24",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
            .container { max-width: 500px; margin: 30px auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #8B7355 0%, #6e5b42 100%); color: white; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
            .content { padding: 40px 30px; text-align: center; }
            .otp-box { background-color: #f8f5f2; border: 2px dashed #8B7355; border-radius: 12px; padding: 20px; margin: 30px 0; font-size: 32px; font-weight: bold; color: #8B7355; letter-spacing: 5px; }
            .message { font-size: 16px; color: #666; margin-bottom: 20px; }
            .expiry { font-size: 14px; color: #999; margin-top: 20px; }
            .footer { background-color: #f8f8f8; padding: 20px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #eeeeee; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Verification Code</h1>
            </div>
            <div class="content">
              <p class="message">Please use the following One Time Password (OTP) to complete your action. Do not share this code with anyone.</p>
              <div class="otp-box">${otp}</div>
              <p class="expiry">This code is valid for 10 minutes.</p>
            </div>
            <div class="footer">
              <p>This is an automated message, please do not reply.</p>
              <p>&copy; ${new Date().getFullYear()} Print24. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Your OTP for Print24 is: ${otp}. This code is valid for 10 minutes. Do not share this code with anyone.`
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("OTP email sent:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending OTP email:", error);
    return { success: false, error: error.message };
  }
};
=======
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
