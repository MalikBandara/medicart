import { HeartPulse } from "lucide-react";
export default function Logo() {
  return (
    <div className="brand">
      <span className="brand-icon">
        <HeartPulse size={25} strokeWidth={2.5} />
      </span>
      <span>
        medicart<span className="brand-period">.</span>
      </span>
    </div>
  );
}
