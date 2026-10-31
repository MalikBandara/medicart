import RecordPage, { DetailGrid } from "../../shared/components/RecordPage";
import { Avatar, Badge, Field } from "../../shared/components/ui";
import { useWorkspace } from "../../shared/hooks/useWorkspace";
import type { Appointment } from "../../shared/types";
import { dateLabel, localDate, timeLabel } from "../../shared/utils";
const statuses = ["Scheduled", "Confirmed", "Completed", "Cancelled"];
export default function Appointments() {
  const { data } = useWorkspace();
  const today = localDate(data.settings.timezone);
  const patient = (id: string) => data.patients.find((p) => p.id === id);
  const doctor = (id: string) => data.doctors.find((d) => d.id === id);
  return (
    <RecordPage<Appointment>
      config={{
        module: "appointments",
        title: "Appointments",
        singular: "Appointment",
        description: "Keep the day flowing. Make every visit count.",
        canCreate:
          data.patients.some((p) => !p.archived) &&
          data.doctors.some((d) => !d.archived && d.status === "Active"),
        columns: [
          {
            label: "Patient",
            render: (a) => (
              <div className="person">
                <Avatar name={patient(a.patientId)?.name || "Patient"} />
                <div>
                  <strong>{patient(a.patientId)?.name}</strong>
                  <small>{a.patientId}</small>
                </div>
              </div>
            ),
          },
          {
            label: "Doctor",
            render: (a) => (
              <>
                <span>Dr. {doctor(a.doctorId)?.name}</span>
                <small>{doctor(a.doctorId)?.specialty}</small>
              </>
            ),
          },
          {
            label: "Date & time",
            render: (a) => (
              <>
                <span>{dateLabel(a.date)}</span>
                <small>{timeLabel(a.time)}</small>
              </>
            ),
          },
          {
            label: "Reason",
            render: (a) => (
              <span className="truncate" title={a.reason}>
                {a.reason}
              </span>
            ),
          },
          { label: "Status", render: (a) => <Badge status={a.status} /> },
        ],
        filters: [
          { key: "date", label: "Appointment date", type: "date" },
          {
            key: "doctor",
            label: "All doctors",
            options: data.doctors.map((d) => ({
              value: d.id,
              label: "Dr. " + d.name,
            })),
          },
          {
            key: "status",
            label: "All statuses",
            options: statuses.map((value) => ({ value, label: value })),
          },
        ],
        matches: (a, q, f) =>
          `${patient(a.patientId)?.name} ${doctor(a.doctorId)?.name} ${a.id} ${a.reason}`
            .toLowerCase()
            .includes(q.toLowerCase()) &&
          (!f.date || a.date === f.date) &&
          (!f.doctor || a.doctorId === f.doctor) &&
          (!f.status || a.status === f.status),
        initial: (a) => ({
          patientId: a?.patientId || "",
          doctorId: a?.doctorId || "",
          date: a?.date || today,
          time: a?.time || "",
          reason: a?.reason || "",
          status: a?.status || "Scheduled",
        }),
        fields: (v, set, record) => {
          const selectedDoctor = doctor(v.doctorId as string);
          return (
            <>
              <Field label="Patient">
                <select
                  required
                  value={v.patientId}
                  onChange={(e) => set("patientId", e.target.value)}
                >
                  <option value="">Select a patient</option>
                  {data.patients
                    .filter((p) => !p.archived || p.id === record?.patientId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · {p.id}
                        {p.archived ? " (archived)" : ""}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Doctor">
                <select
                  required
                  value={v.doctorId}
                  onChange={(e) => set("doctorId", e.target.value)}
                >
                  <option value="">Select a doctor</option>
                  {data.doctors
                    .filter(
                      (d) =>
                        (!d.archived && d.status === "Active") ||
                        d.id === record?.doctorId,
                    )
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        Dr. {d.name} · {d.specialty}
                        {d.archived ? " (archived)" : ""}
                      </option>
                    ))}
                </select>
              </Field>
              {selectedDoctor && (
                <div className="full-width notice compact">
                  Dr. {selectedDoctor.name} ·{" "}
                  {selectedDoctor.availability.join(", ")} ·{" "}
                  {timeLabel(selectedDoctor.startTime)}–
                  {timeLabel(selectedDoctor.endTime)} · LKR{" "}
                  {selectedDoctor.fee.toLocaleString()}
                </div>
              )}
              <Field label="Appointment date">
                <input
                  type="date"
                  required
                  min={record ? undefined : today}
                  value={v.date}
                  onChange={(e) => set("date", e.target.value)}
                />
              </Field>
              <Field
                label="Appointment time"
                help={`30-minute visit · ${data.settings.timezone}`}
              >
                <input
                  type="time"
                  required
                  value={v.time}
                  onChange={(e) => set("time", e.target.value)}
                />
              </Field>
              <Field label="Status">
                <select
                  value={v.status}
                  onChange={(e) => set("status", e.target.value)}
                >
                  {(record ? statuses : statuses.slice(0, 2)).map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <div className="full-width">
                <Field label="Reason for visit">
                  <textarea
                    required
                    maxLength={1000}
                    rows={3}
                    value={v.reason}
                    onChange={(e) => set("reason", e.target.value)}
                    placeholder="e.g. Routine checkup or follow-up consultation"
                  />
                </Field>
              </div>
              <div className="full-width muted form-note">
                To reschedule, update the date or time. To cancel, choose
                Cancelled and save. Cancellation preserves the appointment
                history.
              </div>
            </>
          );
        },
        details: (a) => (
          <>
            <div className="profile-heading">
              <Avatar
                name={patient(a.patientId)?.name || "Patient"}
                size="large"
              />
              <div>
                <h2>{patient(a.patientId)?.name}</h2>
                <p>
                  {dateLabel(a.date)} · {timeLabel(a.time)}
                </p>
              </div>
              <Badge status={a.status} />
            </div>
            <DetailGrid
              items={[
                ["Patient", patient(a.patientId)?.name],
                ["Doctor", "Dr. " + doctor(a.doctorId)?.name],
                ["Specialty", doctor(a.doctorId)?.specialty],
                ["Duration", "30 minutes"],
                ["Timezone", data.settings.timezone],
                ["Reason for visit", a.reason],
              ]}
            />
            <div className="notice">
              {a.status === "Cancelled"
                ? "This appointment is cancelled. Permanent deletion is a separate action and cannot be undone."
                : "Manage this appointment to reschedule, confirm, complete, or cancel it. Cancel it first if permanent deletion is necessary."}
            </div>
          </>
        ),
      }}
    />
  );
}
