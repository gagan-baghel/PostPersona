const fs = require("fs")
const path = require("path")
const dotenv = require("dotenv")

console.log("Checking required environment variables...")

const envPath = path.resolve(process.cwd(), ".env.local")

if (!fs.existsSync(envPath)) {
  console.error(".env.local not found at:", envPath)
  process.exit(1)
}

const envConfig = dotenv.parse(fs.readFileSync(envPath))

const REQUIRED_KEYS = [
  "NEXT_PUBLIC_CONVEX_URL",
  "SESSION_SECRET",
]

const OPTIONAL_KEYS = [
  "CONVEX_DEPLOYMENT",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_CONVEX_SITE_URL",
  "GROK_API_KEY", // optional when the Claude Code or Codex CLI is installed
  "GROK_MODEL",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME",
  "LINKEDIN_CLIENT_ID",
  "LINKEDIN_CLIENT_SECRET",
  "LINKEDIN_REDIRECT_URI",
  "LINKEDIN_REQUEST_OFFLINE_ACCESS",
]

let hasError = false

for (const key of REQUIRED_KEYS) {
  if (envConfig[key]) {
    console.log(`OK   ${key}`)
  } else {
    console.error(`MISS ${key}`)
    hasError = true
  }
}

for (const key of OPTIONAL_KEYS) {
  if (envConfig[key]) {
    console.log(`OPT  ${key}`)
  }
}

if (hasError) {
  console.error("\nMissing one or more required keys.")
  process.exit(1)
}

console.log("\nAll required environment variables are present.")
