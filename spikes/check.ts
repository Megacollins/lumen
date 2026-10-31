// Sanity check that needs no keys and moves no money:
// lists the Ondo tokens on 1Click and runs a public dry quote USDC → NVDAon.
import { api, ASSETS, quote, step, pass, fail, usd } from "./lib/oneclick.js";

try {
  step("Ondo tokens on 1Click (/v0/tokens?ondoTokens=true)");
  const tokens = await api<any[]>("/v0/tokens?ondoTokens=true", { partner: false });
  const ondo = tokens.filter((t) => t.assetId?.includes(".omdep.near"));
  for (const sym of Object.keys(ASSETS).filter((s) => s !== "USDC")) {
    const t = ondo.find((x) => x.assetId === ASSETS[sym as keyof typeof ASSETS]);
    console.log(`  ${sym.padEnd(7)} ${t ? `$${t.price}` : "MISSING"}`);
  }
  console.log(`  (${ondo.length} Ondo tokens listed)`);

  step("Public dry quote: 30 USDC → NVDAon");
  await quote({
    dry: true,
    confidentiality: "public",
    originAsset: ASSETS.USDC,
    destinationAsset: ASSETS.NVDAon,
    amount: usd(30),
    depositType: "ORIGIN_CHAIN",
    recipient: "aurora",
    recipientType: "INTENTS",
    refundTo: "aurora",
    refundType: "ORIGIN_CHAIN",
  });
  pass(`1Click reachable${process.env.ONECLICK_JWT ? " with partner key" : " (no partner key set)"}`);
} catch (e) {
  fail(e);
}
