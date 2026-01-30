import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { z } from "zod";
import PubNub from "pubnub";

dotenv.config();

const app = express();
app.use(helmet());
app.use(express.json({ limit: "256kb" }));
app.use(morgan("dev"));

const PORT = Number(process.env.PORT || 5050);
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

app.use(
  cors({
    origin: CORS_ORIGIN,
    credentials: false,
  })
);

// ---- Demo users (replace with DB in production) ----
const DEMO_USERS = [
  { id: "alice", name: "Alice Johnson" },
  { id: "bob", name: "Bob Singh" },
  { id: "carol", name: "Carol Mehta" },
  { id: "david", name: "David Khan" },
];

// ---- PubNub admin client (uses secretKey, must stay server-side) ----
const publishKey = process.env.PUBNUB_PUBLISH_KEY;
const subscribeKey = process.env.PUBNUB_SUBSCRIBE_KEY;
const secretKey = process.env.PUBNUB_SECRET_KEY;
const ttlMinutes = Number(process.env.PUBNUB_TOKEN_TTL_MINUTES || 60);

if (!publishKey || !subscribeKey || !secretKey) {
  console.error(
    "Missing PubNub keys. Set PUBNUB_PUBLISH_KEY, PUBNUB_SUBSCRIBE_KEY, PUBNUB_SECRET_KEY in apps/server/.env"
  );
  process.exit(1);
}

// In PAM v3 docs, this is called "authorized_uuid" (aka userId/UUID).
const pubnubAdmin = new PubNub({
  publishKey,
  subscribeKey,
  secretKey,
  userId: "server-admin",
  ssl: true,
});

const PRESENCE_CHANNEL = "presence.global";

// Small helper for safe regex embedding
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function issueTokenForUser(userId) {
  // Allow:
  // 1) presence channel (read + join)
  // 2) DM channels that include this userId: dm.<a>--<b>
  //
  // NOTE: PubNub PAM v3 supports regex patterns under `patterns.channels`.
  const u = escapeRegExp(userId);
  const dmPattern = `^dm\\.(?:${u}--.*|.*--${u})$`;

  const token = await pubnubAdmin.grantToken({
    ttl: ttlMinutes,
    authorized_uuid: userId,
    patterns: {
      channels: {
        [dmPattern]: { read: true, write: true },
        [`^${escapeRegExp(PRESENCE_CHANNEL)}$`]: { read: true, join: true },
      },
    },
  });

  return token;
}

// ---- Routes ----
app.get("/health", (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.get("/users", (_req, res) => {
  res.json({ users: DEMO_USERS });
});

const LoginSchema = z.object({
  userId: z.string().min(1),
});

app.post("/auth/login", async (req, res) => {
  try {
    const { userId } = LoginSchema.parse(req.body);
    const user = DEMO_USERS.find((u) => u.id === userId);

    if (!user) {
      return res.status(404).json({ message: "Unknown demo userId" });
    }

    const token = await issueTokenForUser(userId);

    return res.json({
      user,
      pubnub: {
        publishKey,
        subscribeKey,
        token,
        presenceChannel: PRESENCE_CHANNEL,
        tokenTtlMinutes: ttlMinutes,
      },
    });
  } catch (err) {
    if (err?.name === "ZodError") {
      return res.status(400).json({ message: "Invalid payload", details: err.errors });
    }
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`✅ CORS origin: ${CORS_ORIGIN}`);
});
