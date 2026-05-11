ushawty — DevOps Presentation
This repository contains a small web application (frontend + backend) and a complete DevOps pipeline demonstrating containerization, CI/CD, blue/green deployment, health checks, and rollback strategies. The README below is written to present the project as a DevOps showcase rather than purely a backend codebase.

Project Goal: Show a practical end-to-end DevOps workflow: build, test, package (Docker), push images, and deploy to a production host with safe rollout and automated validation.

Technologies demonstrated

Docker & multi-stage builds (frontend + backend)
docker-compose for local orchestration
GitHub Actions for CI and automated image build/push
Docker Hub as image registry (configurable via secrets)
SSH-based deployment to an EC2 host with blue/green strategy and rollback
Automated health checks, smoke tests, and runtime validation
Unit testing (Jest/Vitest) and linting as CI quality gates
Repository layout

client/: Frontend (Vite + React) and its Dockerfile (multi-stage build)
server/: Backend (Node/Express) and its Dockerfile
docker-compose.yml: local orchestration of frontend + backend
.github/workflows/ci.yml: CI pipeline (test → build images → push → deploy)
Architecture & Flow

Developers push to main → GitHub Actions runs CI.
CI jobs run frontend and backend unit tests.
On success, CI builds Docker images for frontend and backend and pushes them to Docker Hub.
CI then SSHs to an EC2 host and performs a blue/green deployment using the pushed images. The deploy script:
pulls new images
runs them in new ports (new slot)
runs health checks and smoke tests (API and frontend reachability)
swaps NGINX proxy to route traffic to the new slot
validates live endpoints and monitors for delayed crashes
rolls back automatically if checks fail
Docker & docker-compose

server/Dockerfile uses a single-stage Node image optimized for production.
client/Dockerfile uses a multi-stage build: build with Node then serve static files with NGINX.
docker-compose.yml defines backend and frontend services and maps ports for local development:
Backend: 5000
Frontend: 3000 → 80 inside container
Local development

Start both services locally with:

docker-compose up --build

Run backend tests:

cd server && npm test

Run frontend tests:

cd client && npm test

CI/CD (GitHub Actions)

The workflow file is at .github/workflows/ci.yml and includes the following stages:
test-backend — sets up Node, installs dependencies, runs Jest tests in server.
test-frontend — sets up Node, installs dependencies, runs frontend tests in client.
build-images — uses Docker Buildx to build backend and frontend images and pushes them to Docker Hub. Requires DOCKER_USERNAME and DOCKER_PASSWORD secrets.
deploy — SSH to the target host using EC2_HOST, EC2_USER, and EC2_SSH_KEY secrets and runs a deployment script that implements blue/green deployment, health checks, smoke tests, and automated rollback.
Deployment strategy (blue/green with automated validation)

The deployment step runs new containers on alternate ports (slot-based) and waits for:
successful backend health endpoint responses
frontend HTTP 200 responses
successful API smoke tests (e.g., create a short link and validate redirect)
If any checks fail, the script stops the new containers and does not switch traffic. If checks pass, NGINX proxy rules are updated and reloaded to point to the new slot.
The script also performs extended monitoring for delayed crashes and will roll back if problems are detected during that window.
Security & secrets

CI requires the following secrets configured in GitHub:
DOCKER_USERNAME, DOCKER_PASSWORD for pushing images
EC2_HOST, EC2_USER, EC2_SSH_KEY (private key) for SSH deploy
Best practices to highlight in the presentation:
Rotate secrets and use least-privilege keys for deployment user
Use ephemeral tokens where possible (or a private container registry with fine-grained access)
Limit SSH access by IP / use bastion for production hosts
Observability & validation

Health checks: backend exposes /health and the deployment validates it before switching traffic.
Smoke tests: CI deploy runs a small API workflow verifying core functionality (create & redirect flows).
Monitoring suggestion: integrate a lightweight observability stack (Prometheus + Grafana or a SaaS like Datadog) to capture metrics and alert on failures.
Testing & quality gates

Backend: Jest + Supertest are used for unit & integration tests (see server/package.json).
Frontend: Vitest + ESLint configured in client for tests and linting.
CI gates mergeability: tests run in CI before images are built and pushed.
Where to look in the repo

CI workflow: .github/workflows/ci.yml
Local orchestration: docker-compose.yml
Backend Dockerfile: server/Dockerfile
Frontend Dockerfile: client/Dockerfile
Presenting tips

Focus your talk on the pipeline (test → build → push → deploy) rather than code details.
Highlight the blue/green deployment script as a simple, effective method for zero-downtime deployments with automated rollback logic.
Show how local docker-compose mirrors production containers and how CI builds the same images the deployment uses.
Next steps / improvements

Replace SSH-based deploy with a container orchestrator (ECS/EKS) for scalability.
Add automated image scanning in CI for vulnerabilities.
Add metrics & alerting integration for production monitoring.
Contact / credits

This repository is intended for demonstration. Reach out to the maintainer for details or to extend the pipeline.
