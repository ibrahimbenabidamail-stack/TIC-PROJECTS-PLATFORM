import express from "express";
import db from "../db/database.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

router.get("/", (req, res) => {
  try {
    const projects = db.prepare(`
      SELECT 
        projects.id,
        projects.title,
        projects.description,
        projects.created_at,
        users.username as author_name,
        users.id as author_id
      FROM projects
      JOIN users ON projects.author_id = users.id
      ORDER BY projects.created_at DESC
    `).all();

    res.json({ projects });
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

router.get("/:id", (req, res) => {
  try {
    const project = db.prepare(`
      SELECT 
        projects.id,
        projects.title,
        projects.description,
        projects.created_at,
        users.username as author_name,
        users.id as author_id
      FROM projects
      JOIN users ON projects.author_id = users.id
      WHERE projects.id = ?
    `).get(req.params.id);

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.json({ project });
  } catch (error) {
    console.error("Error fetching project:", error);
    res.status(500).json({ error: "Failed to fetch project" });
  }
});

router.post("/", authenticateToken, (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: "Title and description are required" });
    }

    if (title.length < 3) {
      return res.status(400).json({ error: "Title must be at least 3 characters" });
    }

    if (description.length < 10) {
      return res.status(400).json({ error: "Description must be at least 10 characters" });
    }

    const result = db.prepare(
      "INSERT INTO projects (title, description, author_id) VALUES (?, ?, ?)"
    ).run(title, description, req.user.id);

    const project = db.prepare(`
      SELECT 
        projects.id,
        projects.title,
        projects.description,
        projects.created_at,
        users.username as author_name
      FROM projects
      JOIN users ON projects.author_id = users.id
      WHERE projects.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({
      message: "Project created successfully",
      project
    });
  } catch (error) {
    console.error("Error creating project:", error);
    res.status(500).json({ error: "Failed to create project" });
  }
});

router.put("/:id", authenticateToken, (req, res) => {
  try {
    const { title, description } = req.body;
    const projectId = req.params.id;

    const existingProject = db.prepare("SELECT * FROM projects WHERE id = ?").get(projectId);
    if (!existingProject) {
      return res.status(404).json({ error: "Project not found" });
    }

    if (existingProject.author_id !== req.user.id) {
      return res.status(403).json({ error: "You can only edit your own projects" });
    }

    if (!title || !description) {
      return res.status(400).json({ error: "Title and description are required" });
    }

    db.prepare("UPDATE projects SET title = ?, description = ? WHERE id = ?").run(title, description, projectId);

    const project = db.prepare(`
      SELECT 
        projects.id,
        projects.title,
        projects.description,
        projects.created_at,
        users.username as author_name
      FROM projects
      JOIN users ON projects.author_id = users.id
      WHERE projects.id = ?
    `).get(projectId);

    res.json({
      message: "Project updated successfully",
      project
    });
  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).json({ error: "Failed to update project" });
  }
});

router.delete("/:id", authenticateToken, (req, res) => {
  try {
    const projectId = req.params.id;

    const existingProject = db.prepare("SELECT * FROM projects WHERE id = ?").get(projectId);
    if (!existingProject) {
      return res.status(404).json({ error: "Project not found" });
    }

    if (existingProject.author_id !== req.user.id) {
      return res.status(403).json({ error: "You can only delete your own projects" });
    }

    db.prepare("DELETE FROM projects WHERE id = ?").run(projectId);

    res.json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error("Error deleting project:", error);
    res.status(500).json({ error: "Failed to delete project" });
  }
});

export default router;
