import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { passwordFingerprint } from "@/lib/security";

/**
 * The signed-in admin, or null. A session counts only if the account still exists AND its password
 * hasn't changed since login (fingerprint check) — so deleting an account or changing the password
 * logs out every other device immediately.
 */
export async function getAdmin() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const admin = await prisma.adminUser.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, role: true, passwordHash: true },
  });
  if (!admin || session.user.pwv !== passwordFingerprint(admin.passwordHash)) return null;
  return { id: admin.id, email: admin.email, name: admin.name, role: admin.role };
}

/** Authorisation guard for admin pages and EVERY admin Server Action. */
export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
