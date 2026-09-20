import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useStore } from "@/data/store";

const pages = [
  { label: "Tableau de bord", to: "/" },
  { label: "Assistant RH", to: "/assistant" },
  { label: "Collaborateurs", to: "/collaborateurs" },
  { label: "Recrutement & onboarding", to: "/recrutement" },
  { label: "Congés & absences", to: "/conges" },
  { label: "Contrats & documents", to: "/documents" },
  { label: "Veille juridique", to: "/veille-juridique" },
  { label: "Assistant Google Sheets", to: "/sheets" },
  { label: "Intégrations", to: "/integrations" },
  { label: "Audit & sécurité", to: "/audit" },
  { label: "Paramètres", to: "/parametres" },
] as const;

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { employees, legalRules } = useStore();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="w-full justify-start gap-2 text-muted-foreground sm:w-72"
        aria-label="Ouvrir la recherche globale"
      >
        <Search className="size-4" />
        <span className="truncate">Rechercher…</span>
        <kbd className="ml-auto hidden rounded border border-border px-1.5 text-[10px] sm:inline">
          Ctrl K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Module, collaborateur, règle juridique…" />
        <CommandList>
          <CommandEmpty>Aucun résultat.</CommandEmpty>
          <CommandGroup heading="Modules">
            {pages.map((page) => (
              <CommandItem
                key={page.to}
                value={page.label}
                onSelect={() => {
                  setOpen(false);
                  navigate({ to: page.to });
                }}
              >
                {page.label}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Collaborateurs (DEMO)">
            {employees.map((employee) => (
              <CommandItem
                key={employee.id}
                value={`${employee.fullName} ${employee.position}`}
                onSelect={() => {
                  setOpen(false);
                  navigate({ to: "/collaborateurs/$id", params: { id: employee.id } });
                }}
              >
                <span>{employee.fullName}</span>
                <span className="ml-2 text-xs text-muted-foreground">{employee.position}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Règles juridiques">
            {legalRules.map((rule) => (
              <CommandItem
                key={rule.id}
                value={`${rule.topic} ${rule.title}`}
                onSelect={() => {
                  setOpen(false);
                  navigate({ to: "/veille-juridique" });
                }}
              >
                <span>{rule.title}</span>
                <span className="ml-2 text-xs text-muted-foreground">{rule.topic}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
