interface VercelModel {
  id: string;
  name?: string;
  owned_by?: string;
  context_window?: number;
}

interface VercelModelsResponse {
  object: string;
  data: VercelModel[];
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function printIds(resp: VercelModelsResponse) {
  const ids = (resp?.data ?? []).map((m) => m.id);
  // Print as a JSON array so it's easy to consume programmatically
  console.log(JSON.stringify(ids, null, 2));
}

async function main() {
  const wantJson = hasFlag("--json");
  const url = process.env.VERCEL_AI_GATEWAY_URL ?? "https://ai-gateway.vercel.sh/v1/models";

  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Failed to fetch Vercel models: ${res.status} ${res.statusText}\n${body}`);
  }
  const data = (await res.json()) as VercelModelsResponse;

  if (wantJson) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    printIds(data);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
