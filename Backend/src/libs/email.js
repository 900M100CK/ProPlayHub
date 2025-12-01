// src/libs/email.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Configure transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verification email
const createVerificationEmailHTML = (name, url) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
      <h2 style="color: #4f46e5;">Welcome ${name} to ProPlayHub!</h2>
      <p>Thank you for signing up. Please click the button below to verify your email:</p>
      <a href="${url}"
         style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
        Verify now
      </a>
      <p>If the button above does not work, you can copy and paste this link into your browser:</p>
      <p><a href="${url}">${url}</a></p>
      <hr/>
      <p style="color: #666; font-size: 12px;">Note: This link expires in 15 minutes.</p>
      <p>Best regards,<br/>ProPlayHub Team</p>
    </div>
  `;
};

// Password reset (OTP) email
const createPasswordResetOTPEmailHTML = (name, otp) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
      <h2 style="color: #4f46e5;">ProPlayHub password reset request</h2>
      <p>Hello ${name},</p>
      <p>We received a request to reset your password. Please use the OTP below to complete the process:</p>
      <div style="background: #f0f0f0; padding: 10px 20px; border-radius: 6px; text-align: center; margin: 16px 0;">
        <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px; margin: 0;">${otp}</p>
      </div>
      <p>If you did not request a password reset, please ignore this email.</p>
      <hr/>
      <p style="color: #666; font-size: 12px;">Note: This OTP expires in 5 minutes.</p>
      <p>Best regards,<br/>ProPlayHub Team</p>
    </div>
  `;
};

// Send verification email
export const sendVerificationEmail = async (to, name, token) => {
  const appDomain = process.env.APP_DOMAIN || 'https://your-app-domain.com';
  const verificationUrl = `${appDomain}/verify-email?token=${token}`;
  const mailOptions = {
    from: `"ProPlayHub" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
    to,
    subject: 'Verify your ProPlayHub account',
    html: createVerificationEmailHTML(name, verificationUrl),
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Verification email sent successfully to ${to}`);
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error('Could not send verification email.');
  }
};

// Welcome email
const createWelcomeEmailHTML = (name, username) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
      <h2 style="color: #4f46e5;">Welcome ${name} to ProPlayHub!</h2>
      <p>Hello ${name},</p>
      <p>Thank you for registering a ProPlayHub account. We are excited to have you!</p>
      <div style="background: #f0f0f0; padding: 15px; border-radius: 6px; margin: 16px 0;">
        <p><strong>Your account:</strong></p>
        <p>Username: <strong>${username}</strong></p>
      </div>
      <p>You can now:</p>
      <ul>
        <li>Explore exclusive game subscription packages</li>
        <li>Enjoy premium features</li>
        <li>Receive special offers</li>
      </ul>
      <p>Start your gaming journey today!</p>
      <p>If you have any questions, please contact us.</p>
      <p>Best regards,<br/>ProPlayHub Team</p>
    </div>
  `;
};

export const sendWelcomeEmail = async (to, name, username) => {
  const mailOptions = {
    from: `"ProPlayHub" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
    to,
    subject: 'Welcome to ProPlayHub!',
    html: createWelcomeEmailHTML(name, username),
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent successfully to ${to}`);
  } catch (error) {
    console.error('Error sending welcome email:', error);
    // Do not throw to avoid failing signup due to email issues
  }
};

// Send OTP email for password reset
export const sendPasswordResetOTP = async (to, name, otp) => {
  const mailOptions = {
    from: `"ProPlayHub" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
    to,
    subject: 'Your ProPlayHub password reset OTP',
    html: createPasswordResetOTPEmailHTML(name, otp),
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Password reset OTP email sent successfully to ${to}`);
  } catch (error) {
    console.error('Error sending password reset OTP email:', error);
    throw new Error('Could not send password reset OTP email.');
  }
};

// Subscription receipt
const createSubscriptionReceiptEmailHTML = (name, subscription) => {
  const startedAt = subscription.startedAt
    ? new Date(subscription.startedAt).toLocaleString('en-GB')
    : 'N/A';

  const nextBillingDate = subscription.nextBillingDate
    ? new Date(subscription.nextBillingDate).toLocaleDateString('en-GB')
    : 'N/A';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
      <h2 style="color: #4f46e5;">ProPlayHub Subscription Receipt</h2>
      <p>Hi ${name},</p>
      <p>Thank you for your payment. Below are the details of your subscription:</p>

      <div style="background: #f9fafb; padding: 12px 16px; border-radius: 6px; margin: 12px 0;">
        <p><strong>Package:</strong> ${subscription.packageName}</p>
        <p><strong>Package Code:</strong> ${subscription.packageSlug}</p>
        <p><strong>Price:</strong> £${subscription.pricePerPeriod.toFixed(2)} ${subscription.period}</p>
        <p><strong>Status:</strong> ${subscription.status}</p>
        <p><strong>Started At:</strong> ${startedAt}</p>
        <p><strong>Next Billing Date:</strong> ${nextBillingDate}</p>
      </div>

      <p style="margin-top: 12px;">
        This is your official receipt confirming the payment for your ProPlayHub subscription.
        Please keep this email as proof of payment.
      </p>

      <hr style="margin: 20px 0;" />

      <p>If you have any questions or disputes about this transaction, please contact the ProPlayHub support team.</p>
      <p>Best regards,<br/>ProPlayHub Team</p>
    </div>
  `;
};

export const sendSubscriptionReceiptEmail = async (to, name, subscription) => {
  const mailOptions = {
    from: `"ProPlayHub" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
    to,
    subject: `Your ProPlayHub Subscription Receipt – ${subscription.packageName}`,
    html: createSubscriptionReceiptEmailHTML(name, subscription),
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Subscription receipt email sent successfully to ${to}`);
  } catch (error) {
    console.error('Error sending subscription receipt email:', error);
    // Do not throw to avoid failing payment flow due to email issues
  }
};

// Add-on purchase confirmation
const createAddonPurchaseEmailHTML = (name, payload) => {
  const { packageName, packageSlug, addons, chargeTotal } = payload;
  const items = Array.isArray(addons)
    ? addons
        .map((addon) => {
          const price = typeof addon.price === 'number' ? addon.price.toFixed(2) : '0.00';
          return `<li>${addon.name} - $${price}</li>`;
        })
        .join('')
    : '';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
      <h2 style="color: #4f46e5;">Add-on purchase confirmed</h2>
      <p>Hi ${name},</p>
      <p>You just upgraded your subscription by adding these items:</p>

      <div style="background: #f9fafb; padding: 12px 16px; border-radius: 6px; margin: 12px 0;">
        <p><strong>Package:</strong> ${packageName} (${packageSlug})</p>
        <p><strong>New add-ons:</strong></p>
        <ul>${items}</ul>
        <p><strong>Charged today:</strong> $${Number(chargeTotal || 0).toFixed(2)}</p>
      </div>

      <p>Your monthly billing will include these add-ons from now on.</p>
      <p>If you have any questions, please contact ProPlayHub support.</p>
      <p>Best regards,<br/>ProPlayHub Team</p>
    </div>
  `;
};

export const sendAddonPurchaseEmail = async (to, name, payload) => {
  const mailOptions = {
    from: `"ProPlayHub" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
    to,
    subject: `Your add-ons are active for ${payload.packageName}`,
    html: createAddonPurchaseEmailHTML(name, payload),
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Addon purchase email sent successfully to ${to}`);
  } catch (error) {
    console.error('Error sending add-on purchase email:', error);
  }
};
