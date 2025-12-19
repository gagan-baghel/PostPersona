"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Coins, Check, Loader2, Sparkles } from "lucide-react"
import { COIN_PACKAGES } from "@/lib/stripe"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { loadStripe } from "@stripe/stripe-js"
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

// Dummy mode flag - set to false for production
const DUMMY_MODE = true

interface CoinPurchaseClientProps {
  currentCoins: number
  userEmail: string
}

export function CoinPurchaseClient({ currentCoins, userEmail }: CoinPurchaseClientProps) {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [checkoutSessionId, setCheckoutSessionId] = useState<string | null>(null)
  const { toast } = useToast()

  const handlePurchase = async (packageId: string) => {
    const pkg = COIN_PACKAGES.find((p) => p.id === packageId)
    if (!pkg) return

    setSelectedPackage(packageId)

    if (DUMMY_MODE) {
      // Dummy mode - simulate purchase instantly
      setIsLoading(true)
      try {
        const response = await fetch("/api/coins/dummy-purchase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ coins: pkg.coins, packageId }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || "Failed to add coins")
        }

        toast({
          title: "Coins Added!",
          description: `${pkg.coins} coins have been added to your account (dummy mode).`,
        })

        // Refresh the page to show updated balance
        window.location.reload()
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to add coins",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
        setSelectedPackage(null)
      }
    } else {
      // Production mode - use Stripe Checkout
      setIsLoading(true)
      try {
        const response = await fetch("/api/coins/create-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priceId: pkg.priceId, coins: pkg.coins }),
        })

        if (!response.ok) {
          throw new Error("Failed to create checkout session")
        }

        const { sessionId } = await response.json()
        setCheckoutSessionId(sessionId)
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to start checkout. Please try again.",
          variant: "destructive",
        })
        setIsLoading(false)
        setSelectedPackage(null)
      }
    }
  }

  const handleCloseCheckout = () => {
    setCheckoutSessionId(null)
    setSelectedPackage(null)
    setIsLoading(false)
  }

  return (
    <>
      {/* Current Balance Card */}
      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Current Balance</p>
            <div className="flex items-center gap-2 mt-1">
              <Coins className="h-8 w-8 text-primary" />
              <span className="text-4xl font-bold">{currentCoins}</span>
              <span className="text-muted-foreground">coins</span>
            </div>
          </div>
          {DUMMY_MODE && (
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="h-3 w-3" />
              Dummy Mode
            </Badge>
          )}
        </div>
      </Card>

      {/* Coin Packages */}
      <div className="grid gap-6 md:grid-cols-3">
        {COIN_PACKAGES.map((pkg) => (
          <Card
            key={pkg.id}
            className={`relative p-6 transition-all hover:border-primary/50 ${
              pkg.badge ? "border-primary/30 shadow-lg" : ""
            }`}
          >
            {pkg.badge && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">{pkg.badge}</Badge>}

            <div className="space-y-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Coins className="h-8 w-8 text-primary" />
                  <span className="text-3xl font-bold">{pkg.coins}</span>
                </div>
                <p className="text-sm text-muted-foreground">coins</p>
              </div>

              <div className="text-center">
                <div className="text-3xl font-bold">${pkg.price}</div>
                <p className="text-sm text-muted-foreground">${(pkg.price / pkg.coins).toFixed(3)} per coin</p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span>~{Math.floor(pkg.coins / 5)} posts with images</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span>No expiration</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span>All avatars included</span>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={() => handlePurchase(pkg.id)}
                disabled={isLoading && selectedPackage === pkg.id}
              >
                {isLoading && selectedPackage === pkg.id ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {DUMMY_MODE ? "Adding..." : "Loading..."}
                  </>
                ) : (
                  `Buy ${pkg.coins} Coins`
                )}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Stripe Checkout Dialog */}
      {checkoutSessionId && (
        <Dialog open={!!checkoutSessionId} onOpenChange={handleCloseCheckout}>
          <DialogContent className="max-w-3xl max-h-[90vh] p-0">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle>Complete Your Purchase</DialogTitle>
              <DialogDescription>Secure payment powered by Stripe</DialogDescription>
            </DialogHeader>

            <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
              <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret: checkoutSessionId }}>
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Info Section */}
      <Card className="p-6 bg-muted/50">
        <h3 className="font-semibold mb-3">How Coins Work</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>• Each post generation costs 3 coins</p>
          <p>• Each image generation costs 2 coins</p>
          <p>• Coins never expire</p>
          <p>• Secure payment processing via Stripe</p>
          {DUMMY_MODE && (
            <p className="text-primary font-medium">• Currently in dummy mode - coins added instantly for testing</p>
          )}
        </div>
      </Card>
    </>
  )
}
