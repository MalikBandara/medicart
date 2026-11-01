import RecordPage, { DetailGrid } from "../../shared/components/RecordPage";
import { Avatar, Field } from "../../shared/components/ui";
import { useWorkspace } from "../../shared/hooks/useWorkspace";
import type { Patient } from "../../shared/types";
import { age, dateLabel, localDate } from "../../shared/utils";
export default function Patients() {
  const { data } = useWorkspace();
  const today = localDate(data.settings.timezone);
  return (
    <RecordPage<Patient>
      config={{
        module: "patients",
        title: "Patients",
        singular: "Patient",
        description: "Every patient, every detail. Thoughtfully organized.",
        columns: [
          {
            label: "Patient name",
            render: (p) => (
              <div className="person">
                <Avatar name={p.name} />
                <div>
                  <strong>{p.name}</strong>
                  <small>{p.id}</small>
                </div>
              </div>
            ),
          },
          {
            label: "Age / Gender",
            render: (p) => (
              <>
                <span>{age(p.dob, today)} years</span>
                <small>{p.gender}</small>
              </>
            ),
          },
          {
            label: "Contact",
            render: (p) => (
              <>
                <span>{p.phone}</span>
                <small>{p.email}</small>
              </>
            ),
          },
          {
            label: "Registered",
            render: (p) => dateLabel(p.createdAt.slice(0, 10)),
          },
          {
            label: "Appointments",
            render: (p) => (
              <span className="neutral-pill">
                {data.appointments.filter((a) => a.patientId === p.id).length}{" "}
                visits
              </span>
            ),
          },
        ],
        filters: [
          {
            key: "gender",
            label: "All genders",
            options: ["Female", "Male", "Other"].map((value) => ({
              value,
              label: value,
            })),
          },
        ],
        matches: (p, q, f) =>
          `${p.name} ${p.id} ${p.email} ${p.phone}`
            .toLowerCase()
            .includes(q.toLowerCase()) &&
          (!f.gender || p.gender === f.gender),
        initial: (p) => ({
          name: p?.name || "",
          dob: p?.dob || "",
          gender: p?.gender || "Female",
          phone: p?.phone || "",
          email: p?.email || "",
          address: p?.address || "",
          notes: p?.notes || "",
        }),
        fields: (v, set) => (
          <>
            <Field label="Full name">
              <input
                required
                maxLength={120}
                value={v.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Olivia Bennett"
                autoComplete="name"
              />
            </Field>
            <Field label="Date of birth">
              <input
                type="date"
                required
                max={today}
                value={v.dob}
                onChange={(e) => set("dob", e.target.value)}
              />
            </Field>
            <Field label="Gender">
              <select
                value={v.gender}
                onChange={(e) => set("gender", e.target.value)}
              >
                {["Female", "Male", "Other"].map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </Field>
            <Field label="Phone number">
              <input
                type="tel"
                required
                pattern="\+?[0-9 ()\-]{7,20}"
                value={v.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+94 77 123 4567"
                autoComplete="tel"
              />
            </Field>
            <Field label="Email address">
              <input
                type="email"
                required
                value={v.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="patient@example.com"
                autoComplete="email"
              />
            </Field>
            <Field label="Address">
              <input
                required
                maxLength={500}
                value={v.address}
                onChange={(e) => set("address", e.target.value)}
                autoComplete="street-address"
              />
            </Field>
            <div className="full-width">
              <Field label="Notes (optional)">
                <textarea
                  maxLength={2000}
                  rows={3}
                  value={v.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder="Any information that helps us provide better care"
                />
              </Field>
            </div>
          </>
        ),
        details: (p) => (
          <>
            <div className="profile-heading">
              <Avatar name={p.name} size="large" />
              <div>
                <h2>{p.name}</h2>
                <p>
                  {age(p.dob, today)} years · {p.gender}
                  {p.archived ? " · Archived" : ""}
                </p>
              </div>
            </div>
            <DetailGrid
              items={[
                ["Date of birth", dateLabel(p.dob)],
                ["Phone", p.phone],
                ["Email", p.email],
                ["Address", p.address],
                ["Notes", p.notes],
              ]}
            />
            <h3 className="section-label">Appointment history</h3>
            <div className="history-list">
              {data.appointments
                .filter((a) => a.patientId === p.id)
                .sort((a, b) =>
                  (b.date + b.time).localeCompare(a.date + a.time),
                )
                .map((a) => (
                  <div key={a.id}>
                    <div>
                      <strong>
                        {dateLabel(a.date)} · {a.time}
                      </strong>
                      <small>
                        Dr.{" "}
                        {data.doctors.find((d) => d.id === a.doctorId)?.name} ·{" "}
                        {a.reason}
                      </small>
                    </div>
                    <span>{a.status}</span>
                  </div>
                ))}
              {!data.appointments.some((a) => a.patientId === p.id) && (
                <p className="muted">No appointments yet.</p>
              )}
            </div>
          </>
        ),
      }}
    />
  );
}
