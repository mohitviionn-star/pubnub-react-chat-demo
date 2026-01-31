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
  }),
);

const DEMO_USERS = [
  { id: "1", name: "Jhon" },
  { id: "2", name: "Bob" },
  { id: "3", name: "Carol" },
  { id: "4", name: "David" },
];

const publishKey = process.env.PUBNUB_PUBLISH_KEY;
const subscribeKey = process.env.PUBNUB_SUBSCRIBE_KEY;
const secretKey = process.env.PUBNUB_SECRET_KEY;
const ttlMinutes = Number(process.env.PUBNUB_TOKEN_TTL_MINUTES || 60);

if (!publishKey || !subscribeKey || !secretKey) {
  console.error(
    "Missing PubNub keys. Set PUBNUB_PUBLISH_KEY, PUBNUB_SUBSCRIBE_KEY, PUBNUB_SECRET_KEY in apps/server/.env",
  );
  process.exit(1);
}

const pubnubAdmin = new PubNub({
  publishKey,
  subscribeKey,
  secretKey,
  userId: "server-admin",
  ssl: true,
});

const PRESENCE_CHANNEL = "presence.global";

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function issueTokenForUser(userId) {
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
      return res
        .status(400)
        .json({ message: "Invalid payload", details: err.errors });
    }
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

app.post("/admin/purge-dm", async (req, res) => {
  try {
    const { userId, peerId } = req.body || {};
    if (!userId || !peerId)
      return res.status(400).json({ message: "userId & peerId required" });

    const [a, b] = [userId, peerId].sort();
    const channel = `dm.${a}--${b}`;

    await pubnubAdmin.deleteMessages({ channel });

    return res.json({ ok: true, channel });
  } catch (e) {
    console.error(e);
    return res
      .status(500)
      .json({ message: "Purge failed", error: String(e?.message || e) });
  }
});

app.post("/admin/purge-all-dms", async (_req, res) => {
  try {
    const ids = DEMO_USERS.map((u) => u.id);
    const channels = [];

    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const [a, b] = [ids[i], ids[j]].sort();
        channels.push(`dm.${a}--${b}`);
      }
    }

    for (const ch of channels) {
      await pubnubAdmin.deleteMessages({ channel: ch });
    }

    return res.json({ ok: true, deletedChannels: channels });
  } catch (e) {
    console.error(e);
    return res
      .status(500)
      .json({ message: "Purge failed", error: String(e?.message || e) });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(` CORS origin: ${CORS_ORIGIN}`);
});
