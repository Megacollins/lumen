import { AssetDetail } from "@/components/app/asset-detail";

export const metadata = { title: "Lumen — invest" };
export const instant = false; // session-gated, see app/app/layout.tsx

export default async function AssetPage({ params }: PageProps<"/app/invest/[symbol]">) {
  const { symbol } = await params;
  return <AssetDetail symbol={symbol} />;
}
