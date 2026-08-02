# On-Prem Deployment Guide (Client Local Server)

Deploy ESROM BirrBalance on a **Windows or Linux PC** at the client's site. Employees, waiters, and managers access the app from **phones, tablets, or PCs** on the same office Wi‑Fi/LAN.

**Running on your own PC first?** See **[deployment.local.md](./deployment.local.md)** for a step-by-step Docker guide.

---

## Architecture (Docker)

```
Phone / Tablet / PC  ──►  http://192.168.x.x/  (port 80)
                              │
                         ┌────▼────┐
                         │  nginx  │  reverse proxy (single entry point)
                         └────┬────┘
                    ┌─────────┴─────────┐
                    │                   │
              ┌─────▼─────┐       ┌─────▼─────┐
              │ frontend  │       │  backend  │
              │ React SPA │       │ Express   │
              └───────────┘       └─────┬─────┘
                                        │
                                  ┌─────▼─────┐
                                  │ PostgreSQL│
                                  └───────────┘
```

| Container | Role |
|-----------|------|
| **nginx** | Public entry on port 80 — routes `/` to frontend, `/api` and `/uploads` to backend |
| **frontend** | Serves the React app |
| **backend** | REST API, file uploads, cron jobs |
| **postgres** | Database (data persisted in Docker volume) |

---

## Step 1 — Prepare the client PC

### Requirements

- **Windows 10/11** or **Linux**
- **Docker Desktop** (Windows/Mac) or **Docker Engine + Compose** (Linux)
- **8 GB RAM** minimum (16 GB recommended)
- PC connected to office LAN with a **static local IP** (e.g. `192.168.1.50`)
- Port **80** available (or change `APP_PORT` in `.env`)

### Install Docker

