Hosting the Backend (Render / Railway / Fly.io)
===============================================

This document describes quick options to host the Flask backend so the frontend can authenticate and call the API from the deployed site.

Common steps (applies to Render, Railway, Fly.io and other Docker-capable hosts)

1. Build a Docker image (the repository includes `backend/Dockerfile`).

   Example (local build):

   ```bash
   cd backend
   docker build -t commerce-dashboard-backend:latest .
   docker run -p 5000:5000 commerce-dashboard-backend:latest
   ```

2. Environment variables to set on the host/service

   - `DATABASE_URL` (optional) — e.g. `postgres://user:pass@host:5432/db`
   - `SECRET_KEY` — Flask secret
   - `JWT_SECRET_KEY` — JWT signing secret
   - `HOST` (default `0.0.0.0`) and `PORT` (default `5000`)
   - `UPLOAD_FOLDER`, `REPORTS_FOLDER` (optional)

3. Run command

   The Docker image uses Gunicorn and the application factory `app:create_app()`.

   If your host requires an explicit start command, use:

   ```bash
   gunicorn -w 2 -b 0.0.0.0:5000 "app:create_app()"
   ```

Render (managed Docker)
------------------------

- Create a new Web Service on Render and select "Docker" as deployment method.
- Connect your GitHub repo and choose the `backend` folder (or root Dockerfile path).
- Set the environment variables listed above in the Render dashboard.
- Deploy — Render will build the image and run the container.

Railway (quick deploy)
----------------------

- Create a new project and choose "Deploy from GitHub". Select the backend folder.
- If Railway doesn't detect the runtime, add a `Dockerfile` (already present).
- Set environment variables in Railway and deploy.

Fly.io
------

- Initialize with `flyctl launch` in the `backend` folder and follow the prompts.
- Set secrets with `flyctl secrets set SECRET_KEY=... JWT_SECRET_KEY=...`

Notes
-----
- After you have a public URL (e.g. `https://my-backend.onrender.com`), update the frontend production environment variable `VITE_API_URL` to point to `https://my-backend.onrender.com/api` and rebuild the frontend.
- For SSL, managed platforms like Render/Railway/Fly provide TLS by default.

CI / GitHub Container Registry (optional)
---------------------------------------

You can publish a Docker image to GitHub Container Registry (GHCR) and optionally connect it to other platforms.

- The repository includes a GitHub Actions workflow `.github/workflows/build-and-push-backend.yml` that builds the `backend/Dockerfile` and publishes images to `ghcr.io/${{ github.repository_owner }}/commerce-dashboard-backend:latest` on pushes to `main`.
- Ensure the Actions runner has `packages: write` permission (the workflow sets this) and that `GITHUB_TOKEN` has package write rights for the organization/user.

Deploying to Render from GHCR
----------------------------

- On Render you can create a new service using a Docker image and specify the GHCR image path.
- Alternatively Render can deploy directly from the GitHub repository (select the backend folder) which removes the need to push to GHCR.

