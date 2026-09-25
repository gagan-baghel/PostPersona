import Link from "next/link"
import type { ReactNode } from "react"
import { Globe } from "lucide-react"

import { BrandLogo } from "@/components/brand-logo"

// Marketing pages use their own buttons: the app's Button carries a blue glow meant for the dark UI.
// Radius is 4px on controls, 8px on LinkedIn-shaped cards (matching LinkedIn), 0 on rules and tables.
export const inkButton =
  "inline-flex h-11 items-center justify-center gap-2 rounded-[4px] bg-foreground px-5 text-base font-medium text-background hover:bg-foreground/85"
export const textLink = "underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground"
export const container = "mx-auto w-full max-w-6xl px-5 sm:px-8"

const navLinks = [
  { label: "What it reworks", href: "/#reworks" },
  { label: "Pricing", href: "/pricing" },
  { label: "Questions", href: "/#questions" },
]

/** Wraps public pages in the paper/ink palette (see .marketing in globals.css). */
export function MarketingShell({ signedIn = false, children }: { signedIn?: boolean; children: ReactNode }) {
  return (
    <div className="marketing flex min-h-screen flex-col selection:bg-[var(--pen)] selection:text-white">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:bg-foreground focus:px-3 focus:py-2 focus:text-background">
        Skip to content
      </a>
      {/* Sticky only where there's room for it; on phones it would eat a tenth of the screen. */}
      <header className="z-50 border-b border-border bg-background md:sticky md:top-0">
        <div className={`${container} flex h-16 items-center justify-between gap-4`}>
          <Link href="/" className="flex min-w-0 items-center gap-2.5 font-semibold">
            <BrandLogo size={28} className="h-7 w-7 rounded-[4px] border-0" />
            PersonaPost
          </Link>
          <nav aria-label="Main" className="t-small hidden items-center gap-8 text-muted-foreground md:flex">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-foreground">
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="t-small flex shrink-0 items-center gap-5">
            {signedIn ? (
              <Link href="/dashboard" className={`${inkButton} h-9 px-4 text-sm`}>
                Open PersonaPost
              </Link>
            ) : (
              <>
                <Link href="/auth/login" className="hidden text-muted-foreground hover:text-foreground min-[400px]:inline">
                  Sign in
                </Link>
                <Link href="/auth/sign-up" className={`${inkButton} h-9 px-4 text-sm`}>
                  Start free
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main id="main" className="flex-1">
        {children}
      </main>

      <footer className="border-t border-border">
        <div className={`${container} grid gap-6 py-12 md:grid-cols-[1fr_auto] md:items-end`}>
          <div>
            <div className="flex items-center gap-2.5 font-semibold">
              <BrandLogo size={24} className="h-6 w-6 rounded-[4px] border-0" />
              PersonaPost
            </div>
            <p className="t-small mt-3 max-w-sm text-muted-foreground">Headline, About, posts and replies for LinkedIn. Nothing goes out without you.</p>
          </div>
          <nav aria-label="Footer" className="t-small flex flex-wrap gap-x-6 gap-y-2 text-muted-foreground">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-foreground">
                {link.label}
              </Link>
            ))}
            <Link href="/auth/login" className="hover:text-foreground">Sign in</Link>
          </nav>
        </div>
        <p className={`${container} t-meta pb-10 text-muted-foreground`}>
          © {new Date().getFullYear()} PersonaPost · LinkedIn is a trademark of LinkedIn Corporation. PersonaPost is independent and not
          endorsed by LinkedIn.
        </p>
      </footer>
    </div>
  )
}

/** Proofreader's margin number. The pen colour only ever marks something a human should look at. */
export function Mark({ n }: { n: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--pen)] font-mono text-[11px] font-medium leading-none text-white"
    >
      {n}
    </span>
  )
}

/** A gap the model left instead of inventing a fact. */
export function Gap({ children }: { children: ReactNode }) {
  return <span className="underline decoration-[var(--pen)] decoration-dashed decoration-2 underline-offset-4">{children}</span>
}

export function MarginNotes({ caption, notes }: { caption: ReactNode; notes: ReactNode[] }) {
  return (
    <figcaption className="t-small mt-5 text-muted-foreground">
      <p className="t-meta">{caption}</p>
      <ol className="mt-3 space-y-2.5">
        {notes.map((note, i) => (
          <li key={i} className="flex gap-3">
            <Mark n={i + 1} />
            <span className="max-w-prose">{note}</span>
          </li>
        ))}
      </ol>
    </figcaption>
  )
}

// LinkedIn's own card furniture, so the specimen reads as "my profile" at a glance.
const linkedInCard =
  "overflow-hidden rounded-[8px] border border-[#e0dfdc] bg-white text-[#191919] [font-family:-apple-system,system-ui,'Segoe_UI',Roboto,sans-serif]"

// Unedited Claude Code output (claude-sonnet-5) for the maker's profile, generated with PersonaPost's own prompts.
const HEADLINE_AFTER =
  "Building PersonaPost so busy professionals stop staring at blank LinkedIn drafts. It rewrites your notes into your voice and drafts replies too."
const HEADLINE_GAP = "[X] users so far."
const ABOUT_LINES = [
  "I write LinkedIn posts the way most people write code: badly, at 11pm, then never again.",
  "That's why I built PersonaPost.",
]

