// Creates two throwaway EVM keys (Alice, Bob) and stores them in .env.
// Keys are never printed; only the Intents account ids (lowercase addresses) are.
import { existsSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

if (!existsSync(".env")) copyFileSync(".env.example", ".env");
let env = readFileSync(".env", "utf8");

for (const name of ["ALICE_PK", "BOB_PK"]) {
  const existing = env.match(new RegExp(`^${name}=(0x[0-9a-fA-F]{64})$`, "m"));
  const pk = existing ? (existing[1] as `0x${string}`) : generatePrivateKey();
  if (!existing) env = env.replace(new RegExp(`^${name}=.*$`, "m"), `${name}=${pk}`);
  const who = name.split("_")[0].toLowerCase();
  console.log(`${who.padEnd(5)} ${privateKeyToAccount(pk).address.toLowerCase()}${existing ? "  (kept)" : "  (new)"}`);
}

writeFileSync(".env", env);
console.log("\nSaved to .env (gitignored). Fund only Alice, and only with a few dollars.");
