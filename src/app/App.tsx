import { useCallback, useEffect, useState } from "react";
import {
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  Navigate,
  Link,
} from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  CalendarDays,
  Settings as SettingsIcon,
  Search,
  Bell,
  ChevronDown,
  Menu,
  X,
  LogOut,
  CircleHelp,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HeartPulse,
} from "lucide-react";
import { api, ApiError } from "../shared/utils/api";
import { WorkspaceContext } from "../shared/hooks/useWorkspace";
import type { Data } from "../shared/types";
import { Avatar, Loading, Modal } from "../shared/components/ui";
import { localDate, dateLabel, timeLabel } from "../shared/utils";
import Logo from "./Logo";
import Login from "../features/auth/Login";
import Dashboard from "../features/dashboard/Dashboard";
import Patients from "../features/patients/Patients";
import Doctors from "../features/doctors/Doctors";
import Appointments from "../features/appointments/Appointments";
import Settings from "../features/settings/Settings";
export default function App() {
  const [user, setUser] = useState<{ email: string } | null | undefined>(),
    [data, setData] = useState<Data | null>(null),
    [loadError, setLoadError] = useState(""),
    [mobile, setMobile] = useState(false),
    [help, setHelp] = useState(false),
    [notifications, setNotifications] = useState(false),
    [account, setAccount] = useState(false),
    [search, setSearch] = useState("");
  const [toasts, setToasts] = useState<
    { id: number; message: string; error: boolean }[]
  >([]);
  const navigate = useNavigate(),
    location = useLocation();
  const notify = useCallback((message: string, error = false) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, error }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5500);
  }, []);
  const refresh = useCallback(async () => {
    const next = await api<Data>("/bootstrap");
    setData(next);
    setLoadError("");
  }, []);
  const load = useCallback(async () => {
    try {
      const me = await api<{ email: string }>("/me");
      setUser(me);
      await refresh();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setUser(null);
        setData(null);
      } else setLoadError((e as Error).message);
    }
  }, [refresh]);
  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) void load();
    });
    const expired = () => {
      setUser(null);
      setData(null);
      notify("Your session expired. Please sign in again.", true);
    };
    window.addEventListener("session-expired", expired);
    return () => {
      controller.abort();
      window.removeEventListener("session-expired", expired);
    };
  }, [load, notify]);
  useEffect(() => {
    const close = () => {
      setMobile(false);
      setNotifications(false);
      setAccount(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);
  async function logout() {
    try {
      await api("/logout", "POST");
      setUser(null);
      setData(null);
      navigate("/");
    } catch (e) {
      notify((e as Error).message, true);
    }
  }
  if (loadError && !data)
    return (
      <div className="loading">
        <AlertCircle size={32} />
        <h2>We couldn’t load your workspace</h2>
        <p>{loadError}</p>
        <button className="button primary" onClick={() => void load()}>
          Try again
        </button>
      </div>
    );
  if (user === null) return <Login onLogin={() => void load()} />;
  if (!user || !data) return <Loading />;
  const today = localDate(data.settings.timezone);
  const pending = data.appointments.filter((a) => a.status === "Scheduled");
  const page = location.pathname.split("/")[1] || "dashboard";
  return (
    <WorkspaceContext.Provider value={{ data, refresh, notify }}>
      <div className="app-shell">
        {mobile && (
          <button
            className="sidebar-backdrop"
            onClick={() => setMobile(false)}
            aria-label="Close navigation"
          />
        )}
        <aside className={`sidebar ${mobile ? "open" : ""}`}>
          <Link className="brand-link" to="/">
            <Logo />
          </Link>
          <div className="workspace-label">
            <span className="workspace-avatar">M</span>
            <div>
              <strong>{data.settings.name}</strong>
              <small>Medical center workspace</small>
            </div>
            <ShieldCheck size={16} />
          </div>
          <div className="nav-label">WORKSPACE</div>
          <nav
            onClick={() => {
              setMobile(false);
              setNotifications(false);
              setAccount(false);
            }}
          >
            {[
              { to: "/", label: "Overview", icon: LayoutDashboard },
              { to: "/patients", label: "Patients", icon: Users },
              { to: "/doctors", label: "Doctors", icon: Stethoscope },
              {
                to: "/appointments",
                label: "Appointments",
                icon: CalendarDays,
              },
              { to: "/settings", label: "Settings", icon: SettingsIcon },
            ].map(({ to, label, icon: Icon }) => (
              <NavLink end={to === "/"} key={to} to={to}>
                <Icon size={19} />
                <span>{label}</span>
                {label === "Appointments" && pending.length > 0 && (
                  <span className="nav-count">{pending.length}</span>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="care-note">
              <span className="care-note-icon">
                <HeartPulse size={22} />
              </span>
              <h3>A little care goes a long way.</h3>
              <p>And a connected team makes all the difference.</p>
              <button onClick={() => setHelp(true)}>
                Your workspace guide <ArrowUpRight size={14} />
              </button>
            </div>
            <button className="sidebar-help" onClick={() => setHelp(true)}>
              <CircleHelp size={18} />
              Help & getting started
              <ArrowUpRight size={14} />
            </button>
            <div className="sidebar-account">
              <Avatar name="Staff Admin" />
              <div>
                <strong>Staff administrator</strong>
                <small>Center management</small>
              </div>
              <button
                className="icon-button"
                onClick={logout}
                aria-label="Sign out"
              >
                <LogOut size={17} />
              </button>
            </div>
          </div>
        </aside>
        <div className="main-shell">
          <header className="topbar" onClick={(e) => e.stopPropagation()}>
            <div className="breadcrumb">
              <button
                className="icon-button mobile-menu"
                aria-label="Open navigation"
                onClick={() => setMobile(true)}
              >
                <Menu size={21} />
              </button>
              <span>Workspace</span>
              <span className="breadcrumb-slash">/</span>
              <strong>
                {page === "dashboard"
                  ? "Overview"
                  : page[0].toUpperCase() + page.slice(1)}
              </strong>
            </div>
            <div className="topbar-right">
              <form
                className="top-search"
                onSubmit={(e) => {
                  e.preventDefault();
                  navigate(`/patients?q=${encodeURIComponent(search)}`);
                  setSearch("");
                }}
              >
                <Search size={16} />
                <input
                  aria-label="Search all patients"
                  placeholder="Search patients…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <span>↵</span>
              </form>
              <span className="topbar-divider" />
              <div className="dropdown-wrap">
                <button
                  className={`icon-button notification-button ${pending.length ? "has-unread" : ""}`}
                  aria-label="View notifications"
                  aria-expanded={notifications}
                  onClick={() => {
                    setNotifications(!notifications);
                    setAccount(false);
                  }}
                >
                  <Bell size={19} />
                </button>
                {notifications && (
                  <div className="dropdown notification-dropdown">
                    <h3>Your center updates</h3>
                    <Link
                      to="/appointments?status=Scheduled"
                      onClick={() => setNotifications(false)}
                    >
                      <CalendarDays size={20} />
                      <div>
                        <strong>{pending.length} pending appointments</strong>
                        <small>Review and confirm scheduled visits</small>
                      </div>
                      <ChevronDown size={14} />
                    </Link>
                    <Link
                      to={`/appointments?date=${today}`}
                      onClick={() => setNotifications(false)}
                    >
                      <CalendarDays size={20} />
                      <div>
                        <strong>
                          {
                            data.appointments.filter((a) => a.date === today)
                              .length
                          }{" "}
                          visits today
                        </strong>
                        <small>View your daily schedule</small>
                      </div>
                    </Link>
                  </div>
                )}
              </div>
              <div className="dropdown-wrap">
                <button
                  className="account-button"
                  aria-label="Open staff account"
                  aria-expanded={account}
                  onClick={() => {
                    setAccount(!account);
                    setNotifications(false);
                  }}
                >
                  <Avatar name="Staff Admin" size="small" />
                  <span>Admin</span>
                  <ChevronDown size={13} />
                </button>
                {account && (
                  <div className="dropdown account-dropdown">
                    <small>Signed in as</small>
                    <strong>{user.email}</strong>
                    <button onClick={logout}>
                      <LogOut size={16} />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>
          <main className="main-content">
            <div className="date-line">
              <span className="date-icon">
                <CalendarDays size={14} />
              </span>
              {dateLabel(today, {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
              <span className="date-line-divider" />
              <span className="center-status">
                <i />
                {data.settings.openDays.includes(
                  new Intl.DateTimeFormat("en-US", {
                    weekday: "short",
                    timeZone: data.settings.timezone,
                  }).format(new Date()),
                ) &&
                (() => {
                  const t = new Intl.DateTimeFormat("en-GB", {
                    timeZone: data.settings.timezone,
                    hour: "2-digit",
                    minute: "2-digit",
                    hourCycle: "h23",
                  }).format(new Date());
                  return (
                    t >= data.settings.openingTime &&
                    t < data.settings.closingTime
                  );
                })()
                  ? "Center is open"
                  : `Opens ${timeLabel(data.settings.openingTime)}`}
              </span>
            </div>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/patients" element={<Patients />} />
              <Route path="/doctors" element={<Doctors />} />
              <Route path="/appointments" element={<Appointments />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.error ? "error" : ""}`}>
            {t.error ? <AlertCircle size={19} /> : <CheckCircle2 size={19} />}
            <span>{t.message}</span>
            <button
              aria-label="Dismiss notification"
              onClick={() => setToasts((s) => s.filter((x) => x.id !== t.id))}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
      {help && (
        <Modal
          wide
          title="A calmer way to manage care"
          subtitle="Your Medicart workspace guide"
          onClose={() => setHelp(false)}
        >
          <div className="modal-body help-content">
            <p>
              Start with your center settings, add your care team, then register
              patients and book their visits.
            </p>
            <ol>
              <li>
                <strong>Patients & doctors</strong>
                <p>
                  Add, search, view, and edit records. Open a record to archive
                  it. Archived records retain their appointment history.
                </p>
              </li>
              <li>
                <strong>Appointments</strong>
                <p>
                  Book 30-minute visits within center and doctor availability.
                  Edit a visit to reschedule, confirm, complete, or cancel it.
                  Only cancelled visits can be permanently deleted.
                </p>
              </li>
              <li>
                <strong>Your center</strong>
                <p>
                  Manage contact details, open days, hours, and the medical
                  center timezone in Settings. All dates use that timezone.
                </p>
              </li>
            </ol>
            <div className="notice">
              This local application contains fictional seed data. It has no
              compliance certification and needs further operational security
              review before handling real patient information.
            </div>
          </div>
          <div className="modal-footer">
            <span />
            <button className="button primary" onClick={() => setHelp(false)}>
              Got it <CheckCircle2 size={16} />
            </button>
          </div>
        </Modal>
      )}
    </WorkspaceContext.Provider>
  );
}
