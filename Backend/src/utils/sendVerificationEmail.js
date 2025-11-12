import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,     // your-email@gmail.com
    pass: process.env.EMAIL_PASS,     // App Password (không phải mật khẩu thường)
  },
});

export const sendVerificationEmail = async (email, token) => {
  const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${token}`;

  const mailOptions = {
    from: `"ProPlayHub" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Xác thực email - ProPlayHub",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: #4f46e5;">Chào mừng đến với ProPlayHub!</h2>
        <p>Vui lòng nhấn nút bên dưới để xác thực email của bạn:</p>
        <a href="${verificationUrl}" 
           style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Xác thực ngay
        </a>
        <p>Hoặc sao chép link: <br/><small>${verificationUrl}</small></p>
        <hr/>
        <p style="color: #666; font-size: 12px;">Link hết hạn sau 15 phút.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};