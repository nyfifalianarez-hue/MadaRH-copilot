import { Link, useRouterState } from "@tanstack/react-router";
import {
  BookOpenCheck,
  CalendarDays,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Plug,
  Settings,
  ShieldCheck,
  Sheet,
  UserPlus,
  Users,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useStore } from "@/data/store";
import { roleLabels } from "@/data/labels";

const groups = [
  {
    label: "Pilotage",
    items: [
      { title: "Tableau de bord", url: "/", icon: LayoutDashboard },
      { title: "Assistant RH", url: "/assistant", icon: MessageSquare },
    ],
  },
  {
    label: "Personnel",
    items: [
      { title: "Collaborateurs", url: "/collaborateurs", icon: Users },
      { title: "Recrutement", url: "/recrutement", icon: UserPlus },
      { title: "Congés & absences", url: "/conges", icon: CalendarDays },
      { title: "Contrats & documents", url: "/documents", icon: FileText },
    ],
  },
  {
    label: "Conformité",
    items: [
      { title: "Veille juridique", url: "/veille-juridique", icon: BookOpenCheck },
      { title: "Audit & sécurité", url: "/audit", icon: ShieldCheck },
    ],
  },
  {
    label: "Outils",
    items: [
      { title: "Assistant Sheets", url: "/sheets", icon: Sheet },
      { title: "Intégrations", url: "/integrations", icon: Plug },
      { title: "Paramètres", url: "/parametres", icon: Settings },
    ],
  },
] as const;

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { profile } = useStore();

  const isActive = (url: string) =>
    url === "/" ? pathname === "/" : pathname === url || pathname.startsWith(`${url}/`);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-1 py-1.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground">
            RH
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">MadaRH Compliance</p>
              <p className="truncate text-xs text-sidebar-foreground/70">Copilote RH · Madagascar</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                      <Link to={item.url} className="flex items-center gap-2">
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        {!collapsed && (
          <div className="rounded-md bg-sidebar-accent px-2 py-2 text-xs text-sidebar-accent-foreground">
            <p className="font-medium">{profile.fullName}</p>
            <p className="text-sidebar-foreground/70">{roleLabels[profile.role]}</p>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
