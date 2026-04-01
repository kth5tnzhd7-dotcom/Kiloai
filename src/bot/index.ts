// Telegram Bot for Link Cloaking
// Run: BOT_TOKEN=your_token bun src/bot/index.ts

const BOT_TOKEN = process.env.BOT_TOKEN || "";
const BASE_URL = process.env.BASE_URL || "https://your-app.onrender.com";

if (!BOT_TOKEN) {
  console.error("Set BOT_TOKEN environment variable");
  process.exit(1);
}

const API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const store = {
  links: new Map<string, { slug: string; destinationUrl: string; clicks: number; isActive: boolean; createdAt: string }>(),
};

function generateSlug(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let r = "";
  for (let i = 0; i < 6; i++) r += chars.charAt(Math.floor(Math.random() * chars.length));
  return r;
}

async function sendMessage(chatId: number, text: string, extra: Record<string, unknown> = {}) {
  await fetch(`${API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", ...extra }),
  });
}

async function handleUpdate(update: { message?: { chat: { id: number }; text?: string; from?: { first_name: string } } }) {
  if (!update.message || !update.message.text) return;

  const chatId = update.message.chat.id;
  const text = update.message.text.trim();
  const firstName = update.message.from?.first_name || "User";

  // /start
  if (text === "/start") {
    await sendMessage(chatId,
      `👋 <b>Welcome ${firstName}!</b>\n\n` +
      `🔗 <b>Link Cloaker Bot</b>\n\n` +
      `Commands:\n` +
      `/create &lt;url&gt; - Create cloaked link\n` +
      `/links - View your links\n` +
      `/clone &lt;url&gt; - Clone website\n` +
      `/help - Show help\n\n` +
      `Example:\n` +
      `<code>/create https://example.com</code>`
    );
    return;
  }

  // /help
  if (text === "/help") {
    await sendMessage(chatId,
      `📖 <b>Help</b>\n\n` +
      `<b>/create &lt;url&gt;</b>\n` +
      `Creates a cloaked short URL. Bots see blocked page, real users get redirected.\n\n` +
      `<b>/links</b>\n` +
      `Shows all your created links with click stats.\n\n` +
      `<b>/clone &lt;url&gt;</b>\n` +
      `Downloads a website as ZIP with anti-detection changes.\n\n` +
      `<b>Dashboard:</b> ${BASE_URL}/cloak`
    );
    return;
  }

  // /create <url>
  if (text.startsWith("/create")) {
    const url = text.replace("/create", "").trim();
    if (!url) {
      await sendMessage(chatId, `❌ Usage: <code>/create https://example.com</code>`);
      return;
    }

    try {
      new URL(url.startsWith("http") ? url : `https://${url}`);
    } catch {
      await sendMessage(chatId, `❌ Invalid URL. Use: <code>/create https://example.com</code>`);
      return;
    }

    const slug = generateSlug();
    const link = {
      slug,
      destinationUrl: url.startsWith("http") ? url : `https://${url}`,
      clicks: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    store.links.set(slug, link);

    const shortUrl = `${BASE_URL}/s/${slug}`;
    const nicegramUrl = `https://t.me/nicegram_bot?start=ad_${slug}`;

    await sendMessage(chatId,
      `✅ <b>Cloaked Link Created!</b>\n\n` +
      `🔗 <b>Short URL:</b>\n<code>${shortUrl}</code>\n\n` +
      `📱 <b>Nicegram Ad URL:</b>\n<code>${nicegramUrl}</code>\n\n` +
      `🎯 <b>Destination:</b> ${link.destinationUrl}\n` +
      `📊 <b>Clicks:</b> 0\n\n` +
      `Bot blocked → 404 page\n` +
      `Real user → redirect to destination`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "📊 Stats", callback_data: `stats_${slug}` },
              { text: "🗑 Delete", callback_data: `delete_${slug}` },
            ],
            [
              { text: "🔗 Open Link", url: shortUrl },
            ],
          ],
        },
      }
    );
    return;
  }

  // /links
  if (text === "/links") {
    const allLinks = Array.from(store.links.values());
    if (allLinks.length === 0) {
      await sendMessage(chatId, `📭 No links yet. Create one with:\n<code>/create https://example.com</code>`);
      return;
    }

    let msg = `📋 <b>Your Links (${allLinks.length})</b>\n\n`;
    for (const link of allLinks.slice(0, 10)) {
      const status = link.isActive ? "🟢" : "🔴";
      msg += `${status} <code>/s/${link.slug}</code>\n`;
      msg += `   → ${link.destinationUrl}\n`;
      msg += `   📊 ${link.clicks} clicks\n\n`;
    }
    msg += `Dashboard: ${BASE_URL}/cloak`;

    await sendMessage(chatId, msg);
    return;
  }

  // /clone <url>
  if (text.startsWith("/clone")) {
    const url = text.replace("/clone", "").trim();
    if (!url) {
      await sendMessage(chatId, `❌ Usage: <code>/clone https://example.com</code>`);
      return;
    }

    await sendMessage(chatId, `⏳ Cloning <code>${url}</code>... This may take a few seconds.`);

    try {
      const res = await fetch(`${BASE_URL}/api/clone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.startsWith("http") ? url : `https://${url}`, makeSafe: true }),
      });

      if (!res.ok) {
        await sendMessage(chatId, `❌ Clone failed. Make sure the URL is accessible.`);
        return;
      }

      const fileCount = res.headers.get("X-File-Count") || "0";
      const totalSize = res.headers.get("X-Total-Size") || "0";

      await sendMessage(chatId,
        `✅ <b>Website Cloned!</b>\n\n` +
        `📁 Files: ${fileCount}\n` +
        `💾 Size: ${(parseInt(totalSize) / 1024).toFixed(1)} KB\n` +
        `🛡 Anti-detection: Applied\n\n` +
        `Download from dashboard:\n${BASE_URL}/cloak`
      );
    } catch {
      await sendMessage(chatId, `❌ Clone failed. Try again later.`);
    }
    return;
  }

  // Default
  await sendMessage(chatId,
    `❓ Unknown command. Type /help for available commands.`
  );
}

// Polling loop
async function poll(offset = 0): Promise<void> {
  try {
    const res = await fetch(`${API}/getUpdates?offset=${offset}&timeout=30`);
    const data = await res.json();

    if (data.ok && data.result) {
      for (const update of data.result) {
        await handleUpdate(update);
        offset = update.update_id + 1;
      }
    }
  } catch {
    // retry
  }

  setTimeout(() => poll(offset), 1000);
}

console.log("🤖 Telegram Bot started...");
poll();
