import User from "../models/User.js";
import crypto from "crypto";
import { sendVerificationEmail } from "../libs/email.js";
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

    return res.status(200).json({
      message: "User logged in successfully",
      accessToken,
      user: userObj,
      expiresIn: "15", // 15 minutes
    });

  } catch (error) {
    console.error("Login Error:", error);
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

    // TẠO TOKEN XÁC THỰC
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(verificationToken).digest("hex");
    const verificationTokenExpires = Date.now() + 15 * 60 * 1000; // 15 phút

    const newUser = new User({
      username: normalizedUsername,
      email: normalizedEmail,
      password,
      name: name.trim(),
      displayName: normalizedUsername,
      verificationToken: hashedToken,
      verificationTokenExpires,
    });

    await newUser.save();

    // GỬI EMAIL
    try {
      await sendVerificationEmail(normalizedEmail, name.trim(), verificationToken);
    } catch (emailError) {
      console.error("Email send failed:", emailError);
      // Không fail đăng ký nếu email lỗi
    }

    const userObj = newUser.toObject();
    delete userObj.password;

    return res.status(201).json({
      message: "Registration successful! Please check your email to verify your account.",
      user: userObj,
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
