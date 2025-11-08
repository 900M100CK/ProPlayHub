// utils/generateTokens.js
import jwt from "jsonwebtoken";
import crypto from "crypto";
import Session from "../models/Session.js";

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 604,800,000 mili-giây

export const generateTokens = async (userId) => {
  const accessToken = jwt.sign(
    { user: { id: userId } },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_TTL }
  );

  const refreshToken = crypto.randomBytes(64).toString("hex");

  // SỬA LỖI 1: Thay 'user.id' bằng 'userId' (tham số của hàm)
  await Session.create({
    userId: userId,
    refreshToken,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS) // Sử dụng biến đã định nghĩa
  });

  // SỬA LỖI 2: Xóa 'session' khỏi câu lệnh return
  return { accessToken, refreshToken };
};