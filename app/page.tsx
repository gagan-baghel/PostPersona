import { redirect } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Plus } from "lucide-react"

import { MarketingShell, PostFigure, ProfileFigure, container, inkButton, textLink } from "@/components/marketing"
import { getSessionUserIdFromServerCookies } from "@/lib/auth/session"
import { COIN_PACKAGES, CREDIT_COSTS, SIGNUP_COINS } from "@/lib/pricing"

// The page follows a LinkedIn profile from top to bottom, because that is what the product reworks.
const profileParts = [
  { n: "01", part: "Headline", does: "Five rewrites that say who you help.", href: "#top" },
  { n: "02", part: "About", does: "Two lines that earn the “see more”.", href: "#top" },
  { n: "03", part: "Posts", does: "Drafted from notes, sent when approved.", href: "#posts" },
  { n: "04", part: "Comments & connections", does: "Replies and notes worth sending.", href: "#inside" },
  { n: "05", part: "What worked", does: "Best posts, days and hours.", href: "#inside" },
]

const nevers = [
  "Ask for your LinkedIn password. You sign in on LinkedIn's own page.",
  "Scrape LinkedIn or drive a hidden browser. It uses LinkedIn's official API and nothing else.",
  "Like, comment or send connection requests for you. It drafts; you press the button on LinkedIn.",
  "Publish a post you haven't approved.",
]

const faqs = [
  {
    q: "Do I have to give you my LinkedIn password?",
    a: "No. You press “Sign in with LinkedIn” and log in on LinkedIn's own page. LinkedIn gives PersonaPost a token that can publish for you and read your posts' numbers. Revoke it any time from Settings, or from LinkedIn itself.",
  },
  {
    q: "Can it change my profile directly?",
    a: "No, and that's LinkedIn's rule, not ours: its API doesn't let apps edit your headline or About. PersonaPost writes the options; you paste the one you like. Takes about ten seconds.",
  },
  {
    q: "Could this get my account restricted?",
    a: "Accounts get flagged for scraping, browser automation and automated likes or comments. PersonaPost does none of that. Posts go out through the official API, the same way scheduling tools publish.",
  },
  {
    q: "Can I use my Claude or ChatGPT subscription?",
    a: "Yes, if PersonaPost runs on your own computer with Claude Code or Codex installed and logged in. Pick it under Settings → AI Engine and text drafts stop costing credits.",
  },
  {
    q: "Company pages?",
    a: "Not yet. Personal profiles only for now.",
  },
]

