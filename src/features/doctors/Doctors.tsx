import RecordPage, { DetailGrid } from "../../shared/components/RecordPage";
import { Avatar, Badge, Field } from "../../shared/components/ui";
import { useWorkspace } from "../../shared/hooks/useWorkspace";
import type { Doctor } from "../../shared/types";
import { timeLabel } from "../../shared/utils";
const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export default function Doctors() {
  const { data } = useWorkspace();
  return (
    <RecordPage<Doctor>
      config={{
        module: "doctors",
        title: "Doctors",
        singular: "Doctor",
        description: "A great team, at the heart of great care.",
        columns: [
          {
            label: "Doctor name",
            render: (d) => (
              <div className="person">
                <Avatar doctor name={d.name} />
                <div>
                  <strong>Dr. {d.name}</strong>
                  <small>{d.id}</small>
                </div>
              </div>
            ),
          },
          {
            label: "Specialty",
            render: (d) => <span className="specialty">{d.specialty}</span>,
          },
          {
            label: "Availability",
            render: (d) => (
              <>
                <span>{d.availability.join(", ")}</span>
                <small>
                  {timeLabel(d.startTime)} – {timeLabel(d.endTime)}
                </small>
              </>
            ),
          },
          {
            label: "Consultation fee",
            render: (d) => `LKR ${d.fee.toLocaleString()}`,
          },
          { label: "Status", render: (d) => <Badge status={d.status} /> },
        ],
        filters: [
          {
            key: "specialty",
            label: "All specialties",
            options: [...new Set(data.doctors.map((d) => d.specialty))].map(
              (value) => ({ value, label: value }),
            ),
          },
          {
            key: "status",
            label: "All statuses",
            options: ["Active", "Inactive"].map((value) => ({
              value,
              label: value,
            })),
          },
        ],
        matches: (d, q, f) =>
          `${d.name} ${d.id} ${d.email}`
            .toLowerCase()
            .includes(q.toLowerCase()) &&
          (!f.specialty || d.specialty === f.specialty) &&
          (!f.status || d.status === f.status),
        initial: (d) => ({
          name: d?.name || "",
          specialty: d?.specialty || "",
          phone: d?.phone || "",
          email: d?.email || "",
          fee: d?.fee ?? 2500,
          availability: d?.availability || days.slice(0, 5),
          startTime: d?.startTime || "09:00",
          endTime: d?.endTime || "17:00",
          status: d?.status || "Active",
        }),
        fields: (v, set) => (
          <>
            <Field label="Full name (without Dr.)">
              <input
                required
                maxLength={120}
                value={v.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Amelia Richardson"
              />
            </Field>
            <Field label="Specialty">
              <input
                required
                maxLength={100}
                value={v.specialty}
                onChange={(e) => set("specialty", e.target.value)}
                list="specialties"
                placeholder="e.g. General Medicine"
              />
              <datalist id="specialties">
                {[...new Set(data.doctors.map((d) => d.specialty))].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </datalist>
            </Field>
            <Field label="Phone number">
              <input
                type="tel"
                required
                pattern="\+?[0-9 ()\-]{7,20}"
                value={v.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </Field>
            <Field label="Email address">
              <input
                type="email"
                required
                value={v.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </Field>
            <Field label="Consultation fee (LKR)">
              <input
                type="number"
                required
                min="0"
                max="1000000"
                step="0.01"
                value={v.fee}
                onChange={(e) => set("fee", e.target.value)}
              />
            </Field>
            <Field label="Status">
              <select
                value={v.status}
                onChange={(e) => set("status", e.target.value)}
              >
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </Field>
            <Field label="Available from">
              <input
                type="time"
                required
                value={v.startTime}
                onChange={(e) => set("startTime", e.target.value)}
              />
            </Field>
            <Field label="Available until">
              <input
                type="time"
                required
                value={v.endTime}
                onChange={(e) => set("endTime", e.target.value)}
              />
            </Field>
            <fieldset className="full-width day-field">
              <legend>Available days</legend>
              <div className="day-options">
                {days.map((day) => (
                  <label key={day}>
                    <input
                      type="checkbox"
                      checked={(v.availability as string[]).includes(day)}
                      onChange={(e) =>
                        set(
                          "availability",
                          e.target.checked
                            ? [...(v.availability as string[]), day]
                            : (v.availability as string[]).filter(
                                (d) => d !== day,
                              ),
                        )
                      }
                    />
                    <span>{day}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </>
        ),
        details: (d) => (
          <>
            <div className="profile-heading">
              <Avatar doctor name={d.name} size="large" />
              <div>
                <h2>Dr. {d.name}</h2>
                <p>{d.specialty}</p>
              </div>
              <Badge status={d.archived ? "Archived" : d.status} />
            </div>
            <DetailGrid
              items={[
                ["Doctor ID", d.id],
                ["Consultation fee", `LKR ${d.fee.toLocaleString()}`],
                ["Phone", d.phone],
                ["Email", d.email],
                ["Available days", d.availability.join(", ")],
                [
                  "Consultation hours",
                  `${timeLabel(d.startTime)} – ${timeLabel(d.endTime)}`,
                ],
                [
                  "Appointment history",
                  `${data.appointments.filter((a) => a.doctorId === d.id).length} appointments`,
                ],
              ]}
            />
          </>
        ),
      }}
    />
  );
}
