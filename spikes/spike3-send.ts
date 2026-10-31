// Spike 3 — Private send: Alice's confidential USDC → Bob's confidential balance.
// The biggest unknown in the plan: a same-asset "swap" with a different recipient.
import { ASSETS, LIVE, requireEnv, step, pass, fail, usd } from "./lib/oneclick.js";
import { evmAccount, authenticate, balances, printBalances, confidentialSwap } from "./lib/intents.js";

try {
  const alice = evmAccount(requireEnv("ALICE_PK"));
  const bob = evmAccount(requireEnv("BOB_PK"));
  const amount = usd(process.env.SEND_USD || "2");

  step(`Authenticate Alice and Bob`);
  const aliceSession = await authenticate(alice);
  const bobSession = await authenticate(bob);
  console.log(`  alice ${alice.signerId}\n  bob   ${bob.signerId}`);

  step("Bob's balance before");
  printBalances(await balances(bobSession.accessToken));

  step(`Send ${process.env.SEND_USD || 2} USDC Alice → Bob (confidential → confidential)`);
  const result = await confidentialSwap({
    from: alice,
    session: aliceSession,
    assetIn: ASSETS.USDC,
    assetOut: ASSETS.USDC,
    amount,
    recipient: bob.signerId,
  });

  if (!LIVE) pass("dry quote for a confidential P2P send accepted. Set LIVE=1 to execute.");
  else {
    if (result?.status !== "SUCCESS") fail(`send ended ${result?.status}`);
    step("Bob's balance after");
    printBalances(await balances((await authenticate(bob)).accessToken));
    pass("private send works — Lumen's Send flow is viable");
  }
} catch (e) {
  fail(e);
}
