"use client";

import { Loader2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { errorMessage, post, tokenStore } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n, type Lang } from "@/lib/i18n";

export default function ProfilePage() {
  const { t, lang, setLang } = useI18n();
  const { user } = useAuth();
  const [currentPin, setCurrentPin] = React.useState("");
  const [newPin, setNewPin] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const changePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await post<{ token: string }>("/auth/change-pin", { currentPin, newPin });
      tokenStore.set(res.token);
      setCurrentPin("");
      setNewPin("");
      toast.success(t("common.saved"));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const changeLang = (l: Lang) => {
    setLang(l);
    void post("/auth/language", { language: l }).catch(() => {});
  };

  return (
    <div className="flex max-w-lg flex-col gap-4">
      <PageHeader title={t("profile.title")} description={user ? `${user.name} · ${user.mobile} · ${user.roleLabel}` : undefined} />
      <Card className="gap-3 py-4">
        <CardContent className="px-4">
          <Field label={t("common.language")} htmlFor="lang">
            <Select id="lang" value={lang} onChange={(e) => changeLang(e.target.value as Lang)}>
              <option value="en">English</option>
              <option value="gu">ગુજરાતી</option>
            </Select>
          </Field>
        </CardContent>
      </Card>
      <Card className="gap-3 py-4">
        <CardHeader className="px-4">
          <CardTitle>{t("profile.changePin")}</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <form onSubmit={changePin} className="grid gap-3">
            <Field label={t("profile.currentPin")} htmlFor="cur">
              <Input id="cur" type="password" inputMode="numeric" value={currentPin} onChange={(e) => setCurrentPin(e.target.value)} required />
            </Field>
            <Field label={t("profile.newPin")} htmlFor="new" hint="4–8 digits">
              <Input id="new" type="password" inputMode="numeric" value={newPin} onChange={(e) => setNewPin(e.target.value)} required pattern="\d{4,8}" />
            </Field>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="animate-spin" />}
              {t("common.save")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
