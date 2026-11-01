import { useState, type FormEvent } from "react";
import {
  Building2,
  Clock3,
  Globe2,
  Save,
  ShieldCheck,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import { Field } from "../../shared/components/ui";
import { useWorkspace } from "../../shared/hooks/useWorkspace";
import { api } from "../../shared/utils/api";
export default function Settings() {
  const { data, refresh, notify } = useWorkspace();
  const [value, setValue] = useState(data.settings),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const set = (key: string, v: string | string[]) =>
    setValue((s) => ({ ...s, [key]: v }));
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/settings", "PUT", value);
      await refresh();
      notify("Medical center settings saved.");
    } catch (e) {
      setError((e as Error).message);
      notify((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">MAKE YOURSELF AT HOME</div>
          <h1>Center settings</h1>
          <p>The details that make this workspace yours.</p>
        </div>
        <span className="settings-badge">
          <ShieldCheck size={16} />
          Staff workspace
        </span>
      </div>
      <form onSubmit={save} className="settings-layout">
        <div>
          <section className="panel settings-panel">
            <div className="panel-heading">
              <div className="settings-section-title">
                <span className="settings-icon">
                  <Building2 size={20} />
                </span>
                <div>
                  <h2>Medical center details</h2>
                  <p>Your center’s identity and contact information.</p>
                </div>
              </div>
            </div>
            <div className="form-grid">
              <div className="full-width">
                <Field label="Medical center name">
                  <input
                    required
                    maxLength={120}
                    value={value.name}
                    onChange={(e) => set("name", e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Contact email">
                <input
                  type="email"
                  required
                  value={value.email}
                  onChange={(e) => set("email", e.target.value)}
                />
              </Field>
              <Field label="Contact phone">
                <input
                  type="tel"
                  required
                  pattern="\+?[0-9 ()\-]{7,20}"
                  value={value.phone}
                  onChange={(e) => set("phone", e.target.value)}
                />
              </Field>
              <div className="full-width">
                <Field label="Center address">
                  <textarea
                    required
                    rows={2}
                    maxLength={500}
                    value={value.address}
                    onChange={(e) => set("address", e.target.value)}
                  />
                </Field>
              </div>
            </div>
          </section>
          <section className="panel settings-panel">
            <div className="panel-heading">
              <div className="settings-section-title">
                <span className="settings-icon blue">
                  <Clock3 size={20} />
                </span>
                <div>
                  <h2>Opening hours & timezone</h2>
                  <p>Keep schedules consistent for everyone.</p>
                </div>
              </div>
            </div>
            <div className="form-grid">
              <Field label="Opens at">
                <input
                  type="time"
                  required
                  value={value.openingTime}
                  onChange={(e) => set("openingTime", e.target.value)}
                />
              </Field>
              <Field label="Closes at">
                <input
                  type="time"
                  required
                  value={value.closingTime}
                  onChange={(e) => set("closingTime", e.target.value)}
                />
              </Field>
              <div className="full-width">
                <Field
                  label="Medical center timezone"
                  help="IANA timezone used for all appointments, dashboard dates, and scheduling checks."
                >
                  <input
                    required
                    list="timezones"
                    value={value.timezone}
                    onChange={(e) => set("timezone", e.target.value)}
                  />
                  <datalist id="timezones">
                    {[
                      "Asia/Colombo",
                      "Asia/Kolkata",
                      "Asia/Singapore",
                      "Europe/London",
                      "America/New_York",
                      "Australia/Sydney",
                      "UTC",
                    ].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </datalist>
                </Field>
              </div>
              <fieldset className="full-width day-field">
                <legend>Open days</legend>
                <div className="day-options">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                    (day) => (
                      <label key={day}>
                        <input
                          type="checkbox"
                          checked={value.openDays.includes(day)}
                          onChange={(e) =>
                            set(
                              "openDays",
                              e.target.checked
                                ? [...value.openDays, day]
                                : value.openDays.filter((d) => d !== day),
                            )
                          }
                        />
                        <span>{day}</span>
                      </label>
                    ),
                  )}
                </div>
              </fieldset>
            </div>
            <div className="notice compact">
              <Globe2 size={16} /> Changes apply to new and rescheduled
              appointments. Existing visits retain their saved local date and
              time.
            </div>
          </section>
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          <div className="settings-save">
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={() => {
                setValue(data.settings);
                setError("");
              }}
            >
              Reset changes
            </button>
            <button className="button primary" disabled={busy}>
              <Save size={16} />
              {busy ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
        <aside>
          <section className="panel center-preview">
            <div className="center-logo">
              <span>
                m<span>+</span>
              </span>
            </div>
            <span className="eyebrow">YOUR MEDICAL CENTER</span>
            <h2>{value.name}</h2>
            <p>
              A connected workspace.
              <br />A healthier community.
            </p>
            <hr />
            <div>
              <Mail size={16} />
              {value.email}
            </div>
            <div>
              <Phone size={16} />
              {value.phone}
            </div>
            <div>
              <MapPin size={16} />
              {value.address}
            </div>
          </section>
          <div className="settings-note">
            <ShieldCheck size={20} />
            <p>
              Settings are saved in your local database and shared across staff
              sessions.
            </p>
          </div>
        </aside>
      </form>
    </>
  );
}
