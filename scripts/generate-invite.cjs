/**
 * generate-invite.js
 * ─────────────────────────────────────────────────────
 * Generates a single-use invite link and writes it to Firestore.
 *
 * Usage:
 *   node scripts/generate-invite.js \
 *     --email hr@razorpay.com \
 *     --company "Razorpay" \
 *     --role recruiter \
 *     --days 7
 *
 * The script prints the full invite URL to stdout.
 *
 * Prerequisites:
 *   npm install firebase-admin uuid minimist   (run once)
 *   Set GOOGLE_APPLICATION_CREDENTIALS env var to your Firebase
 *   service account JSON, or place it at ./service-account.json
 * ─────────────────────────────────────────────────────
 */

const admin   = require("firebase-admin");
const { v4: uuidv4 } = require("uuid");
const args    = require("minimist")(process.argv.slice(2));
const path    = require("path");
const fs      = require("fs");

// ── Config ────────────────────────────────────────────
const BASE_URL        = process.env.RECRUITER_URL || "https://recruiter.capabilio.online/recruiter";
const SA_PATH         = process.env.GOOGLE_APPLICATION_CREDENTIALS
                        || path.join(__dirname, "service-account.json");
const DEFAULT_DAYS    = 7;
// ──────────────────────────────────────────────────────

if (!fs.existsSync(SA_PATH)) {
  console.error(`\n❌  Service account file not found at: ${SA_PATH}`);
  console.error("    Set GOOGLE_APPLICATION_CREDENTIALS or place service-account.json in /scripts\n");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(require(SA_PATH)),
});

const db = admin.firestore();

async function main() {
  const email      = args.email      || null;
  const company    = args.company    || "";
  const role       = args.role       || "recruiter";
  const days       = Number(args.days || DEFAULT_DAYS);
  const companyId  = args.companyId  || null;

  if (!email) {
    console.error("Usage: node scripts/generate-invite.js --email hr@company.com [--company 'Acme'] [--role recruiter] [--days 7]");
    process.exit(1);
  }

  const token      = uuidv4().replace(/-/g, "");
  const expiresAt  = new Date(Date.now() + days * 86_400_000);

  await db.collection("invites").doc(token).set({
    email,
    companyName: company,
    companyId,
    role,
    used:      false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
  });

  const inviteUrl = `${BASE_URL}?invite=${token}`;
  console.log("\n✅  Invite created!\n");
  console.log(`   Email:    ${email}`);
  console.log(`   Company:  ${company || "(not set)"}`);
  console.log(`   Role:     ${role}`);
  console.log(`   Expires:  ${expiresAt.toDateString()}`);
  console.log(`\n   🔗 Invite URL:\n   ${inviteUrl}\n`);

  process.exit(0);
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