export function ProfileFigure() {
  return (
    <figure>
      <div className={linkedInCard}>
        <div className="h-16 bg-[#a0b4c0] sm:h-20" />
        <div className="px-5 pb-5">
          <div className="-mt-9 flex h-[72px] w-[72px] items-center justify-center rounded-full border-4 border-white bg-[#56687a] text-xl font-semibold text-white">
            GB
          </div>
          <p className="mt-2 text-xl font-semibold">Gagan Baghel</p>
          <div className="mt-1.5 flex items-start gap-3">
            <div className="min-w-0 text-[14px] leading-snug">
              <p className="text-[#666] line-through decoration-[var(--pen)] decoration-2">Software Developer</p>
              <p className="mt-1">
                {HEADLINE_AFTER} <Gap>{HEADLINE_GAP}</Gap>
              </p>
            </div>
            <Mark n={1} />
          </div>
        </div>

        <div className="border-t border-[#e8e8e8] px-5 py-4 text-[14px] leading-snug">
          <p className="text-base font-semibold">About</p>
          <div className="mt-2 flex items-start gap-3">
            <div className="min-w-0 space-y-2">
              {ABOUT_LINES.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
            <Mark n={2} />
          </div>
          <div className="mt-3 flex items-center gap-2 text-[13px] text-[#666]">
            <span className="h-0 flex-1 border-t-2 border-dashed border-[var(--pen)]" />
            …see more
          </div>
        </div>

        <div className="border-t border-[#e8e8e8] px-5 py-4 text-[14px]">
          <p className="text-base font-semibold">Activity</p>
          <div className="mt-2 flex items-start justify-between gap-3">
            <p className="text-[#666]">
              3 drafts waiting for your approval
              <br />
              Next one goes out Tue 9:30
            </p>
            <Mark n={3} />
          </div>
        </div>
      </div>

      <MarginNotes
        caption="Fig. 1: One pass over the maker's profile. Unedited output from Claude Code."
        notes={[
          <>Rewritten from a two-word headline. It needed a number it didn&apos;t have, so it left a gap for you instead of making one up.</>,
          <>LinkedIn cuts your About off after about two lines. These two are written to earn the click on “see more”.</>,
          <>Posts sit in a queue until you approve them. Then they go out at the time you usually post.</>,
        ]}
      />
    </figure>
  )
}

// Same run as above: a post drafted from four rough notes.
const POST_PARAGRAPHS = [
  "One decent LinkedIn post used to take me a whole evening.",
  "Write something, hate it, rewrite it, second-guess the hook, close the tab. Repeat that enough times and you just stop posting. That's what was happening to me.",
  "So I built PersonaPost.",
  "I paste rough notes, whatever is in my head, half-formed thoughts, a meeting recap, a rant. It gives me back a draft in my own voice, not some generic LinkedIn-guru voice.",
  "Nothing publishes automatically. I read every draft, edit what's off, approve it. Then it goes out at my usual posting time, so it doesn't look like I dumped five posts at 2am.",
  "[…]",
]

export const POST_NOTES = [
  "- one decent LinkedIn post takes me a whole evening, so I rarely post",
  "- built PersonaPost: paste rough notes, get a draft in my own voice",
  "- nothing publishes until I approve it, then it goes out at my usual time",
  "- runs on my existing Claude Code subscription, so drafts cost nothing extra",
]

export function PostFigure() {
  return (
    <figure>
      <div className="rounded-[2px] border border-border bg-card px-4 py-3">
        <p className="t-meta text-muted-foreground">Notes you typed</p>
        <pre className="t-meta mt-2 whitespace-pre-wrap">{POST_NOTES.join("\n")}</pre>
      </div>
      <div className={`${linkedInCard} mt-3`}>
        <div className="flex items-start gap-2.5 px-4 pt-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#56687a] text-[15px] font-semibold text-white">GB</div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-[14px] font-semibold">Gagan Baghel</p>
            <p className="truncate text-[12px] text-[#666]">Building PersonaPost</p>
            <p className="mt-0.5 flex items-center gap-1 text-[12px] text-[#666]">
              Draft · <Globe className="h-3 w-3" aria-hidden="true" />
            </p>
          </div>
        </div>
        <div className="space-y-3 px-4 py-3 text-[14px] leading-[1.45]">
          {POST_PARAGRAPHS.map((p) => (
            <p key={p} className={p === "[…]" ? "text-[#666]" : undefined}>
              {p}
            </p>
          ))}
          <p className="flex items-start gap-3">
            <span>
              Still deciding <Gap>[what&apos;s next for it / whether to open it up to others]</Gap>. For now it&apos;s just solving my own
              problem, which is usually a good sign.
            </span>
            <Mark n={1} />
          </p>
          <p className="text-[#0a66c2]">#buildinpublic #indiehacker</p>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-dashed border-border bg-[#fbf8f2] px-4 py-2.5">
          <span className="t-meta text-[var(--pen)]">Waiting for your approval</span>
          <Mark n={2} />
        </div>
      </div>
      <MarginNotes
        caption="Fig. 2: Drafted from the four notes above. Unedited; two paragraphs skipped where marked […]."
        notes={[
          <>The notes didn&apos;t say what&apos;s next, so the draft asks you. You fill the gap or cut the line before approving.</>,
          <>Nothing publishes from here until you press approve.</>,
        ]}
      />
    </figure>
  )
}
