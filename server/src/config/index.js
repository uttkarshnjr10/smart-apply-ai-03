import dotenv from "dotenv";
dotenv.config();

const config = {
  port: parseInt(process.env.PORT || "5000", 10),
  mongodbUri: process.env.MONGODB_URI || "mongodb://localhost:27017/smart-apply-ai",
  jwtSecret: process.env.JWT_SECRET || "fallback-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  geminiApiKey: process.env.GOOGLE_GEMINI_API_KEY || "",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:8080",
};

export default config;
