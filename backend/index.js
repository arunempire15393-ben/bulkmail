 
const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// MongoDB Atlas connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Atlas Connected"))
  .catch((error) => console.log("MongoDB Error:", error));

// Gmail Settings Collection
const settingsSchema = new mongoose.Schema({
  email: String,
  password: String
});

const Settings = mongoose.model("Settings", settingsSchema);

// Email History Collection
const emailSchema = new mongoose.Schema({
  emails: [String],
  message: String,
  date: {
    type: Date,
    default: Date.now
  },
  status: String
});

 const Email = mongoose.model("Email", emailSchema, "bulkmail");

// Send Bulk Emails
app.post("/sendemail", async (req, res) => {
  try {
    const { msg, emails } = req.body;

    const recipients = Array.isArray(emails)
      ? [...new Set(emails.map(email => String(email).trim())
           .filter(email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))]
      : [];

    if (!msg || recipients.length === 0) {
      return res.status(400).json({
        message: "Message and valid emails are required"
      });
    }

    // Get Gmail details from MongoDB
    const settings = await Settings.findOne();

    if (!settings) {
      return res.status(400).json({
        message: "Gmail settings not found"
      });
    }

    // Nodemailer
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: settings.email,
        pass: settings.password
      }
    });

    // Send emails
    const info = await transporter.sendMail({
      from: settings.email,
      bcc: recipients,
      subject: "BulkMail Message",
      text: msg
    });

    // Save history
    await Email.create({
      emails: recipients,
      message: msg,
      status: "sent"
    });

    console.log("Email sent:", info.messageId);

    res.json({
      success: true,
      message: "Emails sent successfully!",
      total: recipients.length
    });

  } catch (error) {
    console.log("Email Error:", error.message);

    res.status(500).json({
      success: false,
      message: "Email sending failed"
    });
  }
});

// Home route
app.get("/", (req, res) => {
  res.send("BulkMail server is running");
});

// Start server after database connection
mongoose.connection.once("open", () => {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
});
