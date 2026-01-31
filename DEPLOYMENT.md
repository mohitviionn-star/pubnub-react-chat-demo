# Deployment Guide

This document describes how to deploy the PubNub React Chat Demo to production-style environments (e.g. for a demo or portfolio). The app has two parts: **client** (static React) and **server** (Node.js API + PubNub token issuance).

---

## Overview

| Part | Suggested platforms | Notes |
|------|--------------------|--------|
| **Client** | Vercel, Netlify, AWS S3 + CloudFront | Build: `npm run build` in `apps/client`; set `VITE_API_URL` to your server URL |
| **Server** | Railway, Render, AWS (ECS, Elastic Beanstalk, or Lambda + API Gateway) | Set `CORS_ORIGIN` to your client URL and configure PubNub env vars |

---

## 1. Deploy the server (Node.js API)

The server must run in an environment that supports Node.js and allows **environment variables** (for PubNub keys and CORS).

### Environment variables (server)

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port (often set by host) | `5050` or leave default |
| `CORS_ORIGIN` | Allowed origin for the frontend | `https://your-app.vercel.app` |
| `PUBNUB_PUBLISH_KEY` | From PubNub Admin | |
| `PUBNUB_SUBSCRIBE_KEY` | From PubNub Admin | |
| `PUBNUB_SECRET_KEY` | From PubNub Admin (keep secret) | |
| `PUBNUB_TOKEN_TTL_MINUTES` | Token lifetime | `60` |

### Option A: Railway

1. Connect your repo; select the **root** (monorepo) or the `apps/server` directory as the root for this service.
2. Set **Build Command**: `npm install` (or `cd apps/server && npm install` if root is repo root).
3. Set **Start Command**: `node src/index.js` or `npm run dev` / `npm start` from `apps/server`.
4. Add all environment variables above; set `CORS_ORIGIN` to your client URL.
5. Deploy; note the public URL (e.g. `https://your-app.railway.app`).

### Option B: Render

1. New **Web Service**; connect repo.
2. **Root Directory**: `apps/server` (if applicable).
3. **Build**: `npm install`
4. **Start**: `npm start` or `node src/index.js`
5. Add env vars in the Render dashboard; set `CORS_ORIGIN` to your client URL.

### Option C: AWS (Elastic Beanstalk or ECS)

- **Elastic Beanstalk**: Create a Node.js environment, upload or deploy from repo; set env vars in the EB console.
- **ECS**: Use a Dockerfile that runs `node src/index.js` (or `npm start`) from `apps/server`; pass env vars via task definition or Secrets Manager.

Ensure the security group allows inbound traffic on the port your app listens on (e.g. 8080 or 5050).

---

## 2. Deploy the client (React / Vite)

Build the client with the **production API URL** so it talks to your deployed server.

### Environment variable (client)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | `https://your-api.railway.app` |

Vite embeds `VITE_*` at build time; set this in the build environment (e.g. Vercel/Netlify env vars or CI).

### Option A: Vercel

1. Import the repo; set **Root Directory** to `apps/client` (if using monorepo).
2. **Framework Preset**: Vite.
3. **Build Command**: `npm run build`
4. **Output Directory**: `dist`
5. Add **Environment Variable**: `VITE_API_URL` = your server URL (e.g. `https://your-app.railway.app`).
6. Deploy. Use the generated URL (e.g. `https://your-chat.vercel.app`) as `CORS_ORIGIN` on the server if not already set.

### Option B: Netlify

1. Connect repo; **Base directory**: `apps/client`.
2. **Build command**: `npm run build`
3. **Publish directory**: `dist`
4. **Environment variables**: `VITE_API_URL` = your server URL.
5. Deploy; set the client URL as `CORS_ORIGIN` on the server.

### Option C: AWS (S3 + CloudFront)

1. Build locally with `VITE_API_URL` set:  
   `VITE_API_URL=https://your-api.example.com npm run build`
2. Upload contents of `apps/client/dist` to an S3 bucket.
3. Optionally put CloudFront in front of the bucket; use the CloudFront URL as `CORS_ORIGIN` on the server.

---

## 3. Post-deploy checklist

- [ ] **CORS**: Server `CORS_ORIGIN` equals the exact client origin (scheme + host + port if non-default).
- [ ] **HTTPS**: Both client and server should be served over HTTPS in production.
- [ ] **PubNub**: Same keyset used on the server; Presence, Message Persistence, and Access Manager enabled as in the README.
- [ ] **Health check**: `GET https://your-server-url/health` returns 200 (useful for load balancers and monitoring).

---

## 4. Demo / portfolio tip

For a “working demo” link:

1. Deploy server first; note the URL.
2. Deploy client with `VITE_API_URL` pointing to that URL.
3. Update server `CORS_ORIGIN` to the client URL.
4. Record a short video: open two tabs, log in as two users, send messages, show presence and typing. This demonstrates the Pub/Sub real-time behavior end-to-end.
