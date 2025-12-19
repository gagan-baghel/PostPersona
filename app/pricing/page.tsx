import Link from "next/link"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"

export default async function PricingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Perfect for getting started with AI-powered content creation",
      features: [
        "1 AI Avatar",
        "10 Posts per month",
        "Basic personality customization",
        "Post history",
        "Community support",
      ],
      cta: user ? "Current Plan" : "Get Started",
      href: user ? "/dashboard" : "/auth/sign-up",
      popular: false,
    },
    {
      name: "Pro",
      price: "$19",
      period: "per month",
      description: "For professionals who need unlimited content generation",
      features: [
        "Unlimited AI Avatars",
        "Unlimited Posts",
        "Advanced personality & style options",
        "Post analytics",
        "Priority support",
        "Export to LinkedIn",
      ],
      cta: "Upgrade to Pro",
      href: user ? "/dashboard" : "/auth/sign-up",
      popular: true,
    },
    {
      name: "Team",
      price: "$49",
      period: "per month",
      description: "For teams managing multiple brands and voices",
      features: [
        "Everything in Pro",
        "Up to 5 team members",
        "Shared avatar library",
        "Team analytics dashboard",
        "Custom branding",
        "Dedicated account manager",
      ],
      cta: "Contact Sales",
      href: user ? "/dashboard" : "/auth/sign-up",
      popular: false,
    },
  ]

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary" />
            <span className="text-xl font-bold">PersonaPost</span>
          </Link>
          <div className="flex items-center gap-4">
            {user ? (
              <Button asChild>
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost">
                  <Link href="/auth/login">Sign In</Link>
                </Button>
                <Button asChild>
                  <Link href="/auth/sign-up">Get Started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <div className="container mx-auto px-6 py-16">
          <div className="mb-16 text-center">
            <h1 className="text-balance text-4xl font-bold tracking-tight md:text-5xl">Choose Your Plan</h1>
            <p className="mt-4 text-pretty text-lg text-muted-foreground">
              Start free, upgrade when you need more. No credit card required.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-lg border bg-card p-8 ${
                  plan.popular ? "border-primary shadow-lg shadow-primary/20" : ""
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-sm font-medium text-primary-foreground">
                    Most Popular
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-2xl font-bold">{plan.name}</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">/ {plan.period}</span>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{plan.description}</p>
                </div>

                <ul className="mb-8 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <svg
                        className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  asChild
                  size="lg"
                  variant={plan.popular ? "default" : "outline"}
                  className={plan.popular ? "" : "bg-transparent"}
                >
                  <Link href={plan.href}>{plan.cta}</Link>
                </Button>
              </div>
            ))}
          </div>

          {/* FAQ Section */}
          <div className="mx-auto mt-24 max-w-3xl">
            <h2 className="mb-8 text-center text-3xl font-bold tracking-tight">Frequently Asked Questions</h2>
            <div className="space-y-6">
              <div className="rounded-lg border bg-card p-6">
                <h3 className="mb-2 font-semibold">Can I change plans later?</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Yes, you can upgrade or downgrade your plan at any time. Changes will be reflected in your next
                  billing cycle.
                </p>
              </div>

              <div className="rounded-lg border bg-card p-6">
                <h3 className="mb-2 font-semibold">What happens if I exceed my post limit?</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  On the Free plan, you'll be prompted to upgrade once you reach 10 posts per month. Pro and Team plans
                  have unlimited posts.
                </p>
              </div>

              <div className="rounded-lg border bg-card p-6">
                <h3 className="mb-2 font-semibold">How does the AI generation work?</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Our AI uses your avatar's personality and writing style to create authentic LinkedIn posts. Each
                  avatar learns from your preferences to generate content that sounds like you.
                </p>
              </div>

              <div className="rounded-lg border bg-card p-6">
                <h3 className="mb-2 font-semibold">Is my data secure?</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Absolutely. We use industry-standard encryption and security practices. Your data is stored securely
                  and never shared with third parties.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="container mx-auto px-6 py-8">
          <div className="text-center text-sm text-muted-foreground">© 2025 PersonaPost. All rights reserved.</div>
        </div>
      </footer>
    </div>
  )
}
