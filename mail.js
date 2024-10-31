const express = require('express');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());  // Middleware to parse JSON bodies

// Nodemailer configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'kushalmehta0309@gmail.com',
        pass: 'jswq tqlr qujs jobi' // Use environment variables for security
    }
});

// Function to load and replace placeholders in HTML template
function loadTemplate(templateName, data) {
    return new Promise((resolve, reject) => {
        const templatePath = path.join(__dirname, 'templates', `${templateName}.html`);
        
        fs.readFile(templatePath, 'utf8', (err, template) => {
            if (err) return reject(err);

            // Replace placeholders with actual data
            let filledTemplate = template;
            Object.keys(data).forEach(key => {
                const placeholder = `{{${key}}}`;
                filledTemplate = filledTemplate.replace(new RegExp(placeholder, 'g'), data[key]);
            });

            resolve(filledTemplate);
        });
    });
}

// Utility functions
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000); // Generates a random 6-digit number
}

let storedOTPs = {}; // Store OTPs with expiration
const otpExpirationTime = 300000; // 5 minutes

// Send OTP route
app.post('/send-otp', async (req, res) => {
    const { customerEmail, customerName } = req.body;

    // Check if the necessary fields are present
    if (!customerEmail || !customerName) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    // Generate OTP and set expiration
    const otp = generateOTP();
    const expiration = Date.now() + otpExpirationTime;
    storedOTPs[customerEmail] = { otp, expiration };

    // Load OTP template
    try {
        const htmlContent = await loadTemplate('otp', {
            customerName,
            otp, // Corrected from 'OTP' to 'otp'
            validityDuration: '5 minutes'
        });

        // Email options
        const mailOptions = {
            from: 'kushalmehta0309@gmail.com',
            to: customerEmail,
            subject: 'Your OTP for Verification',
            html: htmlContent
        };

        // Send email
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return res.status(500).json({ message: 'Error sending OTP', error });
            }
            res.status(200).json({ message: 'OTP sent successfully!', info });
        });
    } catch (error) {
        res.status(500).json({ message: 'Error loading OTP template', error });
    }
});

// Verify OTP route
app.post('/verify-otp', (req, res) => {
    const { customerEmail, otp } = req.body;

    // Check if OTP exists and is not expired
    if (storedOTPs[customerEmail]) {
        const { otp: storedOTP, expiration } = storedOTPs[customerEmail];

        if (Date.now() > expiration) {
            delete storedOTPs[customerEmail]; // Invalidate OTP after expiration
            return res.status(400).json({ message: 'OTP has expired' });
        }

        if (parseInt(otp) === storedOTP) {
            delete storedOTPs[customerEmail]; // Invalidate after use
            return res.status(200).json({ message: 'OTP verified successfully!' });
        }
    }

    return res.status(400).json({ message: 'Invalid OTP' });
});

// Email sending route
app.post('/send-email', async (req, res) => {
    const { customerEmail, customerName, leadId, shareName, lotQty, leadCreationDate, templateType } = req.body;

    // Check if the necessary fields are present
    if (!customerEmail || !customerName || !leadId || !shareName || !lotQty || !leadCreationDate || !templateType) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        // Load the correct template
        const htmlContent = await loadTemplate(templateType, {
            customerName,
            leadId,
            shareName,
            lotQty,
            leadCreationDate
        });

        // Email options
        const mailOptions = {
            from: 'kushalmehta0309@gmail.com',
            to: customerEmail,
            subject: `Update on Your Request #${leadId}`, // Improved subject
            html: htmlContent
        };

        // Send email
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return res.status(500).json({ message: 'Error sending email', error });
            }
            res.status(200).json({ message: 'Email sent successfully!', info });
        });
    } catch (error) {
        res.status(500).json({ message: 'Error loading template', error });
    }
});

app.listen(5000, () => {
    console.log('Server is running on port 5000');
});
