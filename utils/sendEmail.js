const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
  //create transporter (service that will send email like "gmail", "mailgun")
  const transporter = nodemailer.createTransport({
    service: "gmail",
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  //create email options(like from, to, subject, email content)
  const {mailOptions} = options;
  //send email
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
