import { Router } from "express";
import auth from "../middleware/auth.js";
import Resume from "../models/Resume.js";

const router = Router();

// GET /api/resumes
router.get("/", auth, async (req, res) => {
  try {
    const resumes = await Resume.find({ userId: req.user._id })
      .sort({ createdAt: -1 });
    res.json(resumes);
  } catch (error) {
    console.error("Get resumes error:", error);
    res.status(500).json({ error: "Failed to fetch resumes" });
  }
});

// POST /api/resumes
router.post("/", auth, async (req, res) => {
  try {
    const { title, content, fileType } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    const resume = await Resume.create({
      userId: req.user._id,
      title,
      content: content || null,
      fileType: fileType || null,
    });

    res.status(201).json(resume);
  } catch (error) {
    console.error("Create resume error:", error);
    res.status(500).json({ error: "Failed to create resume" });
  }
});

// DELETE /api/resumes/:id
router.delete("/:id", auth, async (req, res) => {
  try {
    const resume = await Resume.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!resume) {
      return res.status(404).json({ error: "Resume not found" });
    }

    res.json({ message: "Resume deleted" });
  } catch (error) {
    console.error("Delete resume error:", error);
    res.status(500).json({ error: "Failed to delete resume" });
  }
});

export default router;
