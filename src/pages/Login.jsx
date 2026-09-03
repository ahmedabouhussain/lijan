import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Mail, Lock, Loader2, Sparkles } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { safeReturnTo } from "@/lib/authReturnTo";
import { useEffectiveActor } from "@/lib/EffectiveActorContext";

export default function Login() {
  const navigate = useNavigate();
  const { enterDemo } = useEffectiveActor();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Post-login destination (e.g. the MCP OAuth consent page sends users here
  // with returnTo so the grant flow can resume). Same-origin paths only.
  const returnTo = safeReturnTo();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email, password);
      window.location.href = returnTo;
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    base44.auth.loginWithProvider("google", returnTo);
  };

  const handleDemoExplore = () => {
    // Clear stale demo context keys before exploring
    const demoKeys = [
      "activeOrganizationId", "activeCommitteeId", "activeMembershipId",
      "activeDemoPersona", "lastCommitteeRoute", "committeeQueryCache",
      "raqeem_active_org", "raqeem_active_committee",
    ];
    demoKeys.forEach((k) => localStorage.removeItem(k));
    // Establish a proper demo session — Fahad becomes the effective actor
    enterDemo();
    navigate("/");
  };

  return (
    <AuthLayout
      icon={LogIn}
      title="Welcome back"
      subtitle="Log in to your account"
      footer={
        <>
          Don't have an account?{" "}
          <Link
            to={"/register" + (returnTo !== "/" ? "?returnTo=" + encodeURIComponent(returnTo) : "")}
            className="text-primary font-medium hover:underline"
          >
            Create one
          </Link>
        </>
      }
    >
      <Button
        variant="outline"
        className="w-full h-12 text-sm font-medium mb-6"
        onClick={handleGoogle}
      >
        <GoogleIcon className="w-5 h-5 mr-2" />
        Continue with Google
      </Button>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-3 text-muted-foreground">or</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Logging in...
            </>
          ) : (
            "Log in"
          )}
        </Button>
      </form>

      <div className="mt-6 pt-6 border-t border-border">
        <div className="text-center mb-3 px-4 py-3 rounded-lg bg-accent/5 border border-accent/20">
          <div className="text-sm font-semibold text-foreground">فهد الفهيدي · Fahad Al-Fihaidi</div>
          <div className="text-xs text-muted-foreground mt-0.5">مدير التدقيق · Director of Audit</div>
          <div className="text-xs text-muted-foreground">مجلس التدقيق والمراجعة · Audit and Review Council</div>
          <div className="flex items-center justify-center gap-3 mt-2 text-[10px] text-accent font-medium">
            <span>3 جهات · 3 Orgs</span>
            <span>·</span>
            <span>7 لجان · 7 Committees</span>
            <span>·</span>
            <span>4 أدوار · 4 Roles</span>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full h-12 text-sm font-medium border-accent/40 text-accent hover:bg-accent/10"
          onClick={handleDemoExplore}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          استكشاف التجربة بشخصية فهد · Explore as Fahad
        </Button>
      </div>
    </AuthLayout>
  );
}