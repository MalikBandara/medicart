const { z } = require("zod");
const text = z.string().trim().min(1, "This field is required.");
const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9 ()-]{7,20}$/, "Enter a valid phone number.");
const email = z.email("Enter a valid email address.").max(200);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date.")
  .refine((v) => {
    const d = new Date(v + "T00:00:00Z");
    return !isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === v;
  }, "Use a valid date.");
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a valid time.");
const patientSchema = z.object({
  name: text.max(120),
  dob: date,
  gender: z.enum(["Female", "Male", "Other"]),
  phone,
  email,
  address: text.max(500),
  notes: z.string().trim().max(2000).default(""),
});
const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const doctorSchema = z
  .object({
    name: text.max(120),
    specialty: text.max(100),
    phone,
    email,
    fee: z.coerce.number().min(0).max(1000000),
    availability: z.array(z.enum(days)).min(1, "Select at least one day."),
    startTime: time,
    endTime: time,
    status: z.enum(["Active", "Inactive"]),
  })
  .refine((v) => v.startTime < v.endTime, {
    message: "Closing time must be after opening time.",
    path: ["endTime"],
  });
const appointmentSchema = z.object({
  patientId: text,
  doctorId: text,
  date,
  time,
  reason: text.max(1000),
  status: z.enum(["Scheduled", "Confirmed", "Completed", "Cancelled"]),
});
const settingsSchema = z
  .object({
    name: text.max(120),
    email,
    phone,
    address: text.max(500),
    timezone: text.refine((v) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: v });
        return true;
      } catch {
        return false;
      }
    }, "Use a valid IANA timezone."),
    openingTime: time,
    closingTime: time,
    openDays: z.array(z.enum(days)).min(1),
  })
  .refine((v) => v.openingTime < v.closingTime, {
    message: "Closing time must be after opening time.",
    path: ["closingTime"],
  });
function centerNow(timezone, now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
function appointmentIssue(
  value,
  previous,
  doctor,
  settings,
  appointments,
  now,
) {
  const moved =
    !previous ||
    previous.date !== value.date ||
    previous.time !== value.time ||
    previous.doctorId !== value.doctorId ||
    (previous.status === "Cancelled" && value.status !== "Cancelled");
  if (
    moved &&
    value.date + "T" + value.time <= centerNow(settings.timezone, now)
  )
    return "Appointments must be scheduled in the future.";
  if (!previous && !["Scheduled", "Confirmed"].includes(value.status))
    return "New appointments must be scheduled or confirmed.";
  if (
    value.status === "Completed" &&
    value.date + "T" + value.time > centerNow(settings.timezone, now)
  )
    return "Future appointments cannot be marked completed.";
  if (value.status === "Cancelled") return null;
  const day = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: "UTC",
  }).format(new Date(value.date + "T12:00:00Z"));
  if (
    moved &&
    (!settings.openDays.includes(day) ||
      value.time < settings.openingTime ||
      minutes(value.time) + 30 > minutes(settings.closingTime))
  )
    return "Select a time within the center opening hours.";
  if (
    moved &&
    (!doctor.availability.includes(day) ||
      value.time < doctor.startTime ||
      minutes(value.time) + 30 > minutes(doctor.endTime))
  )
    return "The doctor is unavailable at this time. Appointments last 30 minutes.";
  if (
    appointments.some(
      (a) =>
        a.id !== previous?.id &&
        a.doctorId === value.doctorId &&
        a.date === value.date &&
        a.status !== "Cancelled" &&
        Math.abs(minutes(a.time) - minutes(value.time)) < 30,
    )
  )
    return "This doctor already has an overlapping appointment. Choose another time.";
  return null;
}
function minutes(time) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
module.exports = {
  patientSchema,
  doctorSchema,
  appointmentSchema,
  settingsSchema,
  centerNow,
  appointmentIssue,
};
