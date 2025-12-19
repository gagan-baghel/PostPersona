import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; error_description?: string }>
}) {
  const params = await searchParams

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-6">
      <div className="w-full max-w-md text-center">
        <div className="mb-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <svg className="h-8 w-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Authentication Error</h1>
          <p className="mt-2 text-muted-foreground">Sorry, something went wrong during authentication.</p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          {params?.error && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3">
              <p className="text-sm font-medium text-destructive">{params.error}</p>
              {params.error_description && (
                <p className="mt-1 text-sm text-muted-foreground">{params.error_description}</p>
              )}
            </div>
          )}
          <Button asChild className="w-full">
            <Link href="/auth/login">Back to Sign In</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
