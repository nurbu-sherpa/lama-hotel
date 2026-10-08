"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { accountSchema, notificationSettingsSchema, passwordChangeSchema } from "@/lib/validation/schemas";
import { sendTestEmail } from "@/lib/notify";
import { adminMutation, readForm, type ActionState } from "./helpers";

export async function login(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await signIn("credentials", {
      email: String(fd.get("email") ?? ""),
      password: String(fd.get("password") ?? ""),
      redirectTo: "/admin/dashboard",
    });
    return { ok: true, message: "" };
  } catch (err) {
    if (err instanceof AuthError) {
      const rateLimited = "code" in err && (err as { code?: string }).code === "rate_limited";
      return {
        ok: false,
        at: Date.now(),
        message: rateLimited ? "Too many failed attempts. Please wait 15 minutes and try again." : "Incorrect email or password.",
      };
    }
    throw err; // successful sign-in throws a redirect — let Next.js handle it
  }
}

export async function logout() {
  await signOut({ redirectTo: "/admin/login" });
}

export async function changePassword(_p: ActionState, fd: FormData) {
  const result = await adminMutation(
    async () => {
      const admin = await requireAdmin();
      const data = passwordChangeSchema.parse(readForm(fd, ["currentPassword", "newPassword", "confirmPassword"]));
      const user = await prisma.adminUser.findUniqueOrThrow({ where: { id: admin.id } });
      if (!(await bcrypt.compare(data.currentPassword, user.passwordHash))) {
        return { ok: false, message: "Your current password is incorrect.", errors: { currentPassword: ["Incorrect password"] } };
      }
      await prisma.adminUser.update({ where: { id: admin.id }, data: { passwordHash: await bcrypt.hash(data.newPassword, 12) } });
      return "Password changed.";
    },
    { revalidate: false },
  );
  // The new password invalidated every session (including this one) — sign in again with it.
  // Outside adminMutation, whose catch-all would swallow signOut's redirect.
  if (result.ok) await signOut({ redirectTo: "/admin/login?changed=1" });
  return result;
}

export async function updateAccount(_p: ActionState, fd: FormData) {
  return adminMutation(async () => {
    const admin = await requireAdmin();
    // Only the display name — notification recipients are saved by updateNotificationSettings.
    const data = accountSchema.pick({ name: true }).parse(readForm(fd, ["name"]));
    await prisma.adminUser.update({ where: { id: admin.id }, data: { name: data.name } });
    return "Settings saved.";
  });
}

// ── Owner notifications ──────────────────────────────

export async function updateNotificationSettings(_p: ActionState, fd: FormData) {
  return adminMutation(async () => {
    const data = notificationSettingsSchema.parse(readForm(fd, ["notificationEmail"], ["notifyEmail"]));
    await prisma.hotelSettings.update({ where: { id: "default" }, data });
    return "Notification settings saved.";
  }, { revalidate: false });
}

export async function sendTestNotification() {
  return adminMutation(async () => {
    const h = await prisma.hotelSettings.findUniqueOrThrow({ where: { id: "default" }, select: { email: true, notificationEmail: true } });
    const to = h.notificationEmail || h.email;
    const r = await sendTestEmail(to);
    return { ok: r.success, message: r.success ? `Test email sent to ${to}. Check the inbox (and spam folder).` : r.detail };
  }, { revalidate: false });
}
