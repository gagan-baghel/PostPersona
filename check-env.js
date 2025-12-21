const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

console.log('🔍 Checking Environment Variables...');

const envPath = path.resolve(process.cwd(), '.env.local');

if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local file NOT FOUND at:', envPath);
    process.exit(1);
}

const envConfig = dotenv.parse(fs.readFileSync(envPath));

const REQUIRED_KEYS = [
    'NEXT_PUBLIC_RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET',
    'SUPABASE_SERVICE_ROLE_KEY'
];

let hasError = false;

REQUIRED_KEYS.forEach(key => {
    if (envConfig[key]) {
        console.log(`✅ ${key}: Found`);
    } else {
        console.error(`❌ ${key}: MISSING`);
        hasError = true;
    }
});

if (hasError) {
    console.error('\n⚠️  Some keys are missing in .env.local!');
    console.log('Please make sure you saved the file correctly.');
} else {
    console.log('\n✅ All keys are present in .env.local');
    console.log('If you still see errors, try stopping the server (Ctrl+C) and running "npm run dev" again.');
}
