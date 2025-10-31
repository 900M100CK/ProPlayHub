import express from "express";

const router = express.Router();

router.get("/login", async(req, res)=>{
    res.send("login route");
});

router.get("/register", async(req, res)=>{
    res.send("register route");
});


export default router;