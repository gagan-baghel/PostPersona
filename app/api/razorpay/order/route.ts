import { NextRequest, NextResponse } from "next/server";
import { razorpay } from "@/lib/razorpay";
import { createServerClient } from "@/lib/supabase/server";

export const COIN_PACKAGES = [
    { id: "starter", coins: 50, price: 199, name: "Starter Pack" },
    { id: "pro", coins: 150, price: 499, name: "Pro Pack" },
    { id: "agency", coins: 500, price: 1499, name: "Agency Pack" },
];

export async function POST(req: NextRequest) {
    try {
        const supabase = await createServerClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { packageId } = await req.json();
        const pkg = COIN_PACKAGES.find((p) => p.id === packageId);

        if (!pkg) {
            return NextResponse.json({ error: "Invalid package" }, { status: 400 });
        }

        const options = {
            amount: pkg.price * 100, // Amount in paise
            currency: "INR",
            receipt: `rcpt_${Date.now()}_${user.id.slice(0, 4)}`,
            notes: {
                userId: user.id,
                packageId: pkg.id,
                coins: pkg.coins,
            },
        };

        const order = await razorpay.orders.create(options);

        return NextResponse.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: process.env.RAZORPAY_KEY_ID,
            packageName: pkg.name,
            packageDescription: `Purchase ${pkg.coins} coins`,
        });
    } catch (error) {
        console.error("Error creating Razorpay order:", error);
        return NextResponse.json(
            { error: "Failed to create order" },
            { status: 500 }
        );
    }
}
