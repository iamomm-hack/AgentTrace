import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

interface EmptyStateProps {
  title: string;
  children: ReactNode;
  icon?: IconName;
  action?: { label: string; href: string };
}

export function EmptyState({ title, children, icon = "trace", action }: EmptyStateProps) {
  return <div className="empty-state"><span className="empty-icon"><Icon name={icon} width={24} height={24} /></span><strong>{title}</strong><p>{children}</p>{action && <a className="button button-light" href={action.href}>{action.label}<Icon name="arrow" width={14} height={14} /></a>}</div>;
}
