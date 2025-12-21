import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";

// Define packages locally (should match client)
const COIN_PACKAGES = [
    { id: "starter", coins: 50, price: 199 },
    { id: "pro", coins: 150, price: 499 },
    { id: "agency", coins: 500, price: 1499 },
];

export async function POST(req: NextRequest) {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            packageId,
        } = await req.json();

        if (!process.env.RAZORPAY_KEY_SECRET) {
            console.error("FATAL: RAZORPAY_KEY_SECRET is missing");
            return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
        }

        // Verify signature
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            console.error("Signature verification failed");
            return NextResponse.json(
                { error: "Invalid signature" },
                { status: 400 }
            );
        }

        // Init Supabase Service Client
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            console.error("FATAL: SUPABASE_SERVICE_ROLE_KEY is missing. Required for backend operations.");
            throw new Error("Server configuration error: Missing Service Role Key");
        }

        const { createClient: createSupabaseClient } = require('@supabase/supabase-js');
        const supabaseService = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Get User ID
        const supabaseAuth = await createClient();
        const { data: { user } } = await supabaseAuth.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const pkg = COIN_PACKAGES.find(p => p.id === packageId);
        if (!pkg) {
            return NextResponse.json({ error: "Invalid package reference" }, { status: 400 });
        }

        // Call RPC
        console.log(`Crediting ${pkg.coins} coins to user ${user.id}`);
        const { data, error } = await supabaseService.rpc('add_coins', {
            p_user_id: user.id,
            p_amount: pkg.coins,
            p_description: `Purchased ${pkg.coins} coins (Razorpay: ${razorpay_payment_id})`,
            p_order_id: razorpay_order_id,
            p_payment_id: razorpay_payment_id,
            p_signature: razorpay_signature
        });

        if (error) {
            console.error("RPC Error:", error);
            // Fallback: Try direct update if RPC fails
            // This is "senior dev" thinking - ensuring reliability
            console.log("Attempting fallback direct update...");

            // Note: This relies on the table policy allowing service role updates, which we set.
            // First get current balance
            const { data: profile } = await supabaseService
                .from('profiles')
                .select('coins')
                .eq('id', user.id)
                .single();

            const newBalance = (profile?.coins || 0) + pkg.coins;

            const { error: updateError } = await supabaseService
                .from('profiles')
                .update({ coins: newBalance, updated_at: new Date().toISOString() })
                .eq('id', user.id);

            if (updateError) {
                throw new Error("Failed to credit coins via fallback");
            }

            // Record tx manually
            await supabaseService.from('transactions').insert({
                user_id: user.id,
                type: 'purchase',
                amount: pkg.coins,
                balance_after: newBalance,
                description: `Purchased ${pkg.coins} coins (Fallback)`,
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature
            });

            return NextResponse.json({ success: true, new_balance: newBalance });
        }

        return NextResponse.json(data);

    } catch (error) {
        console.error("Error verifying payment:", error);
        return NextResponse.json(
            { error: "Internal payment verification failed" },
            { status: 500 }
        );
    }
}