export default async function HomePage() {
  if (await getSessionUserIdFromServerCookies()) redirect("/dashboard")

  const cheapest = COIN_PACKAGES[0]

  return (
    <MarketingShell>
      {/* Hero: claim left, the evidence right. */}
      <section id="top" className={`${container} grid gap-12 pt-12 pb-20 sm:pt-16 lg:grid-cols-[6fr_5fr] lg:gap-16 lg:pt-20`}>
        <div className="lg:pt-6">
          <h1 className="t-h1 text-balance">
            Rework your <em>whole</em> LinkedIn, in your own voice.
          </h1>
          <p className="t-lead mt-7 max-w-[34rem] text-muted-foreground">
            Headline, About, posts and replies, rewritten from what you tell it. Where it doesn&apos;t know something, it
            leaves a gap instead of making it up.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
            <Link href="/auth/sign-up" className={inkButton}>
              Rework my profile
            </Link>
            <Link href="/pricing" className={textLink}>
              See pricing
            </Link>
          </div>
          <p className="t-small mt-6 max-w-[30rem] text-muted-foreground">
            {SIGNUP_COINS} free credits, no card. You sign in through LinkedIn itself; PersonaPost never sees your password.
          </p>
        </div>
        <ProfileFigure />
      </section>

      {/* Index of the profile, like a contents page. */}
      <section id="reworks" aria-labelledby="reworks-title" className="scroll-mt-20 border-y border-border bg-card">
        <div className={`${container} py-14`}>
          <h2 id="reworks-title" className="t-h3 max-w-xl">Everything on your profile, top to bottom.</h2>
          <ol className="mt-8 grid border-t border-foreground sm:grid-cols-2 lg:grid-cols-5">
            {profileParts.map((item) => (
              <li key={item.n} className="border-b border-border py-5 sm:pr-6 lg:border-b-0">
                <a href={item.href} className="group block">
                  <span className="t-meta text-[var(--pen)]">{item.n}</span>
                  <span className="mt-1 block font-semibold group-hover:underline group-hover:underline-offset-4">{item.part}</span>
                  <span className="t-small mt-1.5 block text-muted-foreground">{item.does}</span>
                </a>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Inside the app. Dark screenshots live on the dark band, never on paper. */}
      <section id="inside" aria-labelledby="inside-title" className="scroll-mt-20 bg-foreground text-background">
        <div className={`${container} py-20 sm:py-24`}>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <h2 id="inside-title" className="t-h2 max-w-xl">
              One workspace for <em>all of it.</em>
            </h2>
            <p className="max-w-sm text-background/70">Real screens, real output. The headline options below came straight from Claude Code.</p>
          </div>

          <figure className="mt-12">
            <Image
              src="/marketing/command-center.webp"
              width={1440}
              height={900}
              sizes="(min-width: 1152px) 1088px, 100vw"
              alt="PersonaPost Command Center: a setup checklist three of five steps done, counts of posts waiting for review, scheduled and published, the next three queued posts with dates, and shortcuts to the headline, post idea, comment and connection note tools."
              className="h-auto w-full rounded-[8px] border border-background/15"
            />
            <figcaption className="t-meta mt-3 text-background/60">Command Center: what&apos;s queued, what needs you, and what&apos;s left to set up.</figcaption>
          </figure>

          <div className="mt-10 grid gap-10 lg:grid-cols-[7fr_4fr] lg:items-start">
            <figure>
              <Image
                src="/marketing/growth-toolkit.webp"
                width={1184}
                height={811}
                sizes="(min-width: 1024px) 640px, 100vw"
                alt="Growth Toolkit, Headline tab: the current headline pasted in, and four rewritten options each with a character count under 220 and a Copy button. Two options contain bracketed gaps such as [X] users so far."
                className="h-auto w-full rounded-[8px] border border-background/15"
              />
              <figcaption className="t-meta mt-3 text-background/60">
                Growth Toolkit: headline, About, post ideas, hooks, comments and connection notes. Brackets mark facts only you can fill in.
              </figcaption>
            </figure>
            <figure>
              <Image
                src="/marketing/ai-engine.webp"
                width={558}
                height={410}
                sizes="(min-width: 1024px) 380px, 100vw"
                alt="Settings, AI Engine card: Claude Code marked Free, Active and Detected; Codex marked Free and Detected; Groq API with no key."
                className="h-auto w-full rounded-[8px] border border-background/15"
              />
              <figcaption className="t-meta mt-3 text-background/60">
                Self-hosting? Drafts can run on your own Claude Code or Codex login. It runs <code>claude -p --tools &quot;&quot;</code>, so the
                model can write text and nothing else.
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* Posts: the part people come back for weekly, so it gets the most room. */}
      <section id="posts" className={`${container} grid scroll-mt-20 gap-12 py-24 lg:grid-cols-[6fr_5fr] lg:gap-16`}>
        <div className="order-2 lg:order-1">
          <PostFigure />
        </div>
        <div className="order-1 lg:order-2 lg:pt-10">
          <p className="t-meta text-[var(--pen)]">03 · Posts</p>
          <h2 className="t-h2 mt-3">Four rough notes in. A post you&apos;d sign your name to.</h2>
          <p className="t-lead mt-6 text-muted-foreground">
            It learns how you write from a few posts you like. Plan a week at once, drag drafts into order, and nothing
            goes out until you approve it.
          </p>
        </div>
      </section>

      {/* The promises, set in reverse for weight. */}
      <section className="bg-foreground text-background">
        <div className={`${container} py-20 sm:py-24`}>
          <h2 className="t-h2 max-w-2xl">
            What it will <em>never</em> do with your account.
          </h2>
          <ul className="mt-10 max-w-3xl border-t border-background/20">
            {nevers.map((line) => (
              <li key={line} className="t-lead flex gap-5 border-b border-background/20 py-5">
                <span aria-hidden="true" className="mt-3.5 h-0.5 w-6 shrink-0 bg-[var(--pen)]" />
                {line}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Pricing: the price is the headline. */}
      <section className="border-y border-border bg-card">
        <div className={`${container} py-20`}>
          <h2 className="t-price">
            ₹0 to start.
            <br />
            ₹{cheapest.price} when you need more.
          </h2>
          <div className="mt-10 grid gap-10 lg:grid-cols-[3fr_2fr]">
            <table className="w-full border-t border-foreground text-left tabular-nums">
              <caption className="sr-only">Credit packs</caption>
              <thead className="t-meta text-muted-foreground">
                <tr className="border-b border-border">
                  <th scope="col" className="py-3 font-normal">Pack</th>
                  <th scope="col" className="py-3 font-normal">Credits</th>
                  <th scope="col" className="py-3 font-normal">About</th>
                  <th scope="col" className="py-3 text-right font-normal">Price</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <th scope="row" className="py-4 font-normal">On sign-up</th>
                  <td className="py-4">{SIGNUP_COINS}</td>
                  <td className="py-4 text-muted-foreground">{Math.floor(SIGNUP_COINS / CREDIT_COSTS.post)} posts</td>
                  <td className="py-4 text-right">Free</td>
                </tr>
                {COIN_PACKAGES.map((pkg) => (
                  <tr key={pkg.id} className="border-b border-border">
                    <th scope="row" className="py-4 font-normal">{pkg.name.replace(" Pack", "")}</th>
                    <td className="py-4">{pkg.coins}</td>
                    <td className="py-4 text-muted-foreground">{Math.floor(pkg.coins / CREDIT_COSTS.post)} posts</td>
                    <td className="py-4 text-right">₹{pkg.price.toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="space-y-4 text-muted-foreground">
              <p>
                A post draft is {CREDIT_COSTS.post} credits. A headline, About or reply run is {CREDIT_COSTS.tool}. An image is{" "}
                {CREDIT_COSTS.image}.
              </p>
              <p>
                No subscription, and credits don&apos;t expire. If you run out, drafting pauses, and posts you&apos;ve already
                approved still go out on time.
              </p>
              <Link href="/pricing" className={`${textLink} inline-block text-foreground`}>
                Full pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Questions: single reading column. */}
      <section id="questions" aria-labelledby="questions-title" className="mx-auto w-full max-w-3xl scroll-mt-20 px-5 py-24 sm:px-8">
        <h2 id="questions-title" className="t-h2">Before you connect your account</h2>
        <div className="mt-10 border-t border-foreground">
          {faqs.map((item) => (
            <details key={item.q} className="group border-b border-border [&_summary::-webkit-details-marker]:hidden">
              <summary className="t-lead flex cursor-pointer list-none items-start justify-between gap-6 py-5">
                {item.q}
                <Plus aria-hidden="true" className="mt-1.5 h-4 w-4 shrink-0 transition-transform duration-150 group-open:rotate-45" />
              </summary>
              <p className="max-w-[40rem] pb-6 text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Close on the smallest possible first step. */}
      <section className="border-t border-border">
        <div className={`${container} flex flex-col items-start gap-8 py-20 lg:flex-row lg:items-end lg:justify-between`}>
          <h2 className="t-h2 max-w-3xl">
            Start with your headline. <em>It takes about ten seconds.</em>
          </h2>
          <Link href="/auth/sign-up" className={`${inkButton} shrink-0`}>
            Rewrite my headline
          </Link>
        </div>
      </section>
    </MarketingShell>
  )
}
