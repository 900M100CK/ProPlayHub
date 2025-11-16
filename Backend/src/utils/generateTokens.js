// utils/generateTokens.js
import jwt from "jsonwebtoken";
import crypto from "crypto";
import Session from "../models/Session.js";

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 604,800,000 mili-giây

export const generateTokens = async (userId) => {
  // Ensure ACCESS_TOKEN_SECRET is trimmed (remove spaces)
  const secret = process.env.ACCESS_TOKEN_SECRET?.trim();
  if (!secret) {
    throw new Error("ACCESS_TOKEN_SECRET is not set in environment variables");
  }

  // Ensure ACCESS_TOKEN_TTL is trimmed and has default value
  const ttl = process.env.ACCESS_TOKEN_TTL?.trim() || "3600"; // Default 1 hour if not set
  
  console.log("🔑 [GenerateTokens] Creating token for userId:", userId);
  console.log("🔑 [GenerateTokens] Token TTL:", ttl);

  const accessToken = jwt.sign(
    { user: { id: userId } },
    secret,
    { expiresIn: ttl }
  );

  const refreshToken = crypto.randomBytes(64).toString("hex");

  // Create session in database
  await Session.create({
    userId: userId,
    refreshToken,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS) // 7 days
  });

  console.log("✅ [GenerateTokens] Tokens generated and session created");

  return { accessToken, refreshToken };
};