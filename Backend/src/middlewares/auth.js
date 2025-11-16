// middleware/auth.js
import jwt from "jsonwebtoken";
import Session from "../models/Session.js";
import User from "../models/User.js";

const auth = async (req, res, next) => {
  try {
    // 1. Lấy token từ header
    const authHeader = req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ [Auth] No Authorization header or invalid format");
      return res.status(401).json({ message: "Access denied. No token provided." });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    console.log("🔍 [Auth] Token received:", token ? `${token.substring(0, 20)}...` : "NO TOKEN");

    // 2. Xác minh token
    let decoded;
    try {
      const secret = process.env.ACCESS_TOKEN_SECRET?.trim();
      if (!secret) {
        console.error("❌ [Auth] ACCESS_TOKEN_SECRET is not set or empty");
        return res.status(500).json({ message: "Server configuration error." });
      }
      
      decoded = jwt.verify(token, secret);
      console.log("✅ [Auth] Token verified, userId:", decoded.user?.id);
    } catch (err) {
      console.error("❌ [Auth] Token verification failed:", err.name, err.message);
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token expired. Please refresh." });
      }
      return res.status(401).json({ message: "Invalid token." });
    }

    const userId = decoded.user?.id;
    if (!userId) {
      console.error("❌ [Auth] Invalid token payload - no userId");
      return res.status(401).json({ message: "Invalid token payload." });
    }

    // 3. Kiểm tra session còn hiệu lực không (tăng bảo mật)
    const session = await Session.findOne({
      userId,
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      console.error("❌ [Auth] No valid session found for userId:", userId);
      return res.status(401).json({ message: "Session expired or revoked. Please login again." });
    }
    
    console.log("✅ [Auth] Session validated for userId:", userId);

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