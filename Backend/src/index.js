import "dotenv/config";
import express from "express";

import authRoutes from "./route/authRoutes.js";


const app = express();
const PORT = process.env.PORT || 3000;

app.use("/api/auth", authRoutes);

app.listen(PORT, () => {
    // console.log("Server is running on port" , PORT);
    console.log(`Server is running on port ${PORT}`);
});