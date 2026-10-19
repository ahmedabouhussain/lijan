import React, { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

// Grouped navigation. Only the items handed in are rendered, so a link the actor may not
// open is never listed (no disabled filler). The active item is marked by a thin indicator
// bar, a calmer surface and its weight — never by colour alone — and is kept in view when
// the route changes.

export default function SidebarNav({ groups = [], collapsed = false, onNavigate, label }) {
  const location = useLocation();
  const activeRef = useRef(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [location.pathname]);

  const visible = groups.filter((group) => group && group.items && group.items.length > 0);

  return (
    <nav
      aria-label={label}
      className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden sidebar-scroll px-3 py-4"
    >
      {visible.map((group, index) => (
        <div key={group.id || index} className={index === 0 ? "" : "mt-5"}>
          {collapsed ? (
            index > 0 && <div className="mx-2 mb-3 border-t border-sidebar-border/60" aria-hidden="true" />
          ) : (
            group.title && (
              <div className="sidebar-group-label px-3 pb-2">
                {group.title}
              </div>
            )
          )}
          <ul className="space-y-1">
            {group.items.map((item) => {
              const active = item.active === true;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "relative flex items-center min-h-[42px] rounded-control transition-colors duration-150 ease-sovereign",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
                      collapsed ? "justify-center px-0" : "gap-2.5 px-3",
                      active
                        ? "bg-white/[0.11] text-sidebar-foreground font-medium"
                        : "text-sidebar-foreground/75 hover:bg-white/[0.06] hover:text-sidebar-foreground"
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute start-0 top-1/2 -translate-y-1/2 w-[3px] rounded-full bg-accent transition-all duration-150 ease-sovereign",
                        active ? "h-[18px] opacity-100" : "h-0 opacity-0"
                      )}
                    />
                    <item.icon className="w-[18px] h-[18px] shrink-0 stroke-[1.75]" aria-hidden="true" />
                    {!collapsed && <span className="text-[15px] truncate">{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}