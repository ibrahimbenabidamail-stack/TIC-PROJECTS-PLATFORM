# TIC Projects Platform

## Overview
A complete student project management platform built with Node.js, Express, and SQLite. Students can register, login, and submit/view projects.

## Project Structure
```
├── index.js              # Main Express server
├── package.json          # Dependencies and scripts
├── db/
│   └── database.js       # SQLite database setup
├── routes/
│   ├── auth.js          # Authentication routes (register/login)
│   └── projects.js      # Project CRUD routes
├── middleware/
│   └── auth.js          # JWT authentication middleware
├── public/
│   ├── index.html       # Homepage
│   ├── login.html       # Login page
│   ├── register.html    # Registration page
│   └── projects.html    # Projects listing and submission
└── replit.md            # This file
```

## Tech Stack
- **Backend**: Node.js + Express
- **Database**: SQLite (better-sqlite3)
- **Authentication**: bcrypt (password hashing) + JWT (tokens)
- **Frontend**: Vanilla HTML/CSS/JavaScript

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user (username, email, password)
- `POST /auth/login` - Login user (email/username + password)
- `GET /auth/me` - Get current user info (requires token)

### Projects
- `GET /projects` - List all projects
- `GET /projects/:id` - Get single project
- `POST /projects` - Create project (requires auth)
- `PUT /projects/:id` - Update project (owner only)
- `DELETE /projects/:id` - Delete project (owner only)

## Database Schema
- **users**: id, username, email, password (hashed), created_at
- **projects**: id, title, description, author_id, created_at
- **reviews**: id, project_id, reviewer_id, rating, comment, created_at

## Environment Variables
- `JWT_SECRET` - Secret key for JWT tokens (set in Secrets)
- `PORT` - Server port (defaults to 5000)

## Running the App
```bash
npm start
```
Server runs on port 5000.

## Recent Changes
- Dec 18, 2025: Initial MVP implementation
  - SQLite database with users, projects, and reviews tables
  - Full authentication with bcrypt + JWT
  - Projects CRUD with authorization
  - Modern responsive frontend with 4 pages
  - All features tested and working
