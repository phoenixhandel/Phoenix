import { type ReactNode } from "react";
import { WorkspaceShell } from "./WorkspaceShell";

type Section = "account" | "markets" | "activity" | "verification";

export const PublicPage = ({
  eyebrow,
  title,
  description,
  children,
  active = "account"
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  active?: Section;
}) => (
  <WorkspaceShell active={active} title={title} description={description} meta={<p className="phoenix-kicker">{eyebrow}</p>}>
    {children}
  </WorkspaceShell>
);
