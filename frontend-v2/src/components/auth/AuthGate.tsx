import * as React from "react";
import { ArrowRight, Eye, EyeOff, Loader2, LockKeyhole } from "lucide-react";
import { api, ApiError, onUnauthorized } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AuthState = "checking" | "signed-out" | "signed-in" | "unavailable";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AuthState>("checking");
  const [attempt, setAttempt] = React.useState(0);
  const [message, setMessage] = React.useState("");

  React.useEffect(() => onUnauthorized(() => {
    setMessage("Your session has ended. Sign in again to continue.");
    setState("signed-out");
  }), []);

  React.useEffect(() => {
    const controller = new AbortController();
    api.checkSession(controller.signal).then(
      () => { if (!controller.signal.aborted) setState("signed-in"); },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setState(error instanceof ApiError && error.status === 401 ? "signed-out" : "unavailable");
      },
    );
    return () => controller.abort();
  }, [attempt]);

  if (state === "signed-in") return <>{children}</>;

  return (
    <main className="relative flex h-full min-h-0 items-start justify-center overflow-y-auto bg-background px-5 py-10 sm:py-16">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.12),transparent_65%)]" />
      <div className="relative my-auto w-full max-w-sm shrink-0">
        <div className="mb-9 flex flex-col items-center text-center">
          <img src="/logo.svg" alt="" className="mb-4 size-14" />
          <span className="text-2xl font-semibold tracking-tight">Clef</span>
          <p className="mt-2 text-sm text-muted-foreground">Your music. Every detail in tune.</p>
        </div>

        <section aria-labelledby="auth-title" className="rounded-2xl border border-border bg-card p-6 shadow-2xl shadow-black/20 sm:p-8">
          {state === "checking" ? (
            <div role="status" className="flex flex-col items-center gap-4 py-6 text-sm text-muted-foreground">
              <Loader2 aria-hidden="true" className="size-6 animate-spin text-primary" />
              <h1 id="auth-title">Checking your session…</h1>
            </div>
          ) : state === "unavailable" ? (
            <div className="space-y-5">
              <h1 id="auth-title" className="text-xl font-semibold">Unable to connect</h1>
              <p role="alert" className="text-sm leading-relaxed text-muted-foreground">We couldn’t reach your library. Check that the Clef server is running, then try again.</p>
              <Button className="w-full" onClick={() => { setState("checking"); setAttempt((n) => n + 1); }}>Try again</Button>
            </div>
          ) : (
            <LoginForm message={message} onSignedIn={() => { setMessage(""); setState("signed-in"); }} />
          )}
        </section>
        <p className="mt-6 text-center text-xs text-muted-foreground">A little order for your music collection.</p>
      </div>
    </main>
  );
}

function LoginForm({ message, onSignedIn }: { message: string; onSignedIn: () => void }) {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [visible, setVisible] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const request = React.useRef<AbortController | null>(null);
  const errorId = React.useId();

  React.useEffect(() => () => request.current?.abort(), []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (request.current || !username.trim() || !password) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError("");
    let loginAccepted = false;
    try {
      await api.login(username, password, controller.signal);
      loginAccepted = true;
      await api.checkSession(controller.signal);
      if (!controller.signal.aborted) {
        setPassword("");
        onSignedIn();
      }
    } catch (error: unknown) {
      if (controller.signal.aborted) return;
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        setError(loginAccepted
          ? "We couldn’t confirm your session. Please try signing in again."
          : "Incorrect username or password.");
      } else if (error instanceof ApiError && error.status === 429) {
        setError("Too many sign-in attempts. Please wait a moment and try again.");
      } else {
        setError("Unable to sign in. Check your connection and try again.");
      }
    } finally {
      if (!controller.signal.aborted) {
        request.current = null;
        setBusy(false);
      }
    }
  }

  return (
    <>
      <div className="mb-6">
        <h1 id="auth-title" className="text-xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-2 text-sm text-muted-foreground">Sign in to your music library.</p>
      </div>
      {message && <p role="status" className="mb-5 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">{message}</p>}
      <form onSubmit={submit} className="space-y-5" aria-busy={busy}>
        <div className="space-y-2">
          <label htmlFor="username" className="text-sm font-medium">Username</label>
          <Input id="username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} autoFocus required disabled={busy} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter your username" className="h-11" aria-describedby={error ? errorId : undefined} />
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">Password</label>
          <div className="relative">
            <Input id="password" name="password" type={visible ? "text" : "password"} autoComplete="current-password" required disabled={busy} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" className="h-11 pr-12" aria-describedby={error ? errorId : undefined} />
            <Button type="button" variant="ghost" size="icon-sm" className="absolute right-1.5 top-1.5 text-muted-foreground" aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible} disabled={busy} onClick={() => setVisible((value) => !value)}>
              {visible ? <EyeOff /> : <Eye />}
            </Button>
          </div>
        </div>
        {error && <p id={errorId} role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        <Button type="submit" className="h-11 w-full gap-2" disabled={busy || !username.trim() || !password}>
          {busy ? <><Loader2 className="animate-spin" /> Signing in…</> : <>Sign in <ArrowRight /></>}
        </Button>
      </form>
      <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <LockKeyhole aria-hidden="true" className="size-3.5" />
        Your personal music workspace
      </div>
    </>
  );
}
