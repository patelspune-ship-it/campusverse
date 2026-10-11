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

// venue_id replaces the old free-text venue — the backend derives the
// display string from the chosen Venue, so the client never sends `venue`.
export type CreateEventPayload = { name: string; description: string; date: string; start_time: string; end_time: string; venue_id: string; max_participants: number; registration_fee?: number; category: EventCategory };

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
// Routing is now class-teacher based: one request per student per event,
// carrying the event details + verified entry/exit rather than a
// timetable slot's subject/lecture time (those fields no longer exist).
export type VerificationRequest = {
  _id: string;
  student_id: { name: string; userId: string; division_id?: { name: string; year?: string } | null } | null;
  event_id: { name: string; club_id?: { name: string } | null } | null;
  event_name: string;
  event_date: string | null;
  event_duration_minutes: number | null;
  event_entry_time: string | null;
  event_exit_time: string | null;
  certificate_id: string | null;
  status: VerificationStatus;
  rejection_reason: string | null;
  faculty_action_at: string | null;
};

// GET /faculty/my-division — the division(s) this faculty is class teacher of.
export type FacultyDivision = {
  _id: string;
  name: string;
  year: string;
  academic_year: string;
  department_id: {
    _id: string;
    name: string;
    code: string;
    institute_id?: { _id: string; name: string; code: string } | null;
  } | null;
};

// GET /student/my-division — the logged-in student's division + class teacher.
// Both division and class_teacher can independently be null; has_division /
// has_class_teacher are explicit flags rather than erroring so the UI can
// show a clear message instead of guessing from null.
export type StudentDivisionInfo = {
  has_division: boolean;
  division: {
    _id: string;
    name: string;
    year: string;
    department: { _id: string; name: string; code: string } | null;
    institute: { _id: string; name: string } | null;
  } | null;
  has_class_teacher: boolean;
  class_teacher: { _id: string; full_name: string; faculty_code: string } | null;
};

// GET /admin/stats
export type AdminStats = { students: number; clubs: number; institutes: number; events: number; pendingEvents: number; upcomingEvents: number };

// GET /admin/pending-events
export type PendingAdminEvent = Event & { created_at: string };

// GET /admin/events?status=&club_id=&date_from=&date_to=
export type AdminEvent = Event & { status: EventStatus; is_past_event: boolean; registrationCount: number };

// GET /admin/clubs?institute_id=&category=&search=
export type AdminClub = { _id: string; name: string; category: EventCategory | null; logo_url: string | null; profile_completed: boolean; eventCount: number; institute_id: { _id: string; name: string; code: string } | null; admin: { userId: string; email: string } | null };

export type BudgetRequestType = "annual" | "event";
export type BudgetStatus = "pending" | "approved" | "rejected" | "withdrawn";
export type BudgetBreakdownItem = { item: string; cost: number; _id?: string };

// GET /club/budget-requests — club_id is NOT populated on the club's own
// list (it's implicitly their own club); GET /admin/budget-requests DOES
// populate it, hence the union.
export type BudgetRequest = {
  _id: string;
  club_id: { _id: string; name: string; logo_url: string | null } | string | null;
  requested_by: { _id: string; userId: string; email: string } | null;
  title: string;
  request_type: BudgetRequestType;
  event_id: { _id: string; name: string; date: string } | null;
  amount_requested: number;
  amount_approved: number | null;
  purpose: string;
  breakdown: BudgetBreakdownItem[];
  academic_year: string;
  status: BudgetStatus;
  admin_remarks: string | null;
  actioned_by: { _id: string; userId: string; email: string } | null;
  actioned_at: string | null;
  created_at: string;
};

export type CreateBudgetRequestPayload = {
  title: string;
  request_type: BudgetRequestType;
  event_id?: string;
  amount_requested: number;
  purpose: string;
  breakdown?: { item: string; cost: number }[];
  academic_year: string;
};

// request_type is immutable after creation (mirrors the backend)
export type UpdateBudgetRequestPayload = Partial<Omit<CreateBudgetRequestPayload, "request_type">>;

// GET /admin/budget-stats
export type BudgetStats = {
  totalRequested: number;
  totalApproved: number;
  pendingCount: number;
  byAcademicYear: {
    academic_year: string;
    totalRequested: number;
    totalApproved: number;
    pending: number;
    approved: number;
    rejected: number;
    count: number;
  }[];
};

export type VenueType = "auditorium" | "seminar_hall" | "classroom" | "lab" | "open_ground" | "sports_facility" | "other";
export type VenueBookingType = "event" | "block";
export type VenueBookingStatus = "pending" | "approved" | "rejected" | "cancelled";

// GET /club/venues | GET /admin/venues
export type Venue = {
  _id: string;
  name: string;
  code: string | null;
  capacity: number;
  venue_type: VenueType;
  location: string | null;
  amenities: string[];
  is_active: boolean;
};

// GET /club/venues/:id/availability | GET /club/venue-bookings | GET /admin/venue-bookings
export type VenueBooking = {
  _id: string;
  venue_id: { _id: string; name: string; venue_type?: VenueType; capacity?: number } | string | null;
  booking_type: VenueBookingType;
  event_id: { _id: string; name: string; status?: string } | null;
  club_id: { _id: string; name: string } | null;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  status: VenueBookingStatus;
  admin_remarks: string | null;
};

// Result shape from GET /admin/venue-bookings/conflicts and the
// `conflicts` field returned alongside create/approve/edit responses.
export type VenueConflict = {
  _id: string;
  title: string;
  booking_type: VenueBookingType;
  club_name: string | null;
  event_name: string | null;
  start_time: string;
  end_time: string;
};

export type DriveStatus = "draft" | "open" | "closed";
export type ApplicationStage = "applied" | "shortlisted" | "interview_scheduled" | "interviewed" | "selected" | "rejected";
export type DriveQuestion = { question: string; required: boolean };

// GET /student/recruitment-drives | GET /club/recruitment-drives
export type RecruitmentDrive = {
  _id: string;
  club_id: { _id: string; name: string; logo_url: string | null } | string;
  title: string;
  description: string | null;
  roles_open: string[];
  questions: DriveQuestion[];
  application_deadline: string;
  status: DriveStatus;
  created_at: string;
};

export type InterviewSlot = { date: string | null; time: string | null; venue: string | null; meeting_link: string | null };
// Internal only — populated for the club admin view, never returned to students.
export type InterviewFeedback = { rating: number | null; notes: string | null; recorded_by?: { userId: string } | null; recorded_at: string | null };
export type StageHistoryEntry = { stage: string; changed_by: { userId: string } | null; changed_at: string; note: string | null };
export type ApplicationResponse = { question: string; answer: string };

// GET /student/applications | GET /club/applications
export type Application = {
  _id: string;
  drive_id: { _id: string; title: string } | string | null;
  club_id: { _id: string; name: string; logo_url: string | null } | string | null;
  student_id: { _id: string; name: string | null; userId: string; email: string | null; mobile: string | null } | string;
  role_applied_for: string;
  responses: ApplicationResponse[];
  stage: ApplicationStage;
  interview_slot: InterviewSlot;
  interview_feedback?: InterviewFeedback;
  stage_history?: StageHistoryEntry[];
  final_remarks: string | null;
  created_at: string;
};

export type ApplyPayload = { drive_id: string; role_applied_for: string; responses: { question: string; answer: string }[] };
