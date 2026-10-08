"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { prisma } from "@/lib/db";
import { bookingAdminSchema, messageStatusSchema } from "@/lib/validation/schemas";
import { adminMutation, idSchema, readForm, type ActionState } from "./helpers";

// Guest submissions are not public content, so these don't need to invalidate the website cache —
// but status changes and deletes call refresh() so the sidebar badges (counts of NEW items, in the admin layout) update now.
const noRevalidate = { revalidate: false };

export async function updateBookingInquiry(_p: ActionState, fd: FormData) {
  return adminMutation(async () => {
    const id = idSchema.parse(fd.get("id"));
    const data = bookingAdminSchema.parse(readForm(fd, ["status", "adminNotes"]));
    await prisma.bookingInquiry.update({ where: { id }, data });
    refresh();
    return "Inquiry updated.";
  }, noRevalidate);
}

export async function toggleArchiveBooking(_p: ActionState, fd: FormData) {
  return adminMutation(async () => {
    const id = idSchema.parse(fd.get("id"));
    const b = await prisma.bookingInquiry.findUniqueOrThrow({ where: { id }, select: { archived: true } });
    await prisma.bookingInquiry.update({ where: { id }, data: { archived: !b.archived } });
    refresh();
    return b.archived ? "Inquiry restored from the archive." : "Inquiry archived.";
  }, noRevalidate);
}

export async function deleteBookingInquiry(_p: ActionState, fd: FormData) {
  const result = await adminMutation(async () => {
    await prisma.bookingInquiry.delete({ where: { id: idSchema.parse(fd.get("id")) } });
    refresh();
    return "Inquiry deleted.";
  }, noRevalidate);
  if (result.ok) redirect("/admin/bookings");
  return result;
}

export async function updateMessageStatus(_p: ActionState, fd: FormData) {
  return adminMutation(async () => {
    const id = idSchema.parse(fd.get("id"));
    const status = messageStatusSchema.parse(fd.get("status"));
    await prisma.contactMessage.update({ where: { id }, data: { status } });
    refresh();
    return `Marked as ${status.toLowerCase()}.`;
  }, noRevalidate);
}

export async function deleteContactMessage(_p: ActionState, fd: FormData) {
  const result = await adminMutation(async () => {
    await prisma.contactMessage.delete({ where: { id: idSchema.parse(fd.get("id")) } });
    refresh();
    return "Message deleted.";
  }, noRevalidate);
  if (result.ok) redirect("/admin/messages");
  return result;
}
