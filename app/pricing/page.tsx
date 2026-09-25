import Link from "next/link"

import { MarketingShell, container, inkButton } from "@/components/marketing"
import { getSessionUserIdFromServerCookies } from "@/lib/auth/session"
import { COIN_PACKAGES, CREDIT_COSTS, SIGNUP_COINS } from "@/lib/pricing"

const costs = [
  { label: "A post draft", credits: CREDIT_COSTS.post },
  { label: "A headline, About, comment or connection-note run", credits: CREDIT_COSTS.tool },
  { label: "An image for a post", credits: CREDIT_COSTS.image },
  { label: "A full week of post drafts (seven)", credits: CREDIT_COSTS.week },
  { label: "Publishing, scheduling, analytics", credits: 0 },
]

export default async function PricingPage() {
  const signedIn = Boolean(await getSessionUserIdFromServerCookies())
  const buyHref = signedIn ? "/dashboard/coins" : "/auth/sign-up"

  return (
    <MarketingShell signedIn={signedIn}>
      <section className={`${container} pt-12 pb-12 sm:pt-16`}>
        <h1 className="t-price max-w-4xl">
          ₹0 to start. <em>Pay only when you draft.</em>
        </h1>
        <p className="t-lead mt-6 max-w-[36rem] text-muted-foreground">
          Every account starts with {SIGNUP_COINS} credits and every feature. There&apos;s no subscription and credits don&apos;t
          expire. If you run out, drafting pauses and approved posts still go out on time.
        </p>
      </section>

      <section className={`${container} pb-20`}>
        <table className="w-full border-t border-foreground text-left tabular-nums">
          <caption className="sr-only">Credit packs</caption>
          <thead className="t-meta text-muted-foreground">
            <tr className="border-b border-border">
              <th scope="col" className="py-3 font-normal">Pack</th>
              <th scope="col" className="py-3 font-normal">Credits</th>
              <th scope="col" className="hidden py-3 font-normal sm:table-cell">Roughly</th>
              <th scope="col" className="hidden py-3 font-normal md:table-cell">Per credit</th>
              <th scope="col" className="py-3 text-right font-normal">Price</th>
              <th scope="col" className="py-3"><span className="sr-only">Buy</span></th>
            </tr>
          </thead>
          <tbody>
            {COIN_PACKAGES.map((pkg) => (
              <tr key={pkg.id} className="border-b border-border">
                <th scope="row" className="t-h3 py-6 pr-4 font-normal">{pkg.name.replace(" Pack", "")}</th>
                <td className="py-6">{pkg.coins}</td>
                <td className="hidden py-6 text-muted-foreground sm:table-cell">{Math.floor(pkg.coins / CREDIT_COSTS.post)} posts</td>
                <td className="t-meta hidden py-6 text-muted-foreground md:table-cell">₹{(pkg.price / pkg.coins).toFixed(2)}</td>
                <td className="t-h3 py-6 text-right">₹{pkg.price.toLocaleString("en-IN")}</td>
                <td className="py-6 pl-4 text-right sm:pl-8">
                  <Link href={buyHref} className={`${inkButton} h-9 px-4 text-sm`}>
                    {signedIn ? "Buy" : "Start free"}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="t-small mt-4 text-muted-foreground">Prices in Indian rupees, one-time payments through Razorpay.</p>
      </section>

      <section className="border-y border-border bg-card">
        <div className={`${container} grid gap-12 py-16 lg:grid-cols-[2fr_3fr]`}>
          <h2 className="t-h2">What a credit buys</h2>
          <ul className="border-t border-foreground">
            {costs.map((c) => (
              <li key={c.label} className="flex items-baseline justify-between gap-6 border-b border-border py-4">
                <span>{c.label}</span>
                <span className="t-meta shrink-0">{c.credits === 0 ? "free" : `${c.credits} credit${c.credits === 1 ? "" : "s"}`}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={`${container} py-16`}>
        <p className="t-lead max-w-[40rem]">
          <em className="t-h3">Running it yourself?</em> With Claude Code or Codex logged in on the same machine, pick it under
          Settings → AI Engine and text drafts cost nothing. Credits then only go on images.
        </p>
      </section>
    </MarketingShell>
  )
}
