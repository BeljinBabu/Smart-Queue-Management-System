# Smart Appointment and Digital Token Management System (MEAN Stack)

Book appointments online, get a digital token instantly, and watch your position in the queue live.
Admins control the queue, manage services/slots and view analytics.

**Stack:** MongoDB · Express.js · Angular 19 · Node.js (JWT auth, bcrypt password hashing, REST API)

## Features

| User | Admin |
|------|-------|
| Register / login (JWT) | Dashboard: today's stats, 7-day chart, status & service-wise analytics |
| Pick service → date → free time slot | Queue control: **Call next token**, complete, skip, cancel |
| Digital token generated instantly (e.g. `GEN-004`) | Add / edit / delete services, working hours, slot length, working days |
| Live queue tracking: now serving, people ahead, estimated wait (auto-refresh 5 s) | View every appointment of any day |
| View history, reschedule, cancel | |

System logic: unique sequential token per service per day (atomic counter), double-booking prevention (unique partial index on service+date+slot), past/closed-day validation, 30-day booking window, one active booking per service per day per user.

## Prerequisites

* Node.js 18.19+ / 20.11+ / 22 and npm
* MongoDB running locally (default `mongodb://127.0.0.1:27017`) — or an Atlas URI

## Setup & run (development)

```bash
# 1. install dependencies for backend and frontend
npm run install:all

# 2. (optional) edit backend/.env  -> MONGO_URI, JWT_SECRET, PORT

# 3. load demo data (admin, users, services, sample queue)
npm run seed

# 4. start the API  (terminal 1)  -> http://localhost:5000
npm run backend

# 5. start Angular (terminal 2)   -> http://localhost:4200
npm run frontend
```

Open **http://localhost:4200**

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@smartappointment.com | Admin@123 |
| User  | user@smartappointment.com  | User@123 |

`npm run seed:reset` wipes the database and re-creates the demo data.

## Single-server (production-style) run

```bash
npm run start:prod      # builds Angular, then Express serves API + UI on http://localhost:5000
```

## Project structure

```
smart-appointment-mean/
├── backend/
│   ├── server.js            # Express app entry
│   ├── seed.js              # demo data
│   ├── config/db.js         # MongoDB connection
│   ├── models/              # User, Service, Appointment, Counter (Mongoose)
│   ├── routes/              # auth, services, appointments, admin
│   ├── middleware/          # JWT auth + role check, error handling
│   └── utils/               # date + slot generation helpers
└── frontend/
    ├── angular.json, package.json, proxy.conf.json
    └── src/app/
        ├── core/            # api service, auth service, interceptor, guards, models
        ├── layout/          # sidebar shell
        └── pages/           # login, register, dashboard, book, appointments, token,
                             # admin-dashboard, admin-queue, admin-services
```

## REST API summary

| Method | Endpoint | Access | Purpose |
|--------|----------|--------|---------|
| POST | /api/auth/register, /api/auth/login | public | create account / sign in |
| GET | /api/auth/me | user | current user |
| GET | /api/services | user | list services |
| POST/PUT/DELETE | /api/services[/:id] | admin | manage services |
| GET | /api/appointments/slots?serviceId=&date= | user | slot availability |
| POST | /api/appointments | user | book + generate token |
| GET | /api/appointments/mine | user | my appointments |
| GET | /api/appointments/:id/queue | owner/admin | live queue status |
| PATCH | /api/appointments/:id/cancel, /reschedule | owner | cancel / reschedule |
| GET | /api/admin/appointments?date=&serviceId= | admin | day's queue |
| PATCH | /api/admin/queue/call-next | admin | call next token |
| PATCH | /api/admin/appointments/:id/status | admin | called / completed / skipped / cancelled |
| GET | /api/admin/stats | admin | analytics |

## Screenshots for your report (Chapter 3)

Figure 3.1 Login · 3.2 User dashboard · 3.3 Book appointment · 3.4 Token + live queue ·
3.5 Admin queue control · 3.6 Admin dashboard (analytics) · 3.7 MongoDB `appointments` collection · 3.8 MongoDB `users` collection
(Use MongoDB Compass on `smart_appointment`.)
