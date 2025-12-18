import express from "express";
import db from "../db/database.js";
import { authenticateToken } from "../middleware/auth.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const router = express.Router();

/* ---------------- PATH FIX (ES MODULE SAFE) ---------------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ---------------- UPLOADS FOLDER ---------------- */
const uploadDir = path.join(__dirname, "..", "public", "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/* ---------------- MULTER CONFIG ---------------- */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, "project-" + uniqueName + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

/* ---------------- GET ALL PROJECTS ---------------- */
router.get("/", (req, res) => {
  try {
    const projects = db.prepare(`
      SELECT
        projects.id,
        projects.title,
        projects.description,
        projects.created_at,
        users.username AS author_name,
        users.id AS author_id,
        project_files.file_path
      FROM projects
      JOIN users ON users.id = projects.author_id
      LEFT JOIN project_files ON project_files.project_id = projects.id
      ORDER BY projects.created_at DESC
    `).all();

    res.json({ projects });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load projects" });
  }
});

/* ---------------- GET SINGLE PROJECT ---------------- */
router.get("/:id", (req, res) => {
  try {
    const project = db.prepare(`
      SELECT
        projects.id,
        projects.title,
        projects.description,
        projects.created_at,
        users.username AS author_name,
        users.id AS author_id,
        project_files.file_path
      FROM projects
      JOIN users ON users.id = projects.author_id
      LEFT JOIN project_files ON project_files.project_id = projects.id
      WHERE projects.id = ?
    `).get(req.params.id);

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.json({ project });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch project" });
  }
});

/* ---------------- CREATE PROJECT (WITH FILE) ---------------- */
router.post(
  "/",
  authenticateToken,
  upload.single("file"),
  (req, res) => {
    try {
      const { title, description } = req.body;

      if (!title || !description) {
        return res.status(400).json({
          error: "Title and description are required"
        });
      }

      if (title.length < 3) {
        return res.status(400).json({
          error: "Title must be at least 3 characters"
        });
      }

      if (description.length < 10) {
        return res.status(400).json({
          error: "Description must be at least 10 characters"
        });
      }

      const result = db.prepare(`
        INSERT INTO projects (title, description, author_id)
        VALUES (?, ?, ?)
      `).run(title, description, req.user.id);

      const projectId = result.lastInsertRowid;

      if (req.file) {
        const filePath = `/uploads/${req.file.filename}`;
        db.prepare(`
          INSERT INTO project_files (project_id, file_path)
          VALUES (?, ?)
        `).run(projectId, filePath);
      }

      const project = db.prepare(`
        SELECT
          projects.id,
          projects.title,
          projects.description,
          projects.created_at,
          users.username AS author_name,
          project_files.file_path
        FROM projects
        JOIN users ON users.id = projects.author_id
        LEFT JOIN project_files ON project_files.project_id = projects.id
        WHERE projects.id = ?
      `).get(projectId);

      res.status(201).json({
        message: "Project created successfully",
        project
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to create project" });
    }
  }
);

/* ---------------- UPDATE PROJECT ---------------- */
router.put("/:id", authenticateToken, (req, res) => {
  try {
    const { title, description } = req.body;
    const projectId = req.params.id;

    const project = db
      .prepare("SELECT * FROM projects WHERE id = ?")
      .get(projectId);

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    if (project.author_id !== req.user.id) {
      return res.status(403).json({
        error: "You can only edit your own projects"
      });
    }

    db.prepare(`
      UPDATE projects
      SET title = ?, description = ?
      WHERE id = ?
    `).run(title, description, projectId);

    res.json({ message: "Project updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update project" });
  }
});

/* ---------------- DELETE PROJECT ---------------- */
router.delete("/:id", authenticateToken, (req, res) => {
  try {
    const projectId = req.params.id;

    const project = db
      .prepare("SELECT * FROM projects WHERE id = ?")
      .get(projectId);

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    if (project.author_id !== req.user.id) {
      return res.status(403).json({
        error: "You can only delete your own projects"
      });
    }

    db.prepare("DELETE FROM projects WHERE id = ?").run(projectId);
    db.prepare("DELETE FROM project_files WHERE project_id = ?").run(projectId);

    res.json({ message: "Project deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete project" });
  }
});

export default router;
