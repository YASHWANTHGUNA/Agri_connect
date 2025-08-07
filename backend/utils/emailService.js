// agriconnect2.0/backend/utils/emailService.js

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Verify transporter connection
transporter.verify(function(error, success) {
    if (error) {
        console.error('SMTP connection error:', error);
    } else {
        console.log('SMTP server is ready to take our messages');
    }
});

/**
 * Send verification email to user
 * @param {string} email - User's email address
 * @param {string} token - Verification token
 */
export const sendVerificationEmail = async (email, token) => {
    try {
        const verificationUrl = `${process.env.CLIENT_ORIGIN}/verify-email/${token}`;
        
        const mailOptions = {
            from: `"AgriConnect" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Verify Your Email - AgriConnect',
            html: `
                <h1>Welcome to AgriConnect!</h1>
                <p>Please verify your email address by clicking the link below:</p>
                <a href="${verificationUrl}">Verify Email</a>
                <p>This link will expire in 24 hours.</p>
                <p>If you didn't create an account, please ignore this email.</p>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('Verification email sent to:', email);
    } catch (error) {
        console.error('Error sending verification email:', error);
        throw new Error('Failed to send verification email');
    }
};

/**
 * Send password reset email to user
 * @param {string} email - User's email address
 * @param {string} token - Password reset token
 */
export const sendPasswordResetEmail = async (email, token) => {
    try {
        const resetUrl = `${process.env.CLIENT_ORIGIN}/reset-password/${token}`;
        
        const mailOptions = {
            from: `"AgriConnect" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Reset Your Password - AgriConnect',
            html: `
                <h1>Password Reset Request</h1>
                <p>You requested to reset your password. Click the link below to proceed:</p>
                <a href="${resetUrl}">Reset Password</a>
                <p>This link will expire in 1 hour.</p>
                <p>If you didn't request a password reset, please ignore this email.</p>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('Password reset email sent to:', email);
    } catch (error) {
        console.error('Error sending password reset email:', error);
        throw new Error('Failed to send password reset email');
    }
};

/**
 * Send welcome email to new user
 * @param {string} email - User's email address
 * @param {string} name - User's name
 */
export const sendWelcomeEmail = async (email, name) => {
    try {
        const mailOptions = {
            from: `"AgriConnect" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Welcome to AgriConnect!',
            html: `
                <h1>Welcome to AgriConnect, ${name}!</h1>
                <p>Thank you for joining our community of farmers and agricultural enthusiasts.</p>
                <p>With AgriConnect, you can:</p>
                <ul>
                    <li>Connect with other farmers</li>
                    <li>Share your farming experiences</li>
                    <li>Get weather updates</li>
                    <li>Access farming resources</li>
                </ul>
                <p>Start exploring now!</p>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('Welcome email sent to:', email);
    } catch (error) {
        console.error('Error sending welcome email:', error);
        throw new Error('Failed to send welcome email');
    }
};

/**
 * Send notification email
 * @param {string} email - Recipient's email address
 * @param {string} subject - Email subject
 * @param {string} content - Email content
 */
export const sendNotificationEmail = async (email, subject, content) => {
    try {
        const mailOptions = {
            from: `"AgriConnect" <${process.env.SMTP_USER}>`,
            to: email,
            subject: subject,
            html: content
        };

        await transporter.sendMail(mailOptions);
        console.log('Notification email sent to:', email);
    } catch (error) {
        console.error('Error sending notification email:', error);
        throw new Error('Failed to send notification email');
    }
}; 