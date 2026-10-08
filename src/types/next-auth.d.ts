import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    /** pwv: password fingerprint at login (see lib/auth.ts getAdmin). */
    user: { id: string; pwv?: string } & DefaultSession["user"];
  }
  interface User {
    pwv?: string;
  }
}
