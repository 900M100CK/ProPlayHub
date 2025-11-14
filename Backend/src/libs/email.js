// src/libs/email.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv'; // Đảm bảo dotenv được gọi ở file chính của server

dotenv.config();

// 1. Cấu hình transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// 2. Hàm tạo nội dung email (HTML)
const createVerificationEmailHTML = (name, url) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
      <h2 style="color: #4f46e5;">Chào mừng ${name} đến với ProPlayHub!</h2>
      <p>Cảm ơn bạn đã đăng ký. Vui lòng nhấn nút bên dưới để xác thực email của bạn:</p>
      <a href="${url}" 
         style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
        Xác thực ngay
      </a>
      <p>Nếu nút trên không hoạt động, bạn có thể sao chép và dán liên kết sau vào trình duyệt của mình:</p>
      <p><a href="${url}">${url}</a></p>
      <hr/>
      <p>Nếu bạn không đăng ký tài khoản này, vui lòng bỏ qua email này.</p>
      <p style="color: #666; font-size: 12px;">Lưu ý: Liên kết này sẽ hết hạn sau 15 phút.</p>
      <p>Trân trọng,<br/>Đội ngũ ProPlayHub</p>
    </div>
  `;
};

// Hàm tạo nội dung email (HTML) cho việc đặt lại mật khẩu bằng OTP
const createPasswordResetOTPEmailHTML = (name, otp) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
      <h2 style="color: #4f46e5;">Yêu cầu đặt lại mật khẩu ProPlayHub</h2>
      <p>Chào ${name},</p>
      <p>Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Vui lòng sử dụng mã OTP dưới đây để hoàn tất quá trình:</p>
      <div style="background: #f0f0f0; padding: 10px 20px; border-radius: 6px; text-align: center; margin: 16px 0;">
        <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px; margin: 0;">${otp}</p>
      </div>
      <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
      <hr/>
      <p style="color: #666; font-size: 12px;">Lưu ý: Mã OTP này sẽ hết hạn sau 5 phút.</p>
      <p>Trân trọng,<br/>Đội ngũ ProPlayHub</p>
    </div>
  `;
};

// 3. Hàm gửi email xác thực
export const sendVerificationEmail = async (to, name, token) => {
  // [KHUYẾN NGHỊ] Sử dụng Universal Link/App Link (HTTPS) để có trải nghiệm tốt nhất.
  // Liên kết này sẽ mở app nếu đã cài, hoặc mở web nếu chưa cài.
  // Bạn cần định nghĩa APP_DOMAIN trong file .env, ví dụ: APP_DOMAIN=https://app.proplayhub.com
  const appDomain = process.env.APP_DOMAIN || 'https://your-app-domain.com'; // Thay thế bằng domain của bạn
  const verificationUrl = `${appDomain}/verify-email?token=${token}`;
  const mailOptions = {
    from: `"ProPlayHub" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
    to: to,
    subject: 'Xác thực tài khoản ProPlayHub của bạn',
    html: createVerificationEmailHTML(name, verificationUrl),
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Verification email sent successfully to ${to}`);
  } catch (error) {
    console.error('Error sending verification email:', error);
    // Ném lỗi để controller có thể xử lý
    throw new Error('Could not send verification email.');
  }
};

// 4. Hàm gửi email chứa mã OTP để đặt lại mật khẩu
export const sendPasswordResetOTP = async (to, name, otp) => {
  const mailOptions = {
    from: `"ProPlayHub" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
    to: to,
    subject: 'Mã OTP đặt lại mật khẩu ProPlayHub của bạn',
    html: createPasswordResetOTPEmailHTML(name, otp),
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Password reset OTP email sent successfully to ${to}`);
  } catch (error) {
    console.error('Error sending password reset OTP email:', error);
    // Ném lỗi để controller có thể xử lý
    throw new Error('Could not send password reset OTP email.');
  }
};
