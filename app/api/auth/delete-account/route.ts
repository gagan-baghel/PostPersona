import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function DELETE() {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // We need usage of service role to delete from auth.users usually, 
        // OR we relies on a function. 
        // But actually, supabase.auth.admin.deleteUser(id) is needed to fully remove from Auth.
        // The client-side user CANNOT delete themselves from auth system directly via standard client sdk usually.

        // Check if we have service key
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            console.error("Missing Service Role Key for account deletion")
            return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 })
        }

        const { createClient: createSupabaseClient } = require('@supabase/supabase-js')
        const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        )

        // Delete from auth.users (Cascades to public tables if set up correctly)
        const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id)

        if (error) {
            console.error("Error deleting user:", error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Delete account error:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
