import nodemailer from 'nodemailer';
import { welcomeEmailTemplate } from './templates/welcome';
import { orderConfirmationTemplate } from './templates/orderConfirmation';

const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'Luxury Boutique <noreply@luxuryboutique.com>';

const isConfigured = () => !!(SMTP_USER && SMTP_PASS);

let transporter: nodemailer.Transporter | null = null;

const getTransporter = (): nodemailer.Transporter | null => {
  if (!isConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
};

export const sendWelcomeEmail = async (email: string, firstName: string): Promise<void> => {
  const transport = getTransporter();
  if (!transport) {
    console.log(`[Email] Would send welcome email to ${email} (SMTP not configured)`);
    return;
  }
  await transport.sendMail({
    from: EMAIL_FROM,
    to: email,
    subject: `Welcome to Luxury Boutique, ${firstName}!`,
    html: welcomeEmailTemplate(firstName),
  });
  console.log(`[Email] Welcome email sent to ${email}`);
};

export const sendOrderConfirmationEmail = async (email: string, order: any): Promise<void> => {
  const transport = getTransporter();
  if (!transport) {
    console.log(`[Email] Would send order confirmation to ${email} (SMTP not configured)`);
    return;
  }
  const orderRef = order.id ? order.id.slice(-8).toUpperCase() : '';
  await transport.sendMail({
    from: EMAIL_FROM,
    to: email,
    subject: `Order Confirmed – #${orderRef} | Luxury Boutique`,
    html: orderConfirmationTemplate(order),
  });
  console.log(`[Email] Order confirmation sent to ${email}`);
};
