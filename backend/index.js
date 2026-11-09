 // 1. Imports
const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");

// 2. App configuration
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// 3. MongoDB connection — KEEP THIS
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Atlas Connected"))
  .catch((error) => console.log("MongoDB Error:", error));

// 4. Settings model — KEEP THIS
const settingsSchema = new mongoose.Schema({
  email: String,
  password: String
});

const Settings = mongoose.model("Settings", settingsSchema);

// 5. Email history model — KEEP THIS
const emailSchema = new mongoose.Schema({
  emails: [String],
  message: String,
  date: { type: Date, default: Date.now },
  status: String
});

const Email = mongoose.model("Email", emailSchema, "bulkmail");

// 6. PUT THE NEW app.post("/sendemail", ...) ROUTE HERE

app.post("/sendemail", async (req, res) => {
  try {
    const { msg, emails } = req.body;

    const recipients = Array.isArray(emails)
      ? [...new Set(
          emails
            .map(email => String(email).trim())
            .filter(email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        )]
      : [];

    if (!msg?.trim() || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Message and valid emails are required"
      });
    }

    const settings = await Settings.findOne();

    if (!settings) {
      return res.status(400).json({
        success: false,
        message: "Gmail settings not found"
      });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: settings.email,
        pass: settings.password
      }
    });

    // First, send the email
    const info = await transporter.sendMail({
      from: settings.email,
      bcc: recipients,
      subject: "BulkMail Message",
      text: msg
    });

    console.log("Email sent successfully:", info.messageId);

    // Then, save history separately
    try {
      await Email.create({
        emails: recipients,
        message: msg,
        status: "sent"
      });

      console.log("Email history saved successfully");
    } catch (historyError) {
      console.error("Email sent, but history saving failed:", historyError);
    }

    // Email success should not depend on history saving
    return res.status(200).json({
      success: true,
      message: "Emails sent successfully!",
      total: recipients.length
    });

  } catch (error) {
    console.error("Email sending error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Email sending failed"
    });
  }
});


// 7. Root route
app.get("/", (req, res) => {
  res.send("BulkMail server is running");
});

// 8. Start server
mongoose.connection.once("open", () => {
  app.listen(port, "0.0.0.0", () => {
    console.log(`Server running on port ${port}`);
  });
});