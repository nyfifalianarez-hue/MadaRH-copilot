import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { initWorkspace } from "@/lib/workspace.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Connexion — MadaRH Compliance" },
      { name: "description", content: "Connectez-vous à votre espace RH MadaRH Compliance." },
      { property: "og:title", content: "Connexion — MadaRH Compliance" },
      { property: "og:description", content: "Connectez-vous à votre espace RH MadaRH Compliance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const init = useServerFn(initWorkspace);
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrent(data.user?.email ?? null));
  }, []);

  const finish = async () => {
    await init();
    navigate({ to: "/" });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await finish();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth` },
        });
        if (error) throw error;
        if (data.session) await finish();
        else toast.success("Compte créé. Confirmez votre adresse via le courriel reçu, puis connectez-vous.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de la connexion.");
    } finally {
      setBusy(false);
    }
  };

  if (current) {
    return (
      <div className="panel mx-auto max-w-md space-y-3 p-6">
        <h1 className="text-xl font-semibold">Session active</h1>
        <p className="text-sm text-muted-foreground">Connecté en tant que {current}.</p>
        <Button
          variant="outline"
          onClick={async () => {
            await supabase.auth.signOut();
            setCurrent(null);
          }}
        >
          Se déconnecter
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="panel mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-xl font-semibold">{mode === "in" ? "Connexion" : "Créer un compte"}</h1>
      <div className="space-y-1">
        <Label htmlFor="email">Adresse e-mail</Label>
        <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="password">Mot de passe</Label>
        <Input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={busy} className="w-full">
        {mode === "in" ? "Se connecter" : "Créer le compte"}
      </Button>
      <button
        type="button"
        className="text-sm text-muted-foreground underline"
        onClick={() => setMode(mode === "in" ? "up" : "in")}
      >
        {mode === "in" ? "Pas de compte ? Créer un compte" : "Déjà un compte ? Se connecter"}
      </button>
    </form>
  );
}
