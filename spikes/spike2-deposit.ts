// Spike 2 — Deposit into a confidential balance.
// Quote ORIGIN_ASSET → USDC with recipientType CONFIDENTIAL_INTENTS, send funds to the
// deposit address yourself, then watch it land in Alice's private balance.
import { ASSETS, LIVE, quote, requireEnv, step, pass, fail, usd, waitForStatus } from "./lib/oneclick.js";
import { evmAccount, authenticate, balances, printBalances } from "./lib/intents.js";

try {
  const alice = evmAccount(requireEnv("ALICE_PK"));
  const origin = process.env.ORIGIN_ASSET || ASSETS.USDC;
  const amount = usd(process.env.DEPOSIT_USD || "40");

  step(`Authenticate Alice (${alice.signerId})`);
  const session = await authenticate(alice);

  step("Balance before");
  printBalances(await balances(session.accessToken));

  step(`Quote deposit ${process.env.DEPOSIT_USD || 40} USD of ${origin} → confidential USDC`);
  const q = await quote({
    originAsset: origin,
    destinationAsset: ASSETS.USDC,
    amount,
    depositType: "ORIGIN_CHAIN",
    recipient: alice.signerId,
    recipientType: "CONFIDENTIAL_INTENTS",
    refundTo: requireEnv("REFUND_TO"),
    refundType: "ORIGIN_CHAIN",
  });

  if (!LIVE) pass("dry confidential deposit quote accepted. Set LIVE=1 to get a deposit address.");
  else {
    console.log(`\n  ➜ Send exactly ${q.quote.amountInFormatted} of ${origin}\n    to ${q.quote.depositAddress}` +
      (q.quote.depositMemo ? `\n    memo ${q.quote.depositMemo}` : "") + `\n    then leave this running.`);
    const s = await waitForStatus(q.quote.depositAddress);
    if (s.status !== "SUCCESS") fail(`deposit ended ${s.status}`);

    step("Balance after (re-authenticated)");
    printBalances(await balances((await authenticate(alice)).accessToken));
    pass("deposit reached Alice's confidential balance");
  }
} catch (e) {
  fail(e);
}
