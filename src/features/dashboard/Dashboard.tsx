import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Users,
  Stethoscope,
  CalendarDays,
  Clock3,
  ArrowUpRight,
  ArrowRight,
  Plus,
  ChevronRight,
  Activity,
  Check,
  Sun,
  CalendarCheck2,
} from "lucide-react";
import { useWorkspace } from "../../shared/hooks/useWorkspace";
import { Avatar, Badge, Empty } from "../../shared/components/ui";
import { dateLabel, localDate, timeLabel } from "../../shared/utils";
export default function Dashboard() {
  const { data } = useWorkspace();
  const navigate = useNavigate();
  const [range, setRange] = useState("7");
  const [tab, setTab] = useState("upcoming");
  const today = localDate(data.settings.timezone);
  const now = new Intl.DateTimeFormat("en-GB", {
    timeZone: data.settings.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
  const patients = data.patients.filter((p) => !p.archived);
  const doctors = data.doctors.filter(
    (d) => !d.archived && d.status === "Active",
  );
  const todayAppointments = data.appointments.filter((a) => a.date === today);
  const pending = data.appointments.filter((a) => a.status === "Scheduled");
  const upcoming = data.appointments
    .filter(
      (a) =>
        a.date + "T" + a.time >= today + "T" + now &&
        ["Scheduled", "Confirmed"].includes(a.status),
    )
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const list =
    tab === "upcoming"
      ? upcoming
      : todayAppointments.sort((a, b) => a.time.localeCompare(b.time));
  const completed = todayAppointments.filter(
    (a) => a.status === "Completed",
  ).length;
  const recent = [...patients]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 4);
  const days = Array.from({ length: Number(range) }, (_, i) => {
    const d = new Date(today + "T12:00:00");
    d.setDate(d.getDate() - (Number(range) - 1 - i));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return {
      label: dateLabel(key, { weekday: "short" }),
      date: key,
      appointments: data.appointments.filter(
        (a) => a.date === key && a.status !== "Cancelled",
      ).length,
      patients: data.patients.filter(
        (p) => localDate(data.settings.timezone, new Date(p.createdAt)) === key,
      ).length,
    };
  });
  const max = Math.max(4, ...days.flatMap((d) => [d.appointments, d.patients]));
  const point = (n: number, i: number) =>
    `${48 + (i * 632) / (days.length - 1)},${166 - (n / max) * 130}`;
  const line = (type: "appointments" | "patients") =>
    days.map((d, i) => point(d[type], i)).join(" ");
  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: data.settings.timezone,
  }).format(new Date());
  return (
    <>
      <div className="page-heading dashboard-heading">
        <div>
          <div className="eyebrow">
            <span className="live-dot" /> LET’S MAKE TODAY A HEALTHIER DAY
          </div>
          <h1>
            Your center, at a glance<span className="heading-dot">.</span>
          </h1>
          <p>
            Welcome back. Here’s what’s happening at {data.settings.name} today.
          </p>
        </div>
        <button
          className="button primary"
          onClick={() => navigate("/appointments?new=1")}
        >
          <Plus size={18} />
          New appointment
        </button>
      </div>
      <div className="stat-grid">
        {[
          {
            label: "Total patients",
            value: patients.length,
            icon: Users,
            tone: "teal",
            link: "/patients",
            sub: `${patients.filter((p) => p.createdAt.slice(0, 7) === today.slice(0, 7)).length} registered this month`,
            tag: "Patient community",
          },
          {
            label: "Active doctors",
            value: doctors.length,
            icon: Stethoscope,
            tone: "blue",
            link: "/doctors",
            sub: `${doctors.filter((d) => d.availability.includes(weekday)).length} available today`,
            tag: "Your care team",
          },
          {
            label: "Today’s appointments",
            value: todayAppointments.filter((a) => a.status !== "Cancelled")
              .length,
            icon: CalendarDays,
            tone: "purple",
            link: `/appointments?date=${today}`,
            sub: `${completed} completed today`,
            tag: "Today’s schedule",
          },
          {
            label: "Pending appointments",
            value: pending.length,
            icon: Clock3,
            tone: "amber",
            link: "/appointments?status=Scheduled",
            sub: "Awaiting confirmation",
            tag: "Needs your attention",
          },
        ].map((stat) => (
          <Link to={stat.link} className="stat-card" key={stat.label}>
            <div className="stat-top">
              <span>{stat.label}</span>
              <div className={`stat-icon ${stat.tone}`}>
                <stat.icon size={19} />
              </div>
            </div>
            <div className="stat-number">
              {String(stat.value).padStart(2, "0")}
              <ArrowUpRight size={19} />
            </div>
            <div className="stat-bottom">
              <span className={`stat-indicator ${stat.tone}`}>
                {stat.tone === "amber" ? (
                  <Clock3 size={12} />
                ) : (
                  <Check size={12} />
                )}
              </span>
              <span>{stat.sub}</span>
            </div>
            <span className="sr-only">{stat.tag}</span>
          </Link>
        ))}
      </div>
      <div className="dashboard-grid">
        <div className="dashboard-main">
          <section className="panel activity-panel">
            <div className="panel-heading">
              <div>
                <h2>
                  Patient activity{" "}
                  <span
                    className="info-dot"
                    title="Appointment and registration counts for the selected period"
                  >
                    i
                  </span>
                </h2>
                <p>A little perspective on the care you deliver.</p>
              </div>
              <select
                aria-label="Activity period"
                value={range}
                onChange={(e) => setRange(e.target.value)}
              >
                <option value="7">Last 7 days</option>
                <option value="14">Last 14 days</option>
              </select>
            </div>
            <div className="chart-legend">
              <span>
                <i className="legend-dot teal-dot" />
                Appointments{" "}
                <strong>{days.reduce((s, d) => s + d.appointments, 0)}</strong>
              </span>
              <span>
                <i className="legend-dot pale-dot" />
                New patients{" "}
                <strong>{days.reduce((s, d) => s + d.patients, 0)}</strong>
              </span>
            </div>
            <div className="chart-wrap">
              <svg
                viewBox="0 0 710 204"
                role="img"
                aria-label={`Activity over the last ${range} days: ${days.map((d) => `${d.date}, ${d.appointments} appointments, ${d.patients} new patients`).join("; ")}`}
              >
                <defs>
                  <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0c9585" stopOpacity=".19" />
                    <stop offset="100%" stopColor="#0c9585" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[0, 1, 2, 3, 4].map((i) => (
                  <g key={i}>
                    <line
                      x1="42"
                      x2="689"
                      y1={166 - i * 32.5}
                      y2={166 - i * 32.5}
                      stroke="#e8edef"
                      strokeDasharray="4 5"
                    />
                    <text
                      x="25"
                      y={170 - i * 32.5}
                      textAnchor="end"
                      className="chart-label"
                    >
                      {Math.round((max * i) / 4)}
                    </text>
                  </g>
                ))}
                <polygon
                  points={`48,166 ${line("appointments")} 680,166`}
                  fill="url(#area)"
                />
                <polyline
                  points={line("patients")}
                  fill="none"
                  stroke="#a4d8d0"
                  strokeWidth="2.5"
                  strokeDasharray="5 5"
                  strokeLinejoin="round"
                />
                <polyline
                  points={line("appointments")}
                  fill="none"
                  stroke="#0c9585"
                  strokeWidth="3"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {days.map((d, i) => (
                  <g key={d.date}>
                    <circle
                      cx={48 + (i * 632) / (days.length - 1)}
                      cy={166 - (d.appointments / max) * 130}
                      r="3.8"
                      fill="white"
                      stroke="#0c9585"
                      strokeWidth="2"
                    >
                      <title>
                        {d.date}: {d.appointments} appointments
                      </title>
                    </circle>
                    {(range === "7" || i % 2 === 0) && (
                      <text
                        x={48 + (i * 632) / (days.length - 1)}
                        y="195"
                        textAnchor="middle"
                        className="chart-label"
                      >
                        {d.label}
                      </text>
                    )}
                  </g>
                ))}
              </svg>
            </div>
          </section>
          <section className="panel appointment-panel">
            <div className="panel-heading">
              <div>
                <h2>Appointments</h2>
                <p>The next steps in someone’s care.</p>
              </div>
              <Link className="text-link" to="/appointments">
                View all <ArrowRight size={14} />
              </Link>
            </div>
            <div className="tab-row">
              <button
                className={tab === "upcoming" ? "active" : ""}
                onClick={() => setTab("upcoming")}
              >
                Upcoming <span>{upcoming.length}</span>
              </button>
              <button
                className={tab === "today" ? "active" : ""}
                onClick={() => setTab("today")}
              >
                Today’s appointments <span>{todayAppointments.length}</span>
              </button>
            </div>
            {list.length ? (
              <div className="table-scroll">
                <table className="compact-table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Doctor</th>
                      <th>Date & time</th>
                      <th>Status</th>
                      <th>
                        <span className="sr-only">View</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.slice(0, 4).map((a) => {
                      const p = data.patients.find((p) => p.id === a.patientId);
                      const d = data.doctors.find((d) => d.id === a.doctorId);
                      return (
                        <tr key={a.id}>
                          <td>
                            <div className="person">
                              <Avatar name={p?.name || "Patient"} />
                              <div>
                                <strong>{p?.name}</strong>
                                <small>{a.reason}</small>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="doctor-name">Dr. {d?.name}</span>
                            <small>{d?.specialty}</small>
                          </td>
                          <td>
                            <span>
                              {a.date === today
                                ? "Today"
                                : dateLabel(a.date, {
                                    month: "short",
                                    day: "numeric",
                                  })}
                            </span>
                            <small>{timeLabel(a.time)}</small>
                          </td>
                          <td>
                            <Badge status={a.status} />
                          </td>
                          <td>
                            <Link
                              className="icon-button"
                              aria-label={`View appointment for ${p?.name}`}
                              to={`/appointments?q=${a.id}`}
                            >
                              <ChevronRight size={17} />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty
                title="A little room to breathe"
                text="No appointments in this view. Your next visits will appear here."
              />
            )}
            <Link className="panel-bottom-link" to="/appointments">
              Manage all appointments <ArrowRight size={14} />
            </Link>
          </section>
        </div>
        <aside className="dashboard-aside">
          <section className="day-card">
            <div className="day-card-top">
              <div className="sun-icon">
                <Sun size={22} />
              </div>
              <span>CARE STARTS HERE</span>
              <span className="sparkle">✧</span>
            </div>
            <h2>
              A good day to
              <br />
              make a difference.
            </h2>
            <p>Every visit is a chance to help someone feel a little better.</p>
            <div className="day-card-rule" />
            <div className="daily-progress">
              <span>Today’s progress</span>
              <strong>
                {completed}/
                {
                  todayAppointments.filter((a) => a.status !== "Cancelled")
                    .length
                }{" "}
                visits
              </strong>
            </div>
            <div className="progress-track">
              <span
                style={{
                  width: `${(completed / Math.max(1, todayAppointments.filter((a) => a.status !== "Cancelled").length)) * 100}%`,
                }}
              />
            </div>
            <div className="day-card-foot">
              <CalendarCheck2 size={14} />
              {completed
                ? `${completed} moments of care delivered`
                : "Ready for a day of better care"}
            </div>
            <div className="card-decoration">
              <Activity />
            </div>
          </section>
          <section className="panel available-panel">
            <div className="panel-heading">
              <h2>Available doctors</h2>
              <Link
                to="/doctors"
                className="icon-button"
                aria-label="View all doctors"
              >
                <ArrowUpRight size={17} />
              </Link>
            </div>
            <div className="doctor-list">
              {doctors
                .filter((d) => d.availability.includes(weekday))
                .slice(0, 3)
                .map((d) => (
                  <Link to={`/doctors?q=${d.id}`} key={d.id}>
                    <Avatar doctor name={d.name} />
                    <div>
                      <strong>Dr. {d.name}</strong>
                      <small>{d.specialty}</small>
                    </div>
                    <span className="available-dot" title="Available today" />
                  </Link>
                ))}
              {!doctors.some((d) => d.availability.includes(weekday)) && (
                <p className="muted">No doctors available today.</p>
              )}
            </div>
            <Link className="panel-bottom-link" to="/doctors">
              Meet your care team <ArrowRight size={14} />
            </Link>
          </section>
          <section className="panel recent-panel">
            <div className="panel-heading">
              <h2>Recent patients</h2>
              <span className="subtle-label">LATEST</span>
            </div>
            <div className="recent-list">
              {recent.map((p) => (
                <Link to={`/patients?q=${p.id}`} key={p.id}>
                  <Avatar name={p.name} size="small" />
                  <div>
                    <strong>{p.name}</strong>
                    <small>
                      {dateLabel(p.createdAt.slice(0, 10), {
                        month: "short",
                        day: "numeric",
                      })}
                    </small>
                  </div>
                  <ChevronRight size={15} />
                </Link>
              ))}
              {!recent.length && (
                <p className="muted">Your patient community starts here.</p>
              )}
            </div>
          </section>
        </aside>
      </div>
      <div className="dashboard-footer">
        <span>
          <span className="secure-dot" /> Thoughtful care. Connected people.
        </span>
        <span>
          {data.settings.name} · {data.settings.timezone}
        </span>
      </div>
    </>
  );
}
