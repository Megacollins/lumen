// Market data for Lumen Intelligence. Every value carries its source and timestamp, and anything a source doesn't
// return is left out rather than filled in. Responses are cached for 15 minutes by Next's fetch cache.

const REVALIDATE = 900;
const UA = "Lumen https://lumen-near.vercel.app";

export type Source = { name: string; url: string };

/** The listed security behind each Ondo token, with its SEC filer id. */
export const UNDERLYING: Record<string, { name: string; news: string; cik: string }> = {
  NVDA: { name: "NVIDIA", news: "NVIDIA stock", cik: "1045810" },
  TSLA: { name: "Tesla", news: "Tesla stock", cik: "1318605" },
  AAPL: { name: "Apple", news: "Apple stock", cik: "320193" },
  MSFT: { name: "Microsoft", news: "Microsoft stock", cik: "789019" },
  AMZN: { name: "Amazon", news: "Amazon stock", cik: "1018724" },
  GOOGL: { name: "Alphabet (Google)", news: "Alphabet stock", cik: "1652044" },
  META: { name: "Meta", news: "Meta Platforms stock", cik: "1326801" },
  INTC: { name: "Intel", news: "Intel stock", cik: "50863" },
  MRVL: { name: "Marvell", news: "Marvell Technology stock", cik: "1835632" },
  CRCL: { name: "Circle", news: "Circle Internet Group stock", cik: "1876042" },
  HOOD: { name: "Robinhood", news: "Robinhood stock", cik: "1783879" },
  QQQ: { name: "Invesco QQQ", news: "Nasdaq 100 OR Invesco QQQ", cik: "1067839" },
  SPY: { name: "SPDR S&P 500", news: "S&P 500", cik: "884394" },
  GLD: { name: "SPDR Gold Shares", news: "gold price", cik: "1222333" },
  IAU: { name: "iShares Gold Trust", news: "gold price OR gold ETF", cik: "1278680" },
  SLV: { name: "iShares Silver Trust", news: "silver price", cik: "1330568" },
};

export type Underlying = {
  symbol: string;
  price: number;
  asOf: string;
  closes: { date: string; close: number }[];
  change1d: number | null;
  change5d: number | null;
  change1m: number | null;
  source: Source;
};

const change = (now: number, then: number | undefined) => (then && then > 0 ? now / then - 1 : null);

/** Daily closes for the last month and the latest regular-session price, from Yahoo Finance's public chart API. */
export async function getUnderlying(symbol: string): Promise<Underlying | null> {
  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1mo&interval=1d`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: REVALIDATE },
    });
    if (!res.ok) return null;
    const r = (await res.json())?.chart?.result?.[0];
    const ts: number[] = r?.timestamp ?? [];
    const raw: (number | null)[] = r?.indicators?.quote?.[0]?.close ?? [];
    const closes = ts
      .map((t, i) => ({ date: new Date(t * 1000).toISOString().slice(0, 10), close: raw[i] }))
      .filter((c): c is { date: string; close: number } => typeof c.close === "number" && c.close > 0);
    const price = r?.meta?.regularMarketPrice;
    if (typeof price !== "number" || closes.length < 2) return null;
    const n = closes.length;
    return {
      symbol,
      price,
      asOf: new Date((r.meta.regularMarketTime ?? ts.at(-1)) * 1000).toISOString(),
      closes,
      change1d: change(closes[n - 1].close, closes[n - 2]?.close),
      change5d: change(closes[n - 1].close, closes[n - 6]?.close),
      change1m: change(closes[n - 1].close, closes[0]?.close),
      source: { name: "Yahoo Finance", url: `https://finance.yahoo.com/quote/${symbol}` },
    };
  } catch {
    return null;
  }
}

export type Headline = { title: string; publisher: string; url: string; publishedAt: string };

const decode = (s: string) =>
  s
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
const tag = (item: string, name: string) => item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))?.[1];

/**
 * Established financial and general news outlets. Google News search returns any site that matches the words (local
 * gold-shop prices, press-release mills), so headlines from anyone else are left out.
 */
const OUTLETS = [
  "Reuters",
  "Bloomberg",
  "CNBC",
  "MarketWatch",
  "The Wall Street Journal",
  "WSJ",
  "Financial Times",
  "Barron's",
  "Yahoo Finance",
  "Investing.com",
  "Kitco",
  "Morningstar",
  "Forbes",
  "Fortune",
  "Business Insider",
  "Associated Press",
  "AP News",
  "The Motley Fool",
  "Seeking Alpha",
  "Nasdaq",
  "TheStreet",
  "Benzinga",
  "Axios",
  "The Economist",
  "BBC",
  "CNN",
  "The New York Times",
  "The Guardian",
  "Fox Business",
  "Investopedia",
  "TechCrunch",
  "The Verge",
];
const established = (publisher: string) =>
  OUTLETS.some((o) => publisher.toLowerCase() === o.toLowerCase() || publisher.toLowerCase().startsWith(o.toLowerCase() + " "));

/** The newest headlines from established outlets in the past week, via Google News search RSS (each links to the article). */
export async function getHeadlines(query: string, limit = 4): Promise<Headline[]> {
  try {
    const q = encodeURIComponent(`${query} when:7d`);
    const res = await fetch(`https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`, { next: { revalidate: REVALIDATE } });
    if (!res.ok) return [];
    const xml = await res.text();
    const items = xml.split("<item>").slice(1);
    return items
      .map((item) => {
        const title = decode(tag(item, "title") ?? "");
        const publisher = decode(tag(item, "source") ?? "") || title.split(" - ").at(-1) || "";
        return {
          title: publisher && title.endsWith(` - ${publisher}`) ? title.slice(0, -(publisher.length + 3)) : title,
          publisher,
          url: decode(tag(item, "link") ?? ""),
          publishedAt: new Date(tag(item, "pubDate") ?? "").toISOString(),
        };
      })
      .filter((h) => h.title && h.url.startsWith("https://") && !Number.isNaN(Date.parse(h.publishedAt)) && established(h.publisher))
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
      .slice(0, limit);
  } catch {
    return [];
  }
}

export type Filing = { form: string; filedAt: string; title: string; url: string };

const FORMS: Record<string, string> = {
  "8-K": "Current report (material event)",
  "10-Q": "Quarterly report",
  "10-K": "Annual report",
  "6-K": "Report of a foreign issuer",
  "S-1": "Registration statement",
  "424B2": "Prospectus",
};

/** Material filings from the past 45 days, straight from SEC EDGAR. */
export async function getFilings(cik: string, limit = 3): Promise<Filing[]> {
  try {
    const res = await fetch(`https://data.sec.gov/submissions/CIK${cik.padStart(10, "0")}.json`, {
      headers: { "User-Agent": UA },
      next: { revalidate: REVALIDATE },
    });
    if (!res.ok) return [];
    const recent = (await res.json())?.filings?.recent;
    if (!recent) return [];
    const since = Date.now() - 45 * 86_400_000;
    const out: Filing[] = [];
    for (let i = 0; i < recent.form.length && out.length < limit; i++) {
      const form: string = recent.form[i];
      if (!["8-K", "10-Q", "10-K"].includes(form)) continue;
      const filedAt: string = recent.filingDate[i];
      if (Date.parse(filedAt) < since) continue;
      const acc: string = recent.accessionNumber[i].replace(/-/g, "");
      out.push({
        form,
        filedAt,
        title: recent.primaryDocDescription?.[i] || FORMS[form] || form,
        url: `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${acc}/${recent.primaryDocument[i]}`,
      });
    }
    return out;
  } catch {
    return [];
  }
}
