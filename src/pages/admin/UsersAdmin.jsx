import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, UserPlus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StatusBadge from "@/components/raqeem/StatusBadge";

const ROLES = [
  { value: "admin", ar: "مدير" },
  { value: "user", ar: "مستخدم" },
];

export default function UsersAdmin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");
  const [inviting, setInviting] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = () => {
    setLoading(true);
    base44.entities.User.list()
      .then(setUsers)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const invite = async (e) => {
    e.preventDefault();
    if (!email.trim() || inviting) return;
    setInviting(true);
    setMsg(null);
    try {
      await base44.users.inviteUser(email.trim(), role);
      setEmail("");
      setMsg({ type: "ok", text: "تم إرسال الدعوة بنجاح" });
      load();
    } catch (err) {
      setMsg({ type: "err", text: err?.message || "تعذّر إرسال الدعوة" });
    }
    setInviting(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link to="/admin" className="text-muted-foreground hover:text-foreground">الإدارة</Link>
        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="font-semibold">المستخدمون · Users</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">المستخدمون · Users</h1>
        <p className="text-sm text-muted-foreground mt-1">دعوة وإدارة المستخدمين والأدوار</p>
      </div>

      <div className="raqeem-card p-5">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><UserPlus className="w-4 h-4 text-primary" /> دعوة مستخدم جديد</h3>
        <form onSubmit={invite} className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 w-full">
            <Label className="mb-1.5">البريد الإلكتروني</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@institution.gov" required />
          </div>
          <div className="w-full sm:w-40">
            <Label className="mb-1.5">الدور</Label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full h-9 px-3 rounded-md border border-input bg-card text-sm">
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.ar}</option>)}
            </select>
          </div>
          <Button type="submit" disabled={inviting || !email.trim()}>{inviting ? "جارٍ الإرسال…" : "إرسال الدعوة"}</Button>
        </form>
        {msg && (
          <p className={`text-xs mt-3 ${msg.type === "ok" ? "text-emerald-700" : "text-destructive"}`}>{msg.text}</p>
        )}
      </div>

      <div className="raqeem-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">المستخدمون المسجّلون ({users.length})</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">جارٍ التحميل…</div>
        ) : (
          <div className="divide-y divide-border">
            {users.map((u) => (
              <div key={u.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">{u.full_name || "—"}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </div>
                <StatusBadge
                  label={u.role === "admin" ? "مدير" : "مستخدم"}
                  colorClass={u.role === "admin" ? "text-primary bg-primary/10" : "text-muted-foreground bg-secondary"}
                />
              </div>
            ))}
            {users.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">لا يوجد مستخدمون مسجّلون</div>}
          </div>
        )}
      </div>
    </div>
  );
}