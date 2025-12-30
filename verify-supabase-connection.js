// Quick script to verify which Supabase project you're connected to

console.log('\n🔍 SUPABASE CONNECTION VERIFICATION\n');
console.log('═══════════════════════════════════════════════════════════\n');

// Read environment variables
const envUrl = process.env.VITE_SUPABASE_URL;
const envKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('📋 Environment Variables (.env file):');
console.log('   VITE_SUPABASE_URL:', envUrl || '❌ NOT SET');
console.log('   VITE_SUPABASE_ANON_KEY:', envKey ? '✅ SET' : '❌ NOT SET');
console.log('');

// Show what the app will use
const hardcodedProject = 'kszyvgqhzguyiibpfpwo';
const hardcodedUrl = `https://${hardcodedProject}.supabase.co`;

if (!envUrl || !envKey) {
    console.log('✅ RESULT: Using HARDCODED fallback (safeClient.ts)');
    console.log('   Project ID: ' + hardcodedProject);
    console.log('   URL: ' + hardcodedUrl);
    console.log('   Status: ✅ CORRECT - This is your OLD working project!');
} else {
    const projectId = envUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    console.log('⚠️  RESULT: Using .env file configuration');
    console.log('   Project ID: ' + projectId);
    console.log('   URL: ' + envUrl);

    if (projectId === hardcodedProject) {
        console.log('   Status: ✅ CORRECT - Connected to OLD working project');
    } else if (projectId === 'xwjjbfzvakzvidudsstt') {
        console.log('   Status: ❌ WARNING - Connected to NEW project (needs migration)');
        console.log('   Action Required: Clear .env variables to use old project');
    } else {
        console.log('   Status: ⚠️  UNKNOWN - Verify this is the correct project');
    }
}

console.log('\n═══════════════════════════════════════════════════════════');
console.log('\n✨ To stick with the OLD working project (kszyvgqhzguyiibpfpwo):');
console.log('   1. Remove or comment out VITE_SUPABASE_URL in .env');
console.log('   2. Remove or comment out VITE_SUPABASE_ANON_KEY in .env');
console.log('   3. Restart dev server: npm run dev');
console.log('   4. The app will auto-use the hardcoded old project\n');
