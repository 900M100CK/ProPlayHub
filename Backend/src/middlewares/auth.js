// middleware/auth.js
import jwt from "jsonwebtoken";
import Session from "../models/Session.js";
import User from "../models/User.js";

const auth = async (req, res, next) => {
  try {
    // 1. Lấy token từ header
    const authHeader = req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Access denied. No token provided." });
    }

    const token = authHeader.replace("Bearer ", "").trim();

    // 2. Xác minh token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token expired. Please refresh." });
      }
      return res.status(401).json({ message: "Invalid token." });
    }

    const userId = decoded.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Invalid token payload." });
    }

    // 3. Kiểm tra session còn hiệu lực không (tăng bảo mật)
    const session = await Session.findOne({
      userId,
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      return res.status(401).json({ message: "Session expired or revoked. Please login again." });
    }

    // 4. Gắn user vào request (không bao gồm password)
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(401).json({ message: "User not found." });
    }

    req.user = user;
    req.token = token;
    req.session = session;

    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error);
    return res.status(500).json({ message: "Server error during authentication." });
  }
};

export default auth;