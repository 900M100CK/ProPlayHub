import bcrypt from "bcrypt";
import User from "../models/User.js"; 
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
    // res.cookie('refreshToken', refreshToken, {
    //   httpOnly: true, // Prevents XSS attacks
    //   secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    //   sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // ✅ IMPROVED: lax for development
    //   maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    // });
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true, // Prevents XSS attacks
      secure: true, // Set to true if using HTTPS
      sameSite: 'none', // Adjust as needed
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    

    // Prepare user object without password
    const userObj = user.toObject();
    delete userObj.password;

    return res.status(200).json({
      message: "User logged in successfully",
      accessToken,
      user: userObj,
      expiresIn: process.env.ACCESS_TOKEN_TTL, // 15 minutes (should match ACCESS_TOKEN_TTL)
    });

  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const register = async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      name,
      displayName,
      age,
      location,
      address,
      gamingPlatformPreferences,
    } = req.body;

    // Validate required fields
    const required = { username, email, password, name, displayName, age, location, address, gamingPlatformPreferences };
    const missing = Object.keys(required).find((key) => !required[key]);
    if (missing) {
      return res.status(400).json({ message: `Please provide ${missing}.` });
    }

    // ✅ ADDED: Validate gamingPlatformPreferences is an array
    if (!Array.isArray(gamingPlatformPreferences) || gamingPlatformPreferences.length === 0) {
      return res.status(400).json({ 
        message: "gamingPlatformPreferences must be a non-empty array." 
      });
    }

    // ✅ ADDED: Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ 
        message: "Password must be at least 8 characters long." 
      });
    }

    // Normalize username and email
    const normalizedUsername = username.toLowerCase().trim();
    const normalizedEmail = email.toLowerCase().trim();

    // Check for existing user
    const existingUser = await User.findOne({
      $or: [{ username: normalizedUsername }, { email: normalizedEmail }],
    });

    if (existingUser) {
      const field = existingUser.username === normalizedUsername ? "Username" : "Email";
      return res.status(400).json({ message: `${field} already in use.` });
    }

    // Create new user (password will be hashed by pre-save hook)
    const newUser = new User({
      username: normalizedUsername,
      email: normalizedEmail,
      password, // Will be hashed automatically
      name: name.trim(),
      displayName: displayName.trim(),
      age: Number(age),
      location: location.trim(),
      address: address.trim(),
      gamingPlatformPreferences,
    });

    await newUser.save();

    // Prepare response without password
    const userObj = newUser.toObject();
    delete userObj.password;

    return res.status(201).json({
      message: "User registered successfully. Please login to continue.",
      user: userObj,
    });

  } catch (error) {
    // Handle validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message).join(", ");
      return res.status(400).json({ message: "Validation failed", details: messages });
    }

    // Handle duplicate key errors
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