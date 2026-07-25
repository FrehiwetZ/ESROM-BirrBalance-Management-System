# ESROM BirrBalance Management System

## Overview

ESROM BirrBalance is a complete full-stack employee meal balance and cafeteria management platform designed for organizations that provide meal allowances to employees through partnered cafés.

The system replaces paper-based vouchers and manual balance tracking with a secure QR-code powered platform that enables employees, waiters, café managers, and company administrators to manage the complete meal lifecycle from allocation to reporting.

This repository contains both the frontend and backend applications.

---

# Table of Contents

1. Introduction
2. Features
3. System Roles
4. Technology Stack
5. Project Architecture
6. Folder Structure
7. Installation
8. Environment Variables
9. Running the Project
10. API Overview
11. Security
12. QR Ordering Flow
13. Reports
14. Deployment
15. Development Guidelines
16. Team
17. License

---

# Introduction

The platform allows companies to allocate monthly meal balances to employees. Employees use QR codes to purchase meals from authorized cafés. Every transaction is validated, recorded, and reported in real time while maintaining audit logs and secure authentication.

The application consists of:

- React frontend
- Express.js backend
- Prisma ORM
- PostgreSQL database
- JWT authentication
- QR code encryption
- File upload support
- Reporting system
- Role-based authorization

---

# Features

## Authentication

- JWT Authentication
- Secure password hashing
- Role-based authorization
- Refresh tokens
- Session validation

## Employee Portal

- Dashboard
- QR Code
- Balance history
- Transactions
- Notifications
- Profile management
- Feedback

## Waiter Portal

- QR scanning
- Offline order processing
- Password verification
- Order confirmation

## Café Manager

- Menu management
- Image uploads
- Statistics
- Order monitoring

## Company Manager

- Employee management
- Monthly allocations
- Reports
- Audit logs
- Refund management

---

# System Roles

| Role | Responsibilities |
|------|------------------|
| Employee | View balance, order meals, feedback |
| Waiter | Scan QR, verify employee, process orders |
| Café Manager | Manage menu and café |
| Company Manager | Manage employees and reports |

---

# Technology Stack

## Frontend

- React
- Vite
- TypeScript
- Tailwind CSS
- React Router
- Axios

## Backend

- Node.js
- Express.js
- Prisma
- PostgreSQL
- JWT
- Multer
- bcrypt
- crypto
- node-cron

---

# Project Architecture

```text
Employee
   │
 QR Code
   │
Frontend (React)
   │
REST API
   │
Express Server
   │
Prisma ORM
   │
PostgreSQL
```

---

# Folder Structure

```text
project/
├── frontend/
├── backend/
├── prisma/
├── docs/
├── public/
├── src/
├── uploads/
└── README.md
```

---

# Installation

```bash
git clone <repository-url>
cd project
npm install
```

Frontend

```bash
cd frontend
npm install
npm run dev
```

Backend

```bash
cd backend
npm install
npm run dev
```

---

# Environment Variables

DATABASE_URL=
JWT_SECRET=
AES_SECRET=
PORT=
CORS_ORIGIN=

---

# API Overview

Authentication

- POST /login
- POST /refresh
- POST /logout

Employees

- GET /employee/profile
- GET /employee/orders

Orders

- POST /orders
- PATCH /orders/:id/status
- POST /orders/:id/refund

Reports

- XLSX
- PDF
- CSV

---

# Security

- AES QR encryption
- JWT authentication
- Password hashing
- Audit logging
- Input validation
- Protected routes

---

# QR Ordering Flow

1. Employee opens QR.
2. Waiter scans QR.
3. System validates.
4. Password verification.
5. Order created.
6. Balance deducted.
7. Receipt stored.
8. Reports updated.

---

# Reports

- Daily
- Weekly
- Monthly
- Employee
- Café
- Company

Export:

- Excel
- PDF
- CSV

---

# Deployment

Production requirements:

- Node.js 18+
- PostgreSQL
- Reverse proxy
- HTTPS
- Environment variables configured

---

# Development Guidelines

- Use feature branches.
- Never commit secrets.
- Run Prisma migrations before deployment.
- Keep API documentation updated.
- Test changes before merging.

---

# Team

Eyob

---

# License

Private commercial software. Unauthorized copying or redistribution is prohibited.
