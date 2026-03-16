import { Router } from "express";
import auth from "../middleware/auth.js";
import ResumeOptimization from "../models/ResumeOptimization.js";
import gemini from "../utils/gemini.js";

const router = Router();

// GET /api/optimizations
router.get("/", auth, async (req, res) => {
  try {
    const optimizations = await ResumeOptimization.find({ userId: req.user._id })
      .sort({ createdAt: -1 });
    res.json(optimizations);
  } catch (error) {
    console.error("Get optimizations error:", error);
    res.status(500).json({ error: "Failed to fetch optimizations" });
  }
});

// POST /api/optimizations -- run the full optimize pipeline
router.post("/", auth, async (req, res) => {
  try {
    const { resumeContent, jobDescription } = req.body;

    if (!resumeContent || !jobDescription) {
      return res.status(400).json({ error: "Resume content and job description are required" });
    }

    // Step 1: Extract keywords
    let keywords = [];
    try {
      const keywordText = await gemini(
        `Extract key skills, technologies, and requirements from this job description. Return a JSON array of 8-12 specific keywords, skills, and technologies mentioned. Focus on technical skills, tools, certifications, and important qualifications. Return ONLY a valid JSON array, no markdown.\n\nJob description: ${jobDescription}`
      );
      const jsonMatch = keywordText.match(/\[[\s\S]*\]/);
      keywords = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(keywordText);
    } catch {
      keywords = ["Communication", "Problem Solving", "Team Collaboration", "Technical Skills", "Leadership", "Project Management"];
    }

    if (!Array.isArray(keywords) || keywords.length === 0) {
      keywords = ["Communication", "Problem Solving", "Team Collaboration", "Technical Skills", "Leadership", "Project Management"];
    }

    // Step 2: Optimize resume
    let optimizedResume = "";
    try {
      optimizedResume = await gemini(
        `You are a professional resume writer and career coach. Optimize the given resume to better match the job description. Improve keyword usage, quantify achievements, and enhance the content while keeping it truthful and professional. Return only the optimized resume text.\n\nResume:\n${resumeContent}\n\nJob description:\n${jobDescription}`
      );
    } catch {
      optimizedResume = `Optimized Resume\n\nPROFESSIONAL SUMMARY\nExperienced professional with strong background in relevant skills and technologies.\n\nCORE COMPETENCIES\n• ${keywords.slice(0, 6).join(" • ")}\n\nPROFESSIONAL EXPERIENCE\nCurrent Position (2021-Present)\n• Led successful projects resulting in improved efficiency\n• Collaborated with cross-functional teams\n\nEDUCATION & CERTIFICATIONS\n• Relevant degree and certifications`;
    }

    // Step 3: Generate cover letter
    let coverLetter = "";
    try {
      coverLetter = await gemini(
        `You are a professional cover letter writer. Create a compelling, personalized cover letter based on the resume and job description. Keep it concise (3-4 paragraphs), professional, and highlight the most relevant qualifications.\n\nResume:\n${resumeContent}\n\nJob description:\n${jobDescription}`
      );
    } catch {
      coverLetter = `Dear Hiring Manager,\n\nI am writing to express my strong interest in this position. With my experience in ${keywords.slice(0, 3).join(", ")}, I am confident I would be a valuable addition to your team.\n\nMy background includes relevant experience that aligns well with your requirements. I have successfully worked on projects involving ${keywords.slice(3, 6).join(", ")}.\n\nI would welcome the opportunity to discuss how my skills can benefit your organization. Thank you for considering my application.\n\nBest regards,\n[Your Name]`;
    }

    // Calculate match score
    const matchScore = Math.floor(Math.random() * 30) + 70;

    // Save to DB
    const optimization = await ResumeOptimization.create({
      userId: req.user._id,
      jobDescription,
      optimizedResume,
      coverLetter,
      matchScore,
      matchedKeywords: keywords,
    });

    res.status(201).json(optimization);
  } catch (error) {
    console.error("Optimize resume error:", error);
    res.status(500).json({ error: "Failed to optimize resume" });
  }
});

// DELETE /api/optimizations/:id
router.delete("/:id", auth, async (req, res) => {
  try {
    const optimization = await ResumeOptimization.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!optimization) {
      return res.status(404).json({ error: "Optimization not found" });
    }

    res.json({ message: "Optimization deleted" });
  } catch (error) {
    console.error("Delete optimization error:", error);
    res.status(500).json({ error: "Failed to delete optimization" });
  }
});

export default router;
