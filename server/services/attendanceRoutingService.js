import Registration  from "../models/Registration.js";
import Event         from "../models/Event.js";
import User          from "../models/User.js";
import Timetable     from "../models/Timetable.js";
import AttendanceVerificationRequest from "../models/AttendanceVerificationRequest.js";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Parse "HH:MM" to total minutes from midnight
function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// Check if two time ranges overlap (inclusive start, exclusive end)
// Overlap: slotStart < eventEnd AND slotEnd > eventStart
function overlaps(slotStart, slotEnd, eventStart, eventEnd) {
  return slotStart < eventEnd && slotEnd > eventStart;
}

export async function createVerificationRequestsForEvent(eventId) {
  const event = await Event.findById(eventId);
  if (!event) throw new Error(`Event ${eventId} not found`);

  // We need start_time and end_time on the event to determine which lectures were missed
  if (!event.start_time || !event.end_time) {
    console.log(`⚠️  Event ${event.name} has no start/end times — skipping routing`);
    return { created: 0, skipped: 0 };
  }

  const eventDay = DAYS[new Date(event.date).getDay()];
  const eventStartMin = toMinutes(event.start_time);
  const eventEndMin   = toMinutes(event.end_time);

  // All fully-attended registrations for this event
  const registrations = await Registration.find({
    event_id:          eventId,
    attendance_status: "full",
  }).populate("student_id", "name userId division_id");

  let created = 0;
  let skipped = 0;

  for (const reg of registrations) {
    const student = reg.student_id;
    if (!student?.division_id) { skipped++; continue; }

    // Find all lecture slots on that day for the student's division that overlap the event
    const slots = await Timetable.find({
      division_id: student.division_id,
      day:         eventDay,
      slot_type:   "lecture",
      faculty_id:  { $ne: null },
    });

    const overlapping = slots.filter((slot) =>
      overlaps(
        toMinutes(slot.start_time),
        toMinutes(slot.end_time),
        eventStartMin,
        eventEndMin
      )
    );

    for (const slot of overlapping) {
      // Idempotent: skip if request already exists
      const exists = await AttendanceVerificationRequest.findOne({
        student_id:        student._id,
        event_id:          eventId,
        timetable_slot_id: slot._id,
      });
      if (exists) { skipped++; continue; }

      await AttendanceVerificationRequest.create({
        student_id:        student._id,
        faculty_id:        slot.faculty_id,
        event_id:          eventId,
        registration_id:   reg._id,
        timetable_slot_id: slot._id,
        lecture_date:      event.date,
        lecture_start_time: slot.start_time,
        lecture_end_time:  slot.end_time,
        subject_name:      slot.subject_name,
        event_name:        event.name,
        event_entry_time:  reg.entry_scanned_at  ?? null,
        event_exit_time:   reg.exit_scanned_at   ?? null,
        event_duration_minutes: reg.duration_minutes ?? null,
        certificate_id:    reg.certificate_id    ?? null,
      });
      created++;
    }
  }

  console.log(`📋 Routing complete for "${event.name}": ${created} created, ${skipped} skipped`);
  return { created, skipped };
}
