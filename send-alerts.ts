/**
 * Standalone alert sender. Run via: npx tsx scripts/send-alerts.ts
 * Triggers the /api/alerts/send endpoint locally.
 */

async function main() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("❌ CRON_SECRET not set");
    process.exit(1);
  }

  console.log("📬 Triggering alert send...");

  const res = await fetch(`${baseUrl}/api/alerts/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cronSecret}`,
    },
  });

  const data = await res.json();

  if (res.ok) {
    console.log(`✅ Alerts sent: ${data.sent}`);
  } else {
    console.error("❌ Failed:", data.error);
    process.exit(1);
  }
}

main();
