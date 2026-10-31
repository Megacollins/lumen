// Spike 4 — Confidential round trip: USDC → NVDAon → USDC, all inside Alice's private balance.
// Run once on a weekday during US market hours and once on a weekend to compare fill times.
import { ASSETS, LIVE, requireEnv, step, pass, fail, usd } from "./lib/oneclick.js";
import { evmAccount, authenticate, balances, printBalances, confidentialSwap } from "./lib/intents.js";

const ASSET = (process.env.ASSET as keyof typeof ASSETS) || "NVDAon";

try {
  const alice = evmAccount(requireEnv("ALICE_PK"));
  const session = await authenticate(alice);

  step("Balance before");
  printBalances(await balances(session.accessToken));

  step(`Buy: ${process.env.BUY_USD || 30} USDC → ${ASSET}`);
  const t0 = Date.now();
  const buy = await confidentialSwap({
    from: alice,
    session,
    assetIn: ASSETS.USDC,
    assetOut: ASSETS[ASSET],
    amount: usd(process.env.BUY_USD || "30"),
    recipient: alice.signerId,
  });

  if (!LIVE) {
    step(`Sell quote (dry): 0.01 ${ASSET} → USDC`);
    await confidentialSwap({
      from: alice,
      session,
      assetIn: ASSETS[ASSET],
      assetOut: ASSETS.USDC,
      amount: String(10n ** 16n), // 0.01 of an 18-decimal token
      recipient: alice.signerId,
    });
    pass("dry buy and sell quotes accepted. Set LIVE=1 to execute.");
  } else {
    if (buy?.status !== "SUCCESS") fail(`buy ended ${buy?.status}`);
    const got = buy.swapDetails?.amountOut as string;
    console.log(`  filled in ${Math.round((Date.now() - t0) / 1000)}s, received ${buy.swapDetails?.amountOutFormatted} ${ASSET}`);

    step(`Sell: ${buy.swapDetails?.amountOutFormatted} ${ASSET} → USDC`);
    const t1 = Date.now();
    const sell = await confidentialSwap({
      from: alice,
      session: await authenticate(alice),
      assetIn: ASSETS[ASSET],
      assetOut: ASSETS.USDC,
      amount: got,
      recipient: alice.signerId,
    });
    if (sell?.status !== "SUCCESS") fail(`sell ended ${sell?.status}`);
    console.log(`  filled in ${Math.round((Date.now() - t1) / 1000)}s, received ${sell.swapDetails?.amountOutFormatted} USDC`);

    step("Balance after");
    printBalances(await balances((await authenticate(alice)).accessToken));
    pass(`confidential ${ASSET} round trip works`);
  }
} catch (e) {
  fail(e);
}
