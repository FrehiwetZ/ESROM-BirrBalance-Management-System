# Local Docker Deployment (Your PC)

Step-by-step guide to run **ESROM BirrBalance** on your Windows PC using Docker. Once running, you can open the app in a browser on your PC, phone, or tablet (same Wi‑Fi).

For client on-prem rollout (firewall, backups, HTTPS), see [DEPLOYMENT.md](./DEPLOYMENT.md).

---

## Step 0 — What you need

- **Docker Desktop** installed and **running** (whale icon in the system tray)
- This project folder on your PC, for example:

  ```
  C:\Users\YEAB\Desktop\projects and practices\ERSOM\ESROM-BirrBalance-Management-System
  ```

Check Docker in PowerShell:

```powershell
docker --version
docker compose version
```

If you see an error like *"cannot find the file specified"* → open **Docker Desktop** and wait until it says **Running**.

---

## Step 1 — Open the project folder

```powershell
cd "C:\Users\YEAB\Desktop\projects and practices\ERSOM\ESROM-BirrBalance-Management-System"
```

---

## Step 2 — Create the `.env` file (project root)

Docker reads configuration from a `.env` file in the **project root** (not `backend\.env`).

```powershell
copy .env.docker.example .env
notepad .env
```

Edit these values:

```env
POSTGRES_USER=esrom
POSTGRES_PASSWORD=MyStrongPassword123!
POSTGRES_DB=esrom

JWT_SECRET=my-jwt-secret-must-be-at-least-32-characters-long
AES_SECRET=my-aes-secret-must-be-at-least-32-characters-long
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=30d

APP_PORT=80
CORS_ORIGIN=http://192.168.1.50
```

| Variable | What to put |
|----------|-------------|
| `POSTGRES_PASSWORD` | Any strong password you choose |
| `JWT_SECRET` / `AES_SECRET` | At least **32 characters** each |
| `CORS_ORIGIN` | Your PC’s LAN IP (see Step 3) |
| `APP_PORT` | `80` (default). If port 80 is busy, use `8080` |

Save and close Notepad.

> **Note:** `.env` is listed in `.gitignore` — never commit secrets to Git.

---

## Step 3 — Find your PC’s IP address

```powershell
ipconfig
```

Look for **IPv4 Address** under your Wi‑Fi or Ethernet adapter, for example:

```
192.168.1.50
```

Update `.env`:

```env
CORS_ORIGIN=http://192.168.1.50
```

If you use `APP_PORT=8080`, users will open `http://192.168.1.50:8080/`.

---

## Step 4 — Build and start all containers

The first run takes **5–15 minutes** (downloads images and builds the app).

```powershell
docker compose up -d --build
```

Or use the helper script:

```powershell
.\scripts\deploy.ps1
```

This starts four containers:

| Container | Role |
|-----------|------|
| `postgres` | Database |
| `backend` | REST API |
| `frontend` | React app |
| `nginx` | Web entry point (port 80) |

---

## Step 5 — Check that everything is running

```powershell
docker compose ps
```

All services should show **running**. The backend may show **healthy** after ~30 seconds.

View logs if something fails:

```powershell
docker compose logs -f
```

Press `Ctrl+C` to stop following logs.

Backend logs only:

```powershell
docker compose logs backend
```

---

## Step 6 — Open the app in your browser

**On the same PC:**

```
http://localhost/
```

Or with your LAN IP:

```
http://192.168.1.50/
```

**From a phone or tablet (same Wi‑Fi):**

```
http://192.168.1.50/
```

You should see the **login page**.

---

## Step 7 — Allow Windows Firewall (for phones/tablets)

If it works on the PC but not on a phone:

1. **Windows Security** → **Firewall & network protection**
2. **Advanced settings** → **Inbound Rules** → **New Rule**
3. **Port** → **TCP** → **80** (or **8080** if you changed `APP_PORT`)
4. **Allow** → **Private** networks only → Finish

---

## Step 8 — Create your first user

The database starts **empty**. There is no default login yet.

Options:

1. Use **Postman** with `backend/docs/ESROM-BirrBalance.postman_collection.json`
2. Run a seed/admin setup script (if provided by your team)
3. Insert the first company manager via the API or database

Until a user exists, login will fail — that is expected.

---

## Daily commands

| Task | Command |
|------|---------|
| Start | `docker compose up -d` |
| Stop | `docker compose down` |
| Restart | `docker compose restart` |
| Rebuild after code changes | `docker compose up -d --build` |
| Status | `docker compose ps` |
| Logs | `docker compose logs -f` |
| Stop and remove all data ⚠️ | `docker compose down -v` |

---

## Troubleshooting

### Port 80 already in use

Edit `.env`:

```env
APP_PORT=8080
```

Then:

```powershell
docker compose down
docker compose up -d --build
```

Open: `http://localhost:8080/`

### `502 Bad Gateway`

The backend may still be starting or running migrations:

```powershell
docker compose logs backend
```

Wait 1–2 minutes, then refresh the browser.

### `POSTGRES_PASSWORD is missing`

You need `.env` in the **project root**, not only `backend\.env`:

```powershell
copy .env.docker.example .env
```

### Docker not running

Open **Docker Desktop** and wait until it shows **Running**, then run:

```powershell
docker compose up -d --build
```

### Build fails

```powershell
docker compose down
docker compose build --no-cache
docker compose up -d
```

---

## Quick copy-paste

```powershell
cd "C:\Users\YEAB\Desktop\projects and practices\ERSOM\ESROM-BirrBalance-Management-System"
copy .env.docker.example .env
notepad .env
# Edit passwords and CORS_ORIGIN, then save

docker compose up -d --build
docker compose ps
```

Then open **http://localhost/** in your browser.

---

## What runs under the hood

```
Your browser  →  nginx (port 80)  →  frontend (React)
                                 →  backend (API)  →  postgres (DB)
```

You only need **one URL** in the browser. Nginx routes `/api` and `/uploads` to the backend automatically.

---

## Related docs

- [DEPLOYMENT.md](./DEPLOYMENT.md) — client server rollout, backups, HTTPS for QR camera
- [../README.md](../README.md) — project overview
- [../.env.docker.example](../.env.docker.example) — environment template
