import Stripe from "stripe"

let stripeInstance: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not defined")
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia",
      typescript: true,
    })
  }
  return stripeInstance
}

// Coin package configurations
export const COIN_PACKAGES = [
  {
    id: "100",
    name: "100 Coins",
    coins: 100,
    price: 4.99,
    priceId: "price_1SfIG5EKqulcziPph0w47m85",
    productId: "prod_TcXJtDiAehY0mS",
    badge: null,
  },
  {
    id: "500",
    name: "500 Coins",
    coins: 500,
    price: 19.99,
    priceId: "price_1SfIGAEKqulcziPpaP11W4TC",
    productId: "prod_TcXJN87IwKihLm",
    badge: "Popular",
  },
  {
    id: "1000",
    name: "1000 Coins",
    coins: 1000,
    price: 34.99,
    priceId: "price_1SfIGFEKqulcziPprT8JTXj9",
    productId: "prod_TcXJukhWcC6TyT",
    badge: "Best Value",
  },
] as const
