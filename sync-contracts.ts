/**
 * Standalone script to sync contracts from sam.gov into Supabase.
 * Run via: npx tsx scripts/sync-contracts.ts
 * Or set up as a cron job on your server.
 * 
 * Requires env vars: SAM_GOV_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";

const SAM_GOV_BASE_URL = "https://api.sam.gov/opportunities/v2/search";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fetchPage(offset: number, postedFrom: string) {
  const params = new URLSearchParams({
    api_key: process.env.SAM_GOV_API_KEY!,
    limit: "100",
    offset: String(offset),
    postedFrom,
    postedTo: formatDate(new Date()),
  });

  const res = await fetch(`${SAM_GOV_BASE_URL}?${params}`, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`sam.gov API ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

function formatDate(d: Date): string {
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
}

function mapOpportunity(opp: any) {
  const contact = opp.pointOfContact?.[0];
  return {
    notice_id: opp.noticeId,
    title: opp.title,
    description: opp.description || "",
    sol_number: opp.solicitationNumber || null,
    department: opp.fullParentPathName?.split(".")?.shift() || null,
    sub_tier: opp.fullParentPathName?.split(".")?.slice(1, 2)?.join("") || null,
    office: opp.fullParentPathName?.split(".")?.pop() || null,
    posted_date: opp.postedDate,
    response_deadline: opp.responseDeadLine || null,
    type: opp.type || opp.baseType || "Unknown",
    set_aside: opp.setAsideDescription || opp.setAsideCode || null,
    naics_code: opp.naicsCode || null,
    naics_description: opp.naicsSolicitationDescription || null,
    classification_code: opp.classificationCode || null,
    place_of_performance_state: opp.placeOfPerformance?.state?.code || null,
    place_of_performance_city: opp.placeOfPerformance?.city?.name || null,
    award_amount: opp.award?.amount ? parseFloat(opp.award.amount) : null,
    point_of_contact_name: contact?.fullName || null,
    point_of_contact_email: contact?.email || null,
    link: opp.link?.href || `https://sam.gov/opp/${opp.noticeId}/view`,
    active: opp.active === "Yes",
    updated_at: new Date().toISOString(),
  };
}

async function main() {
  console.log("🚀 Starting sam.gov contract sync...");

  // Log sync
  const { data: syncLog } = await supabase
    .from("sync_log")
    .insert({ status: "running" })
    .select()
    .single();

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const postedFrom = formatDate(yesterday);

  let offset = 0;
  let totalFetched = 0;
  let totalUpserted = 0;

  try {
    while (offset < 2000) {
      console.log(`  Fetching page at offset ${offset}...`);
      const data = await fetchPage(offset, postedFrom);

      if (!data.opportunitiesData?.length) {
        console.log("  No more records.");
        break;
      }

      totalFetched += data.opportunitiesData.length;
      console.log(`  Got ${data.opportunitiesData.length} records (total: ${totalFetched})`);

      // Batch upsert
      const contracts = data.opportunitiesData.map(mapOpportunity);
      const { error } = await supabase
        .from("contracts")
        .upsert(contracts, { onConflict: "notice_id" });

      if (error) {
        console.error("  Upsert error:", error.message);
      } else {
        totalUpserted += contracts.length;
      }

      if (offset + 100 >= data.totalRecords) break;
      offset += 100;

      // Rate limit
      await new Promise((r) => setTimeout(r, 1000));
    }

    console.log(`\n✅ Sync complete: ${totalFetched} fetched, ${totalUpserted} upserted`);

    if (syncLog) {
      await supabase
        .from("sync_log")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          records_fetched: totalFetched,
          records_inserted: totalUpserted,
        })
        .eq("id", syncLog.id);
    }
  } catch (err: any) {
    console.error("\n❌ Sync failed:", err.message);
    if (syncLog) {
      await supabase
        .from("sync_log")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: err.message,
          records_fetched: totalFetched,
        })
        .eq("id", syncLog.id);
    }
    process.exit(1);
  }
}

main();
