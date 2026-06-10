# Deployment & Integration Guide (部署與環境變數設定指南)

This document provides step-by-step instructions for hosting, configuring, and deploying the **Course Booking Application** in production and staging environments.

* **Main App Directory**: [booking-app](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app)
* **Design Specification**: [course-booking-app-complete-spec.md](file:///D:/Jeff/myStudy/antigravity/summer26/docs/superpowers/specs/course-booking-app-complete-spec.md)

---

## 1. Hosting on Vercel
The application is structured as a standard Next.js App Router project and is fully compatible with Vercel hosting.

### Step-by-Step Vercel Deployment:
1. **Import Repository**: Link your GitHub repository to Vercel.
2. **Configure Root Directory**: In the project settings on Vercel, set the **Root Directory** to `booking-app`.
3. **Build Settings**:
   * **Framework Preset**: Next.js
   * **Build Command**: `next build`
   * **Install Command**: `npm install`
4. **Environment Variables**: Configure the variables detailed below before triggering the deploy build.

---

## 2. Environment Variables Configuration

Configure the following environment variables in your Vercel Dashboard under **Project Settings > Environment Variables**:

### Administrative Security
* `ADMIN_PASSWORD` *(Required)*: The secure plain-text password required to gain access to the teacher's administrative panel (`/admin/dashboard`).
  * *Example*: `SecurePassword123!`

### LINE Notifications Integration
* `CHAT_EVERYWHERE_TOKEN` *(Required)*: The Bearer token authorized to push notifications to the ChatEverywhere LINE Notify API.
  * *Endpoint used*: `https://v2.chateverywhere.app/api/line/notify`
  * *Example*: `ce_token_abcdef123456...`

### Upstash Redis Database Connection
The application is configured to automatically connect to an Upstash Redis instance when the following variables are present. If omitted in local development, it defaults to a local in-memory mock.
* **Option A: Primary Credentials (Recommended)**
  * `UPSTASH_REDIS_REST_URL`: The REST API URL provided in your Upstash console.
  * `UPSTASH_REDIS_REST_TOKEN`: The REST API Read/Write token.
* **Option B: Fallback Credentials**
  * `KV_REST_API_URL`
  * `KV_REST_API_TOKEN`

---

## 3. Staging and Local Verification

To run and verify the configuration locally before pushing to production:

1. Create a [booking-app/.env.local](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/.env.local) file.
2. Add the environment variables:
   ```env
   ADMIN_PASSWORD="local_test_password"
   CHAT_EVERYWHERE_TOKEN="mock_line_token"
   # Uncomment to test with live Upstash Redis:
   # UPSTASH_REDIS_REST_URL="https://your-db.upstash.io"
   # UPSTASH_REDIS_REST_TOKEN="your_token"
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

---

## 4. Production Security Practices

### Debug Database Route Guard
* The [route.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/api/debug/db/route.ts) endpoint dumps the current state of the mock database for diagnostics.
* **Security Guard**: This route evaluates `process.env.NODE_ENV === 'production'`. If true, it returns `403 Forbidden` immediately to prevent sensitive student records or telephone information from leaking.

### Admin Endpoint Authorization
* Every administrative handler under `app/api/admin/*` verifies the presence of the `x-admin-token` header matching `'admin_token_validated'` (established via successful login with `ADMIN_PASSWORD`).
* CORS and cookie validation rules should be managed at the reverse-proxy/Vercel configuration level if cross-origin booking panels are implemented.
