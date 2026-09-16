export type CampusVerseUser = { id: string; userId: string; email?: string | null; name?: string | null; mobile?: string | null; role: "student" | "club_admin" | "faculty" | "super_admin"; institute_id?: string | null; club_id?: string | null; faculty_id?: string | null; must_change_password?: boolean };
export type LoginResponse = { message: string; token: string; user: CampusVerseUser };
export type Event = { _id: string; name: string; description: string; date: string; start_time: string; end_time: string; venue: string; category: string; max_participants: number; registration_fee?: number; poster_url?: string | null; registrationCount?: number; club_id?: { name?: string; logo_url?: string | null } | null };
export type StudentStats = { eventsRegistered: number; eventsAttended: number; certificatesEarned: number; activeRegistrations: number };

export type AttendanceStatus = "not_attended" | "partial" | "full";

export type Registration = { _id: string; student_id: string; event_id: string; entry_scanned: boolean; exit_scanned: boolean; attendance_status: AttendanceStatus; duration_minutes: number | null; qr_code_path: string | null; qr_token: string | null; certificate_path: string | null; certificate_id: string | null; certificate_generated_at: string | null; registered_at: string };

// GET /student/my-registrations — upcoming events the student registered for.
export type RegisteredEvent = Event & { registration_id: string | null; qr_code_path: string | null; qr_token: string | null; registered_at: string | null; attendance_status: AttendanceStatus; entry_scanned: boolean; exit_scanned: boolean };

// GET /student/my-attended — past events with recorded attendance.
export type AttendedEvent = Event & { attendance_status: "partial" | "full"; duration_minutes: number | null; certificate_path: string | null; certificate_id: string | null; certificate_generated_at: string | null };

// GET /student/my-certificates
export type Certificate = { _id: string; name: string; date: string; venue: string; category: string; poster_url: string | null; club_name: string; club_logo: string | null; certificate_path: string; certificate_id: string; certificate_generated_at: string; duration_minutes: number | null };

export type EventStatus = "pending" | "approved" | "rejected" | "completed" | "cancelled";
export type EventCategory = "technical" | "cultural" | "sports" | "other";

// GET /club/events — the club admin's own events (all statuses, no registration count).
export type ClubEvent = Event & { status: EventStatus; is_past_event: boolean };

export type CreateEventPayload = { name: string; description: string; date: string; start_time: string; end_time: string; venue: string; max_participants: number; registration_fee?: number; category: EventCategory };

// GET /club/events/scanner-list
export type ScannerEvent = { _id: string; name: string; date: string; start_time?: string; end_time?: string; venue: string };

// GET /club/events/:id/attendees
export type Attendee = { registration_id: string; student_name: string; student_prn: string; student_email: string; registered_at: string | null; attendance_status: AttendanceStatus; entry_scanned: boolean; entry_scanned_at: string | null; exit_scanned: boolean; exit_scanned_at: string | null; duration_minutes: number | null };
export type AttendeeStats = { total: number; entry_scanned: number; exit_scanned: number; full_attendance: number; partial: number };
export type EventAttendeesResponse = { event: { _id: string; name: string; date: string; start_time?: string; venue: string; max_participants: number }; attendees: Attendee[]; stats: AttendeeStats };

// POST /attendance/entry | /attendance/exit
export type ScanResponse = { success: true; scan_type: "entry" | "exit"; student_name: string; student_prn: string; event_name: string; entry_scanned_at?: string; exit_scanned_at?: string; duration_minutes?: number; message: string };

export type VerificationStatus = "pending" | "approved" | "rejected";

// GET /faculty/verifications?status=...
export type VerificationRequest = {
  _id: string;
  student_id: { name: string; userId: string; division_id?: { division_code: string; year?: string } } | null;
  event_id: { name: string; club_id?: { name: string } } | null;
  subject_name: string;
  lecture_date: string;
  lecture_start_time: string;
  lecture_end_time: string;
  event_duration_minutes: number | null;
  event_entry_time: string | null;
  event_exit_time: string | null;
  certificate_id: string | null;
  status: VerificationStatus;
  rejection_reason: string | null;
  faculty_action_at: string | null;
};

// GET /admin/stats
export type AdminStats = { students: number; clubs: number; institutes: number; events: number; pendingEvents: number; upcomingEvents: number };

// GET /admin/pending-events
export type PendingAdminEvent = Event & { created_at: string };

// GET /admin/events?status=&club_id=&date_from=&date_to=
export type AdminEvent = Event & { status: EventStatus; is_past_event: boolean; registrationCount: number };

// GET /admin/clubs?institute_id=&category=&search=
export type AdminClub = { _id: string; name: string; category: EventCategory | null; logo_url: string | null; profile_completed: boolean; eventCount: number; institute_id: { _id: string; name: string; code: string } | null; admin: { userId: string; email: string } | null };