- Windows: [Docker Desktop for Windows](https://docs.docker.com/desktop/setup/install/windows-install/)
- Linux: [Docker Engine](https://docs.docker.com/engine/install/) + [Compose plugin](https://docs.docker.com/compose/install/)

---

## Step 2 — Copy the project to the server PC

```bash
git clone https://github.com/FrehiwetZ/ESROM-BirrBalance-Management-System.git
cd ESROM-BirrBalance-Management-System
```

Or copy the project folder via USB/network share.

---

## Step 3 — Configure environment

```bash
cp .env.docker.example .env
```

Edit `.env` and set:

| Variable | Example | Notes |
|----------|---------|-------|
| `POSTGRES_PASSWORD` | Strong random password | Database password |
| `JWT_SECRET` | 32+ random characters | `openssl rand -base64 32` |
| `AES_SECRET` | 32+ random characters | QR encryption |
| `CORS_ORIGIN` | `http://192.168.1.50` | Server LAN IP (no trailing slash) |
| `APP_PORT` | `80` | Port users will open in browser |

Find the server IP:

- **Windows:** `ipconfig` → IPv4 Address  
- **Linux:** `ip addr` or `hostname -I`

---

## Step 4 — Build and start

```bash
docker compose up -d --build
```

First run takes several minutes (downloads images, builds app).

Check status:

```bash
docker compose ps
docker compose logs -f
```

All services should show **healthy** / **running**.

---

## Step 5 — Open from any device

On the same Wi‑Fi/LAN, open a browser and go to:

```
http://192.168.1.50/
```

(Replace with your server PC's IP.)

| Device | Browser |
|--------|---------|
| Phone | Chrome / Safari |
| Tablet | Chrome / Safari |
| PC | Chrome / Edge / Firefox |

**Tip:** Add to home screen on phones for app-like access (PWA).

---

## Step 6 — Create initial users

The database starts empty. Create the first **company manager** and employees via one of:

1. **Direct SQL** (after first deploy) — connect to Postgres and insert users  
2. **API** — use Postman collection in `backend/docs/`  
3. **Seed script** — run a one-off admin seed (see below)

### One-off seed container (optional)

```bash
docker compose exec backend node -e "
  console.log('Use Postman or company-manager API to create the first admin user.');
"
```

> **Recommendation:** Provide the client with a setup checklist: create company manager → departments → employees → cafés → menu → monthly allocations.

---

## Step 7 — Windows firewall

Allow inbound traffic on port 80 so LAN devices can connect:

1. **Windows Defender Firewall** → Advanced settings  
2. Inbound Rules → New Rule → Port → TCP **80** → Allow  
3. Scope: Private networks (domain/work/private)

---

## Daily operations

| Task | Command |
|------|---------|
| Start | `docker compose up -d` |
| Stop | `docker compose down` |
| Restart | `docker compose restart` |
| View logs | `docker compose logs -f backend` |
| Update app | `git pull && docker compose up -d --build` |
| Backup database | See [Backup](#backup--restore) below |

---

## Backup & restore

### Backup PostgreSQL

```bash
docker compose exec postgres pg_dump -U esrom esrom > backup_$(date +%Y%m%d).sql
```

### Backup uploaded menu images

```bash
docker compose run --rm -v esrom_uploads_data:/data -v ${PWD}:/backup alpine \
  tar czf /backup/uploads_backup.tar.gz -C /data .
```

### Restore database

```bash
cat backup_20260802.sql | docker compose exec -T postgres psql -U esrom esrom
```

---

## QR scanner on phones (HTTPS note)

Waiters scan employee QR codes using the **device camera**. Mobile browsers often require **HTTPS** for camera access (except `localhost`).

| Access URL | Camera on phone |
|------------|-----------------|
| `http://192.168.x.x/` | May **not** work on iPhone / some Android |
| `https://192.168.x.x/` | Works (needs SSL certificate) |

**Options for production:**

1. **HTTPS with self-signed cert** on nginx (users accept certificate once)  
2. **Internal DNS + Let's Encrypt** if the client has a domain  
3. **Waiter uses a PC/tablet** on the same network for QR scanning  

We can add an optional `docker-compose.https.yml` with self-signed SSL if needed.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Cannot open from phone | Check firewall, same Wi‑Fi, correct IP |
| `502 Bad Gateway` | `docker compose logs backend` — wait for migrations |
| Database connection error | `docker compose ps` — ensure postgres is healthy |
| Port 80 in use | Set `APP_PORT=8080` in `.env`, use `http://IP:8080/` |
| Images not loading | Ensure nginx `/uploads/` proxy is running |

---

## What to do next (full rollout checklist)

Use this as your project plan after Docker is running:

### Phase 1 — Infrastructure (you are here)

- [x] Dockerize backend, frontend, PostgreSQL, nginx  
- [ ] Deploy on client PC and verify LAN access  
- [ ] Configure static IP for server PC  
- [ ] Open firewall port 80  
- [ ] Set strong secrets in `.env`  
- [ ] (Optional) Enable HTTPS for mobile QR scanning  

### Phase 2 — Initial data setup

- [ ] Create company manager account  
- [ ] Create departments  
- [ ] Import/create employee accounts  
- [ ] Register partnered cafés  
- [ ] Assign café managers and waiters  
- [ ] Upload menus and item images  
- [ ] Set monthly meal balance allocations  

### Phase 3 — User onboarding

- [ ] Share login URL: `http://<server-ip>/`  
- [ ] Distribute employee IDs and temporary passwords  
- [ ] Train waiters on QR scan flow  
- [ ] Train café managers on order/menu management  
- [ ] Train company manager on reports and allocations  

### Phase 4 — Operations & maintenance

- [ ] Schedule daily/weekly database backups  
- [ ] Document restart procedure for client IT  
- [ ] Monitor disk space (uploads + database)  
- [ ] Plan update process (`git pull` + rebuild)  
- [ ] Test balance expiry cron (1st of month)  

### Phase 5 — Optional improvements

- [ ] HTTPS with self-signed or internal CA certificate  
- [ ] Admin seed script for first-run setup  
- [ ] Automated backup to external drive or NAS  
- [ ] Monitoring (Uptime Kuma, health check alerts)  
- [ ] Printer integration for kitchen orders  
- [ ] SMS notifications for low balance  

---

## File reference

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Orchestrates all services |
| `.env.docker.example` | Template for production secrets |
| `docker/nginx.conf` | Reverse proxy routing |
| `backend/Dockerfile` | API container |
| `frontend/Dockerfile` | SPA container |
| `backend/docker-entrypoint.sh` | Runs migrations then starts API |
