"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Coins, Check, Loader2, ShieldCheck } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Script from "next/script"
import { useRouter } from "next/navigation"
import { mutate } from "swr"
import { CACHE_KEYS } from "@/lib/cache-keys"

// Define packages locally to match backend
const COIN_PACKAGES = [
  { id: "starter", coins: 50, price: 199, name: "Starter Pack", badge: null },
  { id: "pro", coins: 150, price: 499, name: "Pro Pack", badge: "Best Value" },
  { id: "agency", coins: 500, price: 1499, name: "Agency Pack", badge: "Popular" },
]

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function CoinPurchaseClient() {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handlePurchase = async (packageId: string) => {
    try {
      setIsLoading(true)
      setSelectedPackage(packageId)

      // 1. Create Order
      const orderRes = await fetch('/api/razorpay/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId })
      })

      if (!orderRes.ok) throw new Error('Failed to create order')

      const orderData = await orderRes.json()

      // 2. Open Razorpay
      const options = {
        key: orderData.keyId, // Use key provided by server
        amount: orderData.amount,
        currency: orderData.currency,
        name: "PersonaPost",
        description: orderData.packageDescription,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          // 3. Verify Payment
          try {
            const verifyRes = await fetch('/api/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                packageId
              })
            })

            if (verifyRes.ok) {
              toast({
                title: "Purchase Successful!",
                description: "Coins have been added to your account.",
              })
              // Invalidate both coins and profile cache using correct keys
              mutate(CACHE_KEYS.coins)
              mutate(CACHE_KEYS.user)

              // Only then refresh to be safe
              router.refresh()
            } else {
              throw new Error('Payment verification failed')
            }
          } catch (verifyError) {
            toast({
              title: "Verification Failed",
              description: "Your payment was successful but we couldn't verify it. Please contact support.",
              variant: "destructive"
            })
          }
        },
        prefill: {
          // We could prefill user details if we passed them as props
          // name: user.name,
          // email: user.email
        },
        theme: {
          color: "#0F172A" // Fits the dark/slate theme
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

      rzp.on('payment.failed', function (response: any) {
        toast({
          title: "Payment Failed",
          description: response.error.description || "Something went wrong",
          variant: "destructive"
        })
      });

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to initiate purchase",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
      setSelectedPackage(null)
    }
  }

  return (
    <>
      <Script
        id="razorpay-checkout-js"
        src="https://checkout.razorpay.com/v1/checkout.js"
      />

      <div className="grid gap-6 md:grid-cols-3">
        {COIN_PACKAGES.map((pkg) => (
          <Card
            key={pkg.id}
            className={`relative p-6 transition-all hover:border-primary/50 text-center ${pkg.badge ? "border-primary/30 shadow-lg bg-primary/5" : ""
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
                <div className="text-3xl font-bold">₹{pkg.price}</div>
                <p className="text-sm text-muted-foreground">₹{(pkg.price / pkg.coins).toFixed(2)} per coin</p>
              </div>

              <div className="space-y-2 text-sm text-left pl-4">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>~{Math.floor(pkg.coins / 3)} posts</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>Secure Razorpay Payment</span>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={() => handlePurchase(pkg.id)}
                disabled={isLoading}
              >
                {isLoading && selectedPackage === pkg.id ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  `Buy Now`
                )}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-8 flex justify-center text-muted-foreground text-sm gap-2">
        <ShieldCheck className="w-4 h-4" />
        <span>Payments secured by razorpay</span>
      </div>
    </>
  )
}
