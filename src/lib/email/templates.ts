import { sendEmail } from './index';
import prisma from '@/lib/prisma';
import log from '@/lib/logger';

// 1. Helper to log database in-app notification alerts
export async function createInAppNotification(
  userId: string,
  type: 'SUCCESS' | 'WARNING' | 'ERROR' | 'INFO',
  title: string,
  message: string
) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
      },
    });
    log.info({ userId, notificationId: notification.id }, 'In-app notification created successfully');
    return notification;
  } catch (err: any) {
    log.error({ userId, error: err.message }, 'Failed to create in-app notification record');
    return null;
  }
}

// 2. Email templates and alerts helper functions
const wrapLayout = (title: string, bodyContent: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #0b0d10; color: #d4d4d8; margin: 0; padding: 40px 20px; }
    .container { max-width: 580px; margin: 0 auto; background-color: #14171c; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.25); }
    .header { padding: 30px 40px; background-color: #0c0e12; border-bottom: 1px solid rgba(255,255,255,0.08); }
    .logo { font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; }
    .content { padding: 40px; line-height: 1.6; font-size: 14px; }
    .button { display: inline-block; background-color: #4f8cff; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: 600; font-size: 13px; margin: 20px 0; text-align: center; }
    .footer { padding: 25px 40px; background-color: #0c0e12; border-top: 1px solid rgba(255,255,255,0.08); font-size: 11px; color: #52525b; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">ClaimAppeal<span style="color:#52525b;font-weight:400">Pro</span></div>
    </div>
    <div class="content">
      <h2 style="color:#ffffff;margin-top:0;font-size:18px;font-weight:700">${title}</h2>
      ${bodyContent}
    </div>
    <div class="footer">
      &copy; 2026 ClaimAppealPro. All rights reserved.<br>
      Automating clinical insurance denials.
    </div>
  </div>
</body>
</html>
`;

export async function sendWelcomeEmail(to: string, name: string = 'User') {
  const html = wrapLayout(
    'Welcome to ClaimAppealPro!',
    `
      <p>Hello ${name},</p>
      <p>Thank you for signing up for ClaimAppealPro! We are excited to help you automate clinical health insurance claim denial appeals.</p>
      <p>Get started today by uploading your denial letter to our secure OCR engine.</p>
      <a href="https://claimappealpro.com/dashboard" class="button">Go to Dashboard</a>
      <p>Best regards,<br>The ClaimAppealPro Team</p>
    `
  );
  return sendEmail({ to, subject: 'Welcome to ClaimAppealPro!', html });
}

export async function sendVerificationEmail(to: string, url: string) {
  const html = wrapLayout(
    'Verify your email address',
    `
      <p>Hello,</p>
      <p>Please verify your email address to activate your account and start generating clinical appeals.</p>
      <a href="${url}" class="button">Verify Email</a>
      <p>If you did not request this verification, you can safely ignore this email.</p>
    `
  );
  return sendEmail({ to, subject: 'Verify your ClaimAppealPro Account', html });
}

export async function sendPasswordResetEmail(to: string, url: string) {
  const html = wrapLayout(
    'Reset your password',
    `
      <p>Hello,</p>
      <p>We received a request to reset your password. Click the button below to set a new password:</p>
      <a href="${url}" class="button">Reset Password</a>
      <p>For security, this link is only valid for 1 hour. If you did not make this request, you can safely ignore this email.</p>
    `
  );
  return sendEmail({ to, subject: 'Reset your ClaimAppealPro Password', html });
}

export async function sendAppealReadyEmail(to: string, userId: string, appealId: string) {
  // Trigger in-app notification first
  await createInAppNotification(
    userId,
    'SUCCESS',
    'Appeal Draft Generated',
    'Your clinical appeal letter draft has been generated successfully and is ready for export.'
  );

  const html = wrapLayout(
    'Your Appeal Letter is Ready!',
    `
      <p>Great news!</p>
      <p>Our document intelligence model has finished compiling your clinical insurance appeal draft.</p>
      <p>You can now review, edit, print, and export your letter using the rich text editor dashboard.</p>
      <a href="https://claimappealpro.com/appeals/${appealId}" class="button">View Appeal Letter</a>
    `
  );
  return sendEmail({ to, subject: 'Your Appeal Letter is Ready!', html });
}

export async function sendSubscriptionSuccessEmail(to: string, userId: string, planId: string) {
  await createInAppNotification(
    userId,
    'SUCCESS',
    'Subscription Plan Upgraded',
    `Welcome to the ${planId.toUpperCase()} tier! Your account has been upgraded successfully.`
  );

  const html = wrapLayout(
    'Upgrade Successful!',
    `
      <p>Hello,</p>
      <p>Thank you for upgrading to the <strong>${planId.toUpperCase()}</strong> plan!</p>
      <p>Your usage limits have been lifted, and you now have access to premium document intelligence analysis.</p>
      <a href="https://claimappealpro.com/dashboard" class="button">Access Premium Dashboard</a>
    `
  );
  return sendEmail({ to, subject: 'Subscription Upgrade Successful', html });
}

export async function sendPaymentReceiptEmail(to: string, userId: string, amountInCents: number) {
  const amountStr = (amountInCents / 100).toFixed(2);
  
  await createInAppNotification(
    userId,
    'INFO',
    'Payment Processed Successfully',
    `Your transaction of $${amountStr} has been successfully processed by Paddle.`
  );

  const html = wrapLayout(
    'Payment Receipt',
    `
      <p>Hello,</p>
      <p>This is a confirmation of your recent payment of <strong>$${amountStr}</strong> for ClaimAppealPro services.</p>
      <p>Your subscription is fully active. You can manage your billing invoices directly in the user dashboard portal.</p>
      <a href="https://claimappealpro.com/billing" class="button">View Billing Invoices</a>
    `
  );
  return sendEmail({ to, subject: 'ClaimAppealPro Payment Receipt', html });
}
