import User from "../models/User.js";
import Session from "../models/Session.js";
import crypto from "crypto";
import { sendVerificationEmail, sendWelcomeEmail, sendPasswordResetOTP } from "../libs/email.js";
import { generateTokens } from "../utils/generateTokens.js";

export const login = async (req, res) => {
  try {
    const { loginIdentifier, password } = req.body;

    if (!loginIdentifier || !password) {
      return res.status(400).json({ message: "Login identifier and password are required." });
    }

    // Find user by username or email
    const user = await User.findOne({
      $or: [
        { username: loginIdentifier.toLowerCase() },
        { email: loginIdentifier.toLowerCase() }
      ]
    }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate tokens and create session
    const { accessToken, refreshToken } = await generateTokens(user._id);

    // Set refresh token in HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Prepare user object without password
    const userObj = user.toObject();
    delete userObj.password;

    // So sánh createdAt và updatedAt để xác định user mới.
    // Nếu chênh lệch dưới 10 giây, coi như là user mới chưa cập nhật profile.
    const timeDifference = Math.abs(user.updatedAt.getTime() - user.createdAt.getTime());
    const isNewUser = timeDifference < 10000; // 10 giây

    // Thêm trường isNewUser vào user object trả về
    userObj.isNewUser = isNewUser;

    return res.status(200).json({
      message: "User logged in successfully",
      accessToken,
      user: userObj,
      isNewUser, // Trả về isNewUser ở cấp cao nhất để dễ truy cập
      expiresIn: "15", // 15 minutes
    });

  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * POST /api/auth/forgot-password
 * Gửi email chứa mã OTP để reset password
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Luôn trả về thông báo thành công để tránh user enumeration
    if (user) {
      // Tạo mã OTP 6 chữ số
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Hash mã OTP để lưu vào DB
      const hashedOTP = crypto.createHash("sha256").update(otp.trim()).digest("hex");

      // Lưu OTP đã hash và thời gian hết hạn (5 phút)
      user.passwordResetOTP = hashedOTP;
      user.passwordResetOTPExpires = Date.now() + 5 * 60 * 1000; // 5 minutes
      await user.save();

      // Gửi email chứa mã OTP (chưa hash)
      try {
        await sendPasswordResetOTP(user.email, user.name, otp);
      } catch (emailError) {
        console.error("Forgot password email send failed:", emailError);
        // Không báo lỗi cho client để bảo mật
      }
    }

    return res.status(200).json({
      message: "If an account with that email exists, a password reset OTP has been sent.",
    });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * POST /api/auth/reset-password
 * Đặt lại mật khẩu bằng OTP
 */
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "Email, OTP, and new password are required." });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters long." });
    }

    const hashedOTP = crypto.createHash("sha256").update(otp.trim()).digest("hex");

    // Tìm user bằng email trước
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      passwordResetOTP: hashedOTP, // So sánh OTP đã hash ngay trong câu query
      passwordResetOTPExpires: { $gt: Date.now() }, // Kiểm tra thời gian hết hạn
    });

    // Nếu không tìm thấy user nào khớp với cả 3 điều kiện, OTP không hợp lệ hoặc đã hết hạn.
    if (!user) {
      return res.status(400).json({ message: "Invalid or expired OTP." });
    }

    // Nếu tất cả đều hợp lệ, user đã được tìm thấy và OTP đúng

    user.password = newPassword; // Mongoose middleware sẽ tự động hash
    user.passwordResetOTP = undefined;
    user.passwordResetOTPExpires = undefined;
    await user.save();

    return res.status(200).json({ message: "Password has been reset successfully." });
  } catch (error) {
    console.error("Reset Password Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * POST /api/auth/change-password
 * Requires auth; user provides currentPassword and newPassword
 */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required." });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters long." });
    }

    const user = await User.findById(req.user._id).select("+password");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect." });
    }

    const samePassword = await user.comparePassword(newPassword);
    if (samePassword) {
      return res.status(400).json({ message: "New password must be different from the current password." });
    }

    user.password = newPassword;
    user.passwordResetOTP = undefined;
    user.passwordResetOTPExpires = undefined;
    await user.save();

    return res.status(200).json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("Change Password Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const register = async (req, res) => {
  try {
    const { username, email, password, name } = req.body;

    if (!username || !email || !password || !name) {
      return res.status(400).json({ message: "Please provide name, username, email, and password." });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters long." });
    }

    const normalizedUsername = username.toLowerCase().trim();
    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({
      $or: [{ username: normalizedUsername }, { email: normalizedEmail }],
    });
    if (existingUser) {
      const field = existingUser.username === normalizedUsername ? "Username" : "Email";
      return res.status(400).json({ message: `${field} already in use.` });
    }

    // TẠO USER MỚI - KHÔNG CẦN XÁC THỰC EMAIL
    const newUser = new User({
      username: normalizedUsername,
      email: normalizedEmail,
      password,
      name: name.trim(),
      displayName: normalizedUsername,
      isEmailVerified: true, // Tự động set verified
    });

    await newUser.save();

    // GỬI WELCOME EMAIL (không bắt buộc xác thực)
    try {
      await sendWelcomeEmail(normalizedEmail, name.trim(), normalizedUsername);
    } catch (emailError) {
      console.error("Welcome email send failed:", emailError);
      // Không fail đăng ký nếu email lỗi
    }

    // Tự động đăng nhập user sau khi đăng ký
    const { accessToken, refreshToken } = await generateTokens(newUser._id);

    // Set refresh token in HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    const userObj = newUser.toObject();
    delete userObj.password;

    return res.status(201).json({
      message: "Registration successful! Welcome to ProPlayHub!",
      user: userObj,
      accessToken,
      expiresIn: "15", // 15 minutes
    });

  } catch (error) {
    // === XỬ LÝ LỖI VALIDATION ===
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message).join(", ");
      return res.status(400).json({ message: "Validation failed", details: messages });
    }

    // === XỬ LÝ TRÙNG LẶP (MongoDB duplicate key) ===
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      const value = error.keyValue[field];
      return res.status(400).json({
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} '${value}' already in use.`,
      });
    }

    console.error("Registration Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
export const logout = async (req, res) => {
  try {
    const userId = req.user._id; // từ middleware auth

    // Xóa tất cả sessions của user
    await Session.deleteMany({ userId });

    // Clear refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });

    return res.status(200).json({
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout Error:", error);
    // Vẫn trả về success để frontend có thể clear local storage
    return res.status(200).json({
      message: "Logged out successfully",
    });
  }
};

export const completeProfile = async (req, res) => {
  try {
    const { displayName, age, location, address, gamingPlatformPreferences } = req.body;
    const userId = req.user._id; // từ middleware auth

    // Validate
    if (!Array.isArray(gamingPlatformPreferences) || gamingPlatformPreferences.length === 0) {
      return res.status(400).json({ message: "Please select at least one gaming platform." });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { displayName, age, location, address, gamingPlatformPreferences },
      { new: true, runValidators: true }
    ).select('-password');

    return res.json({ message: "Profile completed!", user: updatedUser });
  } catch (error) {
    // xử lý lỗi validation
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message).join(", ");
      return res.status(400).json({ message: "Validation failed", details: messages });
    }
  }
};
// Thay đổi: Hàm này giờ là một API endpoint được gọi bởi app, không phải redirect link
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body; // Lấy token từ body của request POST

    if (!token) {
      return res.status(400).json({ message: "Token is required." });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      verificationToken: hashedToken,
      verificationTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token." });
    }

    user.isEmailVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    // Trả về thông báo thành công, app sẽ xử lý việc chuyển hướng
    return res.status(200).json({
      message: "Email verified successfully!",
    });

  } catch (error) {
    console.error("Verify Email Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/auth/me - Lấy thông tin user hiện tại
export const getCurrentUser = async (req, res) => {
  try {
    // req.user đã được set bởi auth middleware
    const user = await User.findById(req.user._id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.status(200).json({
      user: user.toObject(),
    });
  } catch (error) {
    console.error("Get Current User Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/auth/profile - Update profile
export const updateProfile = async (req, res) => {
  try {
    const { displayName, age, location, address, gamingPlatformPreferences, name } = req.body;
    const userId = req.user._id; // từ middleware auth

    const updateData = {};
    if (displayName !== undefined) updateData.displayName = displayName;
    if (age !== undefined) updateData.age = age;
    if (location !== undefined) updateData.location = location;
    if (address !== undefined) updateData.address = address;
    if (gamingPlatformPreferences !== undefined) {
      if (!Array.isArray(gamingPlatformPreferences)) {
        return res.status(400).json({ message: "gamingPlatformPreferences must be an array." });
      }
      updateData.gamingPlatformPreferences = gamingPlatformPreferences;
    }
    if (name !== undefined) updateData.name = name;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.status(200).json({
      message: "Profile updated successfully!",
      user: updatedUser.toObject(),
    });
  } catch (error) {
    // xử lý lỗi validation
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message).join(", ");
      return res.status(400).json({ message: "Validation failed", details: messages });
    }
    console.error("Update Profile Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
