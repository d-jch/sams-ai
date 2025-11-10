import { createDefine } from "fresh";
import type { Session, User } from "./lib/types.ts";

// This specifies the type of "ctx.state" which is used to share
// data among middlewares, layouts and routes.
export interface State {
  shared: string;
  user: User | null;
  session: Session | null;
  // Page metadata
  title?: string;
  description?: string;
}

export const define = createDefine<State>();
