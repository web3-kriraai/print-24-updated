/**
 * COMPLAINT MANAGEMENT SYSTEM - Email Templates
 * Created: 2026-02-04
 * 
 * Templates for all complaint email notifications
 */

const getComplaintUrl = (complaintId) => {
    return `${process.env.FRONTEND_URL || 'http://localhost:3000'}/complaints/${complaintId}`;
};

export const emailTemplates = {
    /**
     * Template 1: Complaint Registered
     */
    registered: (data) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { 
          display: inline-block; 
          padding: 12px 24px; 
          background: #4F46E5; 
          color: white; 
          text-decoration: none; 
          border-radius: 5px;
          margin: 15px 0;
        }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .info-box { background: white; padding: 15px; border-left: 4px solid #4F46E5; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Complaint Registered Successfully</h1>
        </div>
        <div class="content">
          <h2>Dear ${data.customerName},</h2>
          <p>Your complaint has been registered successfully. We will review it and respond within 1 hour.</p>
          
          <div class="info-box">
            <strong>Complaint Details:</strong><br>
            <strong>Complaint ID:</strong> ${data.complaintId}<br>
            <strong>Order Number:</strong> ${data.orderNumber}<br>
            <strong>Type:</strong> ${data.complaintType}<br>
            <strong>Registered by:</strong> ${data.registeredBy}<br>
            <strong>Description:</strong> ${data.description}
          </div>

          <p>You can track your complaint status anytime by clicking the button below:</p>
          <a href="${getComplaintUrl(data.complaintId)}" class="button">View Complaint</a>

          <p><strong>What happens next?</strong></p>
          <ul>
            <li>Our team will review your complaint within 1 hour</li>
            <li>We will investigate the issue and gather necessary information</li>
            <li>You will receive updates via email at every step</li>
            <li>If approved, a reprint order will be created as per company policy</li>
          </ul>

          <p><strong>Note:</strong> As per our policy, if the mistake is from your confirmed file or design, reprint will not be provided.</p>
        </div>
        <div class="footer">
          <p>© 2024 Prints24. All rights reserved.</p>
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    </body>
    </html>
  `,

    /**
     * Template 2: Status Update
     */
    statusUpdate: (data) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10B981; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { 
          display: inline-block; 
          padding: 12px 24px; 
          background: #10B981; 
          color: white; 
          text-decoration: none; 
          border-radius: 5px;
          margin: 15px 0;
        }
        .status-badge { 
          display: inline-block; 
          padding: 8px 16px; 
          background: #10B981; 
          color: white; 
          border-radius: 20px;
          font-weight: bold;
        }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Complaint Status Updated</h1>
        </div>
        <div class="content">
          <p>Your complaint <strong>${data.complaintId}</strong> status has been updated.</p>
          
          <p><strong>New Status:</strong> <span class="status-badge">${data.newStatus}</span></p>
          
          ${data.notes ? `<p><strong>Notes from our team:</strong><br>${data.notes}</p>` : ''}

          <a href="${getComplaintUrl(data.complaintId)}" class="button">View Full Details</a>

          <p>If you have any questions, you can reply to this complaint directly through our portal.</p>
        </div>
        <div class="footer">
          <p>© 2024 Prints24. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,

    /**
     * Template 3: Staff Registered On Behalf
     */
    staffOnBehalf: (data) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #8B5CF6; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { 
          display: inline-block; 
          padding: 12px 24px; 
          background: #8B5CF6; 
          color: white; 
          text-decoration: none; 
          border-radius: 5px;
          margin: 15px 0;
        }
        .info-box { background: white; padding: 15px; border-left: 4px solid #8B5CF6; margin: 15px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Complaint Registered on Your Behalf</h1>
        </div>
        <div class="content">
          <h2>Dear ${data.customerName},</h2>
          <p>Our team has registered a complaint on your behalf for your order.</p>
          
          <div class="info-box">
            <strong>Complaint Details:</strong><br>
            <strong>Complaint ID:</strong> ${data.complaintId}<br>
            <strong>Order Number:</strong> ${data.orderNumber}<br>
            <strong>Type:</strong> ${data.complaintType}<br>
            <strong>Registered by:</strong> ${data.staffName} (Prints24 Staff)
          </div>

          <p>After reviewing your order details and verifying the issue, our support team has initiated this complaint on your behalf.</p>

          <a href="${getComplaintUrl(data.complaintId)}" class="button">View Complaint</a>

          <p>You can view the full details, add comments, and track progress through our portal.</p>
        </div>
        <div class="footer">
          <p>© 2024 Prints24. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,

    /**
     * Template 4: Complaint Reopened
     */
    reopened: (data) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #F59E0B; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { 
          display: inline-block; 
          padding: 12px 24px; 
          background: #F59E0B; 
          color: white; 
          text-decoration: none; 
          border-radius: 5px;
          margin: 15px 0;
        }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Complaint Reopened</h1>
        </div>
        <div class="content">
          <p>Your complaint <strong>${data.complaintId}</strong> for order <strong>${data.orderNumber}</strong> has been reopened.</p>
          
          <p><strong>Reopened by:</strong> ${data.reopenedBy} (Prints24 Staff)</p>
          <p><strong>Reason:</strong> ${data.reason}</p>

          <a href="${getComplaintUrl(data.complaintId)}" class="button">View Complaint</a>

          <p>We are taking another look at this issue. Our team will review and respond soon.</p>
        </div>
        <div class="footer">
          <p>© 2024 Prints24. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,

    /**
     * Template 5: New Message
     */
    newMessage: (data) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #3B82F6; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { 
          display: inline-block; 
          padding: 12px 24px; 
          background: #3B82F6; 
          color: white; 
          text-decoration: none; 
          border-radius: 5px;
          margin: 15px 0;
        }
        .message-box { background: white; padding: 15px; border-left: 4px solid #3B82F6; margin: 15px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Message on Your Complaint</h1>
        </div>
        <div class="content">
          <p>You have received a new message on complaint <strong>${data.complaintId}</strong>.</p>
          
          <p><strong>From:</strong> ${data.senderName}</p>
          
          <div class="message-box">
            ${data.message}
          </div>

          <a href="${getComplaintUrl(data.complaintId)}" class="button">View & Reply</a>

          <p>Click the button above to view the full conversation and reply.</p>
        </div>
        <div class="footer">
          <p>© 2024 Prints24. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,
};
