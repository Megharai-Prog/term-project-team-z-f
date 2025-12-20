// backend/routes/quick-play.ts
import express from "express";
import { requireUser } from "../middleware";

const router = express.Router();

router.get("/", requireUser, (request, response) => {
  const { user } = request.session;
  response.render("quick-play/quick-play", { user });
});

export default router;