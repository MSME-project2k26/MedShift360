/* eslint-disable no-console */
const nodemailer = require('nodemailer');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

// ---------------------------------------------------------------------
// SMS
// ---------------------------------------------------------------------
const smsProviders = {
  // Development only: prints the SMS to the server console
  async console(to, message) {
    console.log(`\n[DEV SMS] to ${to}: ${message}\n`);
  },

  async twilio(to, message) {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`;
    const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString('base64');
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: to, From: env.TWILIO_FROM_NUMBER, Body: message }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Twilio responded ${res.status}: ${body.slice(0, 200)}`);
    }
  },
};

async function sendSms(to, message) {
  try {
    await smsProviders[env.SMS_PROVIDER](to, message);
  } catch (err) {
    logger.error('SMS delivery failed', { provider: env.SMS_PROVIDER, error: err.message });
    throw ApiError.badGateway('SMS_DELIVERY_FAILED', 'We could not send the SMS right now. Please try again in a minute.');
  }
}

// ---------------------------------------------------------------------
// Email
// ---------------------------------------------------------------------
let transporter;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

const emailProviders = {
  async console({ to, subject, text }) {
    console.log(`\n[DEV EMAIL] to ${to} | ${subject}\n${text}\n`);
  },

  async smtp({ to, subject, text }) {
    await getTransporter().sendMail({ from: env.EMAIL_FROM, to, subject, text });
  },
};

async function sendEmail({ to, subject, text }) {
  try {
    await emailProviders[env.EMAIL_PROVIDER]({ to, subject, text });
  } catch (err) {
    logger.error('Email delivery failed', { provider: env.EMAIL_PROVIDER, error: err.message });
    throw ApiError.badGateway('EMAIL_DELIVERY_FAILED', 'We could not send the email right now. Please try again in a minute.');
  }
}

module.exports = { sendSms, sendEmail };
