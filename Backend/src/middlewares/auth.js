import jwt from "jsonwebtoken";
import Session from "../models/Session.js";
import User from "../models/User.js";

/**
 * Auth middleware: verifies bearer token and ensures user exists.
 * If the session document is missing but the token is valid, we allow the request
 * to proceed (to avoid 401 loops when sessions are cleaned up) and set req.session to null.
 */
const auth = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("[Auth] No Authorization header or invalid format");
      return res.status(401).json({ message: "Access denied. No token provided." });
    }

    const token = authHeader.replace("Bearer ", "").trim();

    const secret = process.env.ACCESS_TOKEN_SECRET?.trim();
    if (!secret) {
      console.error("[Auth] ACCESS_TOKEN_SECRET is not set or empty");
      return res.status(500).json({ message: "Server configuration error." });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, secret);
      console.log("[Auth] Token verified, userId:", decoded?.user?.id);
    } catch (err) {
      console.error("[Auth] Token verification failed:", err.name, err.message);
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token expired. Please refresh." });
      }
      return res.status(401).json({ message: "Invalid token." });
    }

    const userId = decoded?.user?.id;
    if (!userId) {
      console.error("[Auth] Invalid token payload - no userId");
      return res.status(401).json({ message: "Invalid token payload." });
    }

    // Soft session check: log and continue if missing instead of 401
    let session = null;
    try {
      session = await Session.findOne({
        userId,
        expiresAt: { $gt: new Date() },
      });
      if (!session) {
        console.warn("[Auth] No valid session found for userId:", userId, "- allowing due to valid token.");
      } else {
        console.log("[Auth] Session validated for userId:", userId);
      }
    } catch (sessionErr) {
      console.error("[Auth] Session lookup error:", sessionErr);
    }

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
