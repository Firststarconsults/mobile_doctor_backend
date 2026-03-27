import express from "express";

const rootRouter = express.Router();



// Welcome message
rootRouter.get("/", (req, res) => {
    res.json({ message: "Welcome to Mobile Doctor authentication" });
  });





export default rootRouter