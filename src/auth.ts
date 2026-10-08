import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/validation/schemas";
import { clientIpFrom, hashIp, passwordFingerprint } from "@/lib/security";

// Lockouts are keyed on email + IP, so a stranger's wrong guesses can't lock the owner out.
// The high per-email cap only trips under a large distributed (botnet) guessing attack.
const MAX_FAILED_PER_IP = 10;
const MAX_FAILED_PER_EMAIL_AND_IP = 5;
const MAX_FAILED_PER_EMAIL = 50;
const WINDOW_MS = 15 * 60 * 1000;
const DAY_MS = 86_400_000;

class TooManyAttempts extends CredentialsSignin {
  code = "rate_limited";
}

// A real bcrypt hash of a random string — used so unknown emails take the same time as known ones.
const DUMMY_HASH = "$2b$12$Hb4n65MdetB.078VGnMFrepGqSFxCwUyCKtQMrQkIVCTzNqzYCA5K";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 }, // 8 hours
  pages: { signIn: "/admin/login" },
  trustHost: process.env.AUTH_TRUST_HOST === "true" || Boolean(process.env.VERCEL),
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw, request) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        const ipHash = hashIp(clientIpFrom(request.headers));
        const since = new Date(Date.now() - WINDOW_MS);

        const [ipFails, pairFails, emailFails] = await Promise.all([
          prisma.loginAttempt.count({ where: { ipHash, success: false, createdAt: { gte: since } } }),
          prisma.loginAttempt.count({ where: { email, ipHash, success: false, createdAt: { gte: since } } }),
          prisma.loginAttempt.count({ where: { email, success: false, createdAt: { gte: since } } }),
        ]);
        if (ipFails >= MAX_FAILED_PER_IP || pairFails >= MAX_FAILED_PER_EMAIL_AND_IP || emailFails >= MAX_FAILED_PER_EMAIL) throw new TooManyAttempts();

        const user = await prisma.adminUser.findUnique({ where: { email } });
        const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

        await prisma.loginAttempt.create({ data: { ipHash, email, success: Boolean(user && ok) } });
        if (!user || !ok) return null;

        await prisma.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
        // Housekeeping on each successful login, so these tables don't grow forever:
        // login attempts (hashed IPs) are kept 30 days, the email delivery log 90 days.
        await Promise.all([
          prisma.loginAttempt.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 30 * DAY_MS) } } }),
          prisma.notificationLog.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 90 * DAY_MS) } } }),
        ]).catch((err) => console.error("Log cleanup failed", err));
        return { id: user.id, email: user.email, name: user.name, pwv: passwordFingerprint(user.passwordHash) };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) {
        token.uid = user.id;
        token.pwv = user.pwv;
      }
      return token;
    },
    session({ session, token }) {
      if (token.uid && session.user) {
        session.user.id = token.uid as string;
        session.user.pwv = token.pwv as string | undefined;
      }
      return session;
    },
  },
});
