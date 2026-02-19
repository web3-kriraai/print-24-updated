import express from "express";
import { startSessionHandler, extendSessionHandler, completeSessionHandler, getSessionHandler, addArtifactHandler, getArtifactsHandler } from "../controllers/session.controller.js";

const router = express.Router();

// Matches GET /api/session/:id (get session details)
router.get("/:id", getSessionHandler);

// Matches POST /api/session/start (body: sessionId)
router.post("/start", startSessionHandler);

// Matches POST /api/session/:id/start (optional, redirects to handler)
router.post("/:id/start", (req, res, next) => {
    req.body.sessionId = req.params.id;
    startSessionHandler(req, res, next);
});

// Matches POST /api/session/:id/extend
router.post("/:id/extend", extendSessionHandler);

// Matches POST /api/session/:id/complete
router.post("/:id/complete", completeSessionHandler);

// Artifacts (Notes, Chat)
router.post("/:id/artifact", addArtifactHandler);
router.get("/:id/artifacts", getArtifactsHandler);

// Pause/Resume (Manual/Testing)
router.post("/:id/pause", (await import("../controllers/session.controller.js")).pauseSessionHandler);
router.post("/:id/resume", (await import("../controllers/session.controller.js")).resumeSessionHandler);

export default router;
