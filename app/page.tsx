import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { getSessionUserIdFromServerCookies } from "@/lib/auth/session"
import { BrandLogo } from "@/components/brand-logo"

export default async function HomePage() {
  const userId = await getSessionUserIdFromServerCookies()
  const year = new Date().getFullYear()

  if (userId) {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="ui-glass border-b border-border">
        <div className="container mx-auto flex min-h-14 items-center justify-between gap-2 px-3 sm:h-16 sm:px-6">
          <div className="flex items-center gap-2 min-w-0">
            <BrandLogo size={32} className="h-7 w-7 sm:h-8 sm:w-8 shrink-0" />
            <span className="text-sm font-bold truncate sm:text-xl">PersonaPost</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <Button asChild variant="ghost" size="sm" className="hidden min-[380px]:inline-flex">
              <Link href="/auth/login">Sign In</Link>
            </Button>
            <Button asChild size="sm" className="px-2.5 sm:px-3">
              <Link href="/auth/sign-up">
                <span className="sm:hidden">Start</span>
                <span className="hidden sm:inline">Get Started</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <div className="container mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="ui-glass mx-auto max-w-4xl rounded-2xl border p-6 text-center sm:p-8">
            <h1 className="text-balance text-4xl sm:text-5xl md:text-6xl font-bold leading-tight tracking-tight">
              AI-Powered LinkedIn Content Creation
            </h1>
            <p className="mt-6 text-pretty text-base sm:text-lg md:text-xl leading-relaxed text-muted-foreground">
              Create engaging LinkedIn posts with AI personas that match your unique voice and style. Build your
              personal brand with authentic content that resonates.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row flex-wrap items-center justify-center gap-4">
              <Button asChild size="lg" className="text-base w-full sm:w-auto">
                <Link href="/auth/sign-up">Start Creating for Free</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-base bg-transparent w-full sm:w-auto">
                <Link href="/pricing">View Pricing</Link>
              </Button>
            </div>
          </div>

          {/* Features Grid */}
          <div className="mx-auto mt-16 sm:mt-24 grid max-w-5xl gap-6 sm:gap-8 sm:grid-cols-2 md:grid-cols-3">
            <div className="rounded-lg border bg-card p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <svg
                  className="h-6 w-6 text-primary"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold">AI Personas</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Create custom AI personas that capture your unique personality, expertise, and writing style.
              </p>
            </div>

            <div className="rounded-lg border bg-card p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <svg
                  className="h-6 w-6 text-primary"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold">Smart Generation</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Generate engaging LinkedIn posts on any topic with AI that understands your brand voice.
              </p>
            </div>

            <div className="rounded-lg border bg-card p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <svg
                  className="h-6 w-6 text-primary"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold">Content History</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Access all your generated posts anytime. Edit, refine, and reuse your best content.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="container mx-auto px-6 py-8">
          <div className="text-center text-sm text-muted-foreground">© {year} PersonaPost. All rights reserved.</div>
        </div>
      </footer>
    </div>
  )
}
