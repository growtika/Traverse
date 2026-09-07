import { insertSite, listSites } from "../src/lib/db";
import { normalizeDomainInput, faviconCandidates } from "../src/lib/domain";
import { listCrossings, getRun } from "../src/lib/db";
import { createAndStartRun, getRunJob } from "../src/lib/survey";

const domain = process.argv[2] || "example.com";

async function main() {
  const parsed = normalizeDomainInput(domain);
  if (!listSites().some((s) => s.domain === parsed.domain)) {
    insertSite({
      name: parsed.domain,
      domain: parsed.domain,
      role: "client",
      startPath: parsed.startPath,
      faviconUrl: faviconCandidates(parsed.domain)[1],
      notes: "Seeded by survey-once",
    });
  }
  const run = createAndStartRun();
  console.log(`started ${run.id} against ${parsed.domain}`);
  await getRunJob(run.id);
  const finished = getRun(run.id);
  const crossings = listCrossings(run.id);
  console.log(
    JSON.stringify(
      {
        status: finished?.status,
        error: finished?.error,
        crossings: crossings.map((c) => ({
          routeId: c.routeId,
          overall: c.overallScore,
          know: c.knowScore,
          find: c.findScore,
          verify: c.verifyScore,
          status: c.status,
        })),
      },
      null,
      2,
    ),
  );
  if (finished?.status !== "completed") {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
