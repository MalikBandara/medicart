import { createContext, useContext } from "react";
import type { Data } from "../types";
export type Workspace = {
  data: Data;
  refresh: () => Promise<void>;
  notify: (message: string, error?: boolean) => void;
};
export const WorkspaceContext = createContext<Workspace | null>(null);
export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("Missing workspace provider");
  return value;
}
