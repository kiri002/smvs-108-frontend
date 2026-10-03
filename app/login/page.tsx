"use client";

import { Languages, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

function LoginForm() {
  const { login, user, ready } = useAuth();
  const { t, lang, setLang } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const [mobile, setMobile] = React.useState("");
  const [pin, setPin] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const next = params.get("next");
  const target = (home: string) => (next && next.startsWith("/") && !next.startsWith("//") ? next : home || "/dashboard");

  React.useEffect(() => {
    if (ready && user) router.replace(target(user.homeScreen));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const me = await login(mobile.trim(), pin.trim());
      router.replace(target(me.homeScreen));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-muted/40 flex min-h-dvh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mx-auto mb-2 flex size-14 items-center justify-center rounded-2xl bg-red-700 text-lg font-bold text-white">108</div>
          <CardTitle className="text-xl">SMVS 108</CardTitle>
          <CardDescription>{t("app.tagline")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-4">
            <Field label={t("login.mobile")} htmlFor="mobile">
              <Input
                id="mobile"
                inputMode="tel"
                autoComplete="username"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="98XXXXXXXX"
                className="h-11 text-lg"
                required
              />
            </Field>
            <Field label={t("login.pin")} htmlFor="pin">
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="h-11 text-lg tracking-widest"
                required
              />
            </Field>
            {error && (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            )}
            <Button type="submit" size="xl" disabled={busy}>
              {busy && <Loader2 className="animate-spin" />}
              {t("login.submit")}
            </Button>
            <p className="text-muted-foreground text-center text-xs">{t("login.help")}</p>
            <Button type="button" variant="ghost" size="sm" onClick={() => setLang(lang === "en" ? "gu" : "en")}>
              <Languages /> {lang === "en" ? "ગુજરાતી" : "English"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense>
      <LoginForm />
    </React.Suspense>
  );
}
