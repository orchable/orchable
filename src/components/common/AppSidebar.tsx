import { Boxes, Play, Activity, Settings, Sparkles } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';

const mainNavItems = [
  { title: 'Designer', url: '/designer', icon: Boxes, description: 'Thiết kế Orchestrator' },
  { title: 'Launcher', url: '/launcher', icon: Play, description: 'Khởi chạy Execution' },
  { title: 'Monitor', url: '/monitor', icon: Activity, description: 'Theo dõi Tiến trình' },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      {/* Header */}
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-semibold text-sidebar-foreground">EduGen</span>
              <span className="text-xs text-sidebar-foreground/60">Learning Materials</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-xs tracking-wider">
            {!collapsed && 'Modules'}
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {mainNavItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={collapsed ? item.title : undefined}
                      className="h-auto"
                    >
                      <NavLink
                        to={item.url}
                        className="flex items-center px-3 rounded-lg transition-all duration-200 hover:bg-sidebar-accent group"
                        activeClassName="bg-sidebar-accent text-sidebar-primary"
                      >
                        <item.icon className={`h-5 w-5 transition-colors ${isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/70 group-hover:text-sidebar-foreground'}`} />
                        {!collapsed && (
                          <div className="flex flex-col">
                            <span className={`text-sm font-medium ${isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground'}`}>
                              {item.title}
                            </span>
                            <span className="text-xs text-sidebar-foreground/50">
                              {item.description}
                            </span>
                          </div>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip={collapsed ? 'Cài đặt' : undefined}>
              <NavLink
                to="/settings"
                className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all hover:bg-sidebar-accent"
                activeClassName="bg-sidebar-accent"
              >
                <Settings className="h-5 w-5 text-sidebar-foreground/70" />
                {!collapsed && (
                  <span className="text-sm text-sidebar-foreground/70">Cài đặt</span>
                )}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
