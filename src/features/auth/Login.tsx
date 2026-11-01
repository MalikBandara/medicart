import { useState, type FormEvent } from "react";
import {
  Users,
  CalendarDays,
  CheckCircle2,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  Mail,
  LockKeyhole,
  HeartPulse,
} from "lucide-react";
import Logo from "../../app/Logo";
import { api } from "../../shared/utils/api";
export default function Login({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [show, setShow] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/login", "POST", { email, password });
      onLogin();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login-page">
      <section className="login-story">
        <Logo />
        <div className="login-story-content">
          <span className="login-tag">
            <span className="live-dot" /> A LITTLE MORE CONNECTED
          </span>
          <h1>
            Better days.
            <br />
            Better care.
            <br />
            <span>All together.</span>
          </h1>
          <p>
            A calmer way to manage your medical center.
            <br />
            Built around people, so you can focus on care.
          </p>
          <div className="login-illustration">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="illustration-cross">
              <HeartPulse size={70} strokeWidth={1.5} />
            </div>
            <div className="float-card float-a">
              <span className="stat-icon teal">
                <Users size={19} />
              </span>
              <div>
                <strong>People come first</strong>
                <small>Every patient. Every day.</small>
              </div>
              <CheckCircle2 size={17} />
            </div>
            <div className="float-card float-b">
              <span className="stat-icon blue">
                <CalendarDays size={19} />
              </span>
              <div>
                <strong>A little more organized</strong>
                <small>A lot more peace of mind.</small>
              </div>
            </div>
          </div>
        </div>
        <span className="login-copyright">
          Thoughtful care. Connected people.
        </span>
      </section>
      <section className="login-form-side">
        <div className="login-mobile-brand">
          <Logo />
        </div>
        <div className="login-form">
          <span className="eyebrow">YOUR CARE WORKSPACE</span>
          <h2>Good to see you.</h2>
          <p>Sign in to keep great care moving.</p>
          <form onSubmit={submit}>
            <label className="field">
              <span>Staff email</span>
              <div className="login-input">
                <Mail size={18} />
                <input
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@medicalcenter.com"
                />
              </div>
            </label>
            <label className="field">
              <span>Password</span>
              <div className="login-input">
                <LockKeyhole size={18} />
                <input
                  type={show ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="icon-button"
                  aria-label={show ? "Hide password" : "Show password"}
                  onClick={() => setShow((s) => !s)}
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            <button className="button primary login-submit" disabled={busy}>
              {busy ? "Signing in…" : "Sign in to your workspace"}
              <ArrowRight size={17} />
            </button>
          </form>
          <div className="login-secure">
            <ShieldCheck size={16} />A secure space for your care team
          </div>
          <div className="login-setup">
            <strong>First time setting up?</strong>
            <p>
              Configure your staff credentials in <code>.env</code>, then run{" "}
              <code>npm run seed</code>. See the project README for setup
              instructions.
            </p>
          </div>
        </div>
        <div className="login-bottom">Made for the people who care.</div>
      </section>
    </main>
  );
}
