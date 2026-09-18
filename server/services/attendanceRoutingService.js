import Registration  from "../models/Registration.js";
import Event         from "../models/Event.js";
import User          from "../models/User.js";
import Division      from "../models/Division.js";
import AttendanceVerificationRequest from "../models/AttendanceVerificationRequest.js";
import { sendPushNotification } from "./pushNotificationService.js";

// Routes verified attendance to the student's class teacher — one request
// per student per event. No timetable/interval-overlap logic: the class
// teacher is the single, stable routing target for their division.
export async function createVerificationRequestsForEvent(eventId) {
  const event = await Event.findById(eventId);
  if (!event) throw new Error(`Event ${eventId} not found`);

  // All fully-attended registrations for this event
  const registrations = await Registration.find({
    event_id:          eventId,
    attendance_status: "full",
  }).populate("student_id", "name userId division_id");

  let created = 0;
  let skipped = 0;

  for (const reg of registrations) {
    const student = reg.student_id;
    if (!student?.division_id) {
      console.warn(`⚠️  Student ${student?.userId ?? reg.student_id} has no division assigned — skipping routing`);
      skipped++;
      continue;
    }

    const division = await Division.findById(student.division_id).select("class_teacher_id year name");
    if (!division) {
      console.warn(`⚠️  Division ${student.division_id} not found for student ${student.userId} — skipping routing`);
      skipped++;
      continue;
    }

    if (!division.class_teacher_id) {
      console.warn(`⚠️  Division ${division.year} ${division.name} (${division._id}) has no class teacher assigned — skipping routing for student ${student.userId ?? student._id}`);
      skipped++;
      continue;
    }

    // Idempotent: skip if a request already exists for this student+event
    const exists = await AttendanceVerificationRequest.findOne({
      student_id: student._id,
      event_id:   eventId,
    });
    if (exists) { skipped++; continue; }

    await AttendanceVerificationRequest.create({
      student_id:      student._id,
      faculty_id:      division.class_teacher_id,
      division_id:     division._id,
      event_id:        eventId,
      registration_id: reg._id,
      event_name:      event.name,
      event_date:      event.date,
      event_entry_time: reg.entry_scanned_at  ?? null,
      event_exit_time:  reg.exit_scanned_at   ?? null,
      event_duration_minutes: reg.duration_minutes ?? null,
      certificate_id:   reg.certificate_id    ?? null,
    });
    created++;

    User.findOne({ faculty_id: division.class_teacher_id }).select("_id").then((facultyUser) => {
      if (!facultyUser) return;
      sendPushNotification(
        facultyUser._id,
        "New verification request",
        `New attendance verification request from ${student.name ?? student.userId}`,
        { type: "verification_request" }
      );
    }).catch(() => {});
  }

  console.log(`📋 Routing complete for "${event.name}": ${created} created, ${skipped} skipped`);
  return { created, skipped };
}
