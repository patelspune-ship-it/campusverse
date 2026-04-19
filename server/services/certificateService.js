import fs          from "fs/promises";
import path        from "path";
import { fileURLToPath } from "url";
import puppeteer   from "puppeteer";
import QRCode      from "qrcode";
import { v2 as cloudinary } from "cloudinary";
import Registration from "../models/Registration.js";
import Event        from "../models/Event.js";
import User         from "../models/User.js";
import Club         from "../models/Club.js";
import { createVerificationRequestsForEvent } from "./attendanceRoutingService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
const TEMPLATE_PATH = path.join(__dirname, "../templates/certificate.html");

// Base URL for the frontend verification page
const BASE_URL = process.env.FRONTEND_URL || "http://localhost:8080";

// ── Helpers ────────────────────────────────────────────────────

function generateCertId() {
  const year    = new Date().getFullYear();
  const digits  = String(Math.floor(100000 + Math.random() * 900000));
  return `CV-${year}-${digits}`;
}

function formatEventDate(date) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });
}

async function uploadPdfToCloudinary(buffer, folder = "campusverse/certificates") {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "raw" },
      (error, result) => {
        if (error) reject(error);
        else resolve({ url: result.secure_url, public_id: result.public_id });
      }
    );
    stream.end(buffer);
  });
}

// ── generateCertificate(registration_id) ──────────────────────
export async function generateCertificate(registrationId) {
  // 1. Load registration with all related data
  const reg = await Registration.findById(registrationId)
    .populate({ path: "student_id", select: "name userId email" })
    .populate({
      path:     "event_id",
      select:   "name date end_time club_id",
      populate: { path: "club_id", select: "name logo_url" },
    });

  if (!reg) throw new Error(`Registration ${registrationId} not found`);
  if (reg.attendance_status !== "full")
    throw new Error(`Student does not have full attendance (status: ${reg.attendance_status})`);

  // Don't regenerate if already exists
  if (reg.certificate_path && reg.certificate_id) {
    return { url: reg.certificate_path, cert_id: reg.certificate_id, skipped: true };
  }

  const student = reg.student_id;
  const event   = reg.event_id;
  const club    = event.club_id;

  // 2. Generate a unique certificate ID (retry on collision)
  let certId;
  for (let i = 0; i < 5; i++) {
    const candidate = generateCertId();
    const exists = await Registration.findOne({ certificate_id: candidate });
    if (!exists) { certId = candidate; break; }
  }
  if (!certId) throw new Error("Could not generate unique certificate ID");

  // 3. Generate verification QR code as data URL
  const verifyUrl = `${BASE_URL}/verify/${certId}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 160,
    margin: 1,
    color: { dark: "#4c1d95", light: "#ffffff" },
    errorCorrectionLevel: "M",
  });

  // 4. Load and populate HTML template
  let html = await fs.readFile(TEMPLATE_PATH, "utf8");

  html = html
    .replace(/{{STUDENT_NAME}}/g,     student.name    ?? student.userId)
    .replace(/{{EVENT_NAME}}/g,       event.name)
    .replace(/{{CLUB_NAME}}/g,        club.name)
    .replace(/{{EVENT_DATE}}/g,       formatEventDate(event.date))
    .replace(/{{DURATION_MINUTES}}/g, String(reg.duration_minutes ?? "N/A"))
    .replace(/{{CERT_ID}}/g,          certId)
    .replace(/{{ISSUE_DATE}}/g,       formatEventDate(new Date()))
    .replace(/{{QR_CODE_DATA_URL}}/g, qrDataUrl);

  // 5. Render PDF via puppeteer
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
    const page = await browser.newPage();

    // Wait for Google Fonts to load
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 30000 });

    const pdfBuffer = await page.pdf({
      width:          "297mm",
      height:         "210mm",
      printBackground: true,
      margin:          { top: "0", right: "0", bottom: "0", left: "0" },
    });

    // 6. Upload to Cloudinary
    const { url } = await uploadPdfToCloudinary(Buffer.from(pdfBuffer));

    // 7. Persist to Registration
    await Registration.findByIdAndUpdate(reg._id, {
      certificate_path:         url,
      certificate_id:           certId,
      certificate_generated_at: new Date(),
    });

    console.log(`✅ Certificate generated: ${certId} for ${student.name} — ${event.name}`);
    return { url, cert_id: certId };

  } finally {
    if (browser) await browser.close();
  }
}

// ── generateCertificatesForEvent(event_id) ────────────────────
export async function generateCertificatesForEvent(eventId) {
  const regs = await Registration.find({
    event_id:          eventId,
    attendance_status: "full",
    certificate_path:  null, // only those not yet generated
  }).select("_id");

  if (regs.length === 0) {
    console.log(`⚠️  No eligible registrations for event ${eventId}`);
    return { generated: 0, failed: 0 };
  }

  let generated = 0;
  let failed    = 0;

  for (const reg of regs) {
    try {
      await generateCertificate(reg._id);
      generated++;
    } catch (err) {
      console.error(`❌ Failed cert for reg ${reg._id}:`, err.message);
      failed++;
    }
  }

  // Mark event as processed
  await Event.findByIdAndUpdate(eventId, {
    certificates_generated:    true,
    certificates_generated_at: new Date(),
  });

  console.log(`📜 Event ${eventId}: ${generated} certs generated, ${failed} failed`);

  // Trigger attendance routing (non-blocking)
  setImmediate(() => {
    createVerificationRequestsForEvent(eventId).catch((err) =>
      console.error(`[Routing] Failed for event ${eventId}:`, err.message)
    );
  });

  return { generated, failed };
}

// ── Email stub (Phase 10) ──────────────────────────────────────
// async function sendCertificateEmail(studentEmail, studentName, certUrl, eventName) {
//   // TODO Phase 10 — wire up nodemailer / SendGrid
//   console.log(`[EMAIL STUB] Would send cert to ${studentEmail} for ${eventName}`);
// }
