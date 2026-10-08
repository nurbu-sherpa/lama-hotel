"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { pageMetaSchema, sectionSchema } from "@/lib/validation/schemas";
import { deleteStoredImage, uploadImage } from "@/lib/storage";
import { adminMutation, idSchema, moveItem, readForm, type ActionState } from "./helpers";

/** Update one page section (homepage block or Jiri guide section), optionally replacing/removing its image. */
export async function updateSection(_p: ActionState, fd: FormData) {
  return adminMutation(async () => {
    const id = idSchema.parse(fd.get("id"));
    const data = sectionSchema.parse(readForm(fd, ["heading", "body", "imageAlt", "imageCredit"]));
    const file = fd.get("file");
    const removeImage = fd.get("removeImage") === "on";
    const extra: { imageUrl?: string } = {};

    if (file instanceof File && file.size > 0) {
      if (!data.imageAlt) return { ok: false, message: "Please add a short description of the image (alt text).", errors: { imageAlt: ["Required when adding an image"] } };
      extra.imageUrl = (await uploadImage(file, "pages")).url;
    } else if (removeImage) {
      extra.imageUrl = "";
    }
    await prisma.pageSection.update({ where: { id }, data: { ...data, ...extra } });
    return "Section saved. The website has been updated.";
  });
}

export async function createSection(_p: ActionState, fd: FormData) {
  return adminMutation(async () => {
    const pageId = idSchema.parse(fd.get("pageId"));
    const data = sectionSchema.parse(readForm(fd, ["heading", "body", "imageAlt", "imageCredit"]));
    if (!data.heading) return { ok: false, message: "Please add a heading.", errors: { heading: ["Heading is required"] } };
    let imageUrl = "";
    const file = fd.get("file");
    if (file instanceof File && file.size > 0) {
      if (!data.imageAlt) return { ok: false, message: "Please add a short description of the image (alt text).", errors: { imageAlt: ["Required when adding an image"] } };
      imageUrl = (await uploadImage(file, "pages")).url;
    }
    const max = await prisma.pageSection.aggregate({ where: { pageId }, _max: { sortOrder: true } });
    await prisma.pageSection.create({
      data: { pageId, key: `section-${randomUUID().slice(0, 8)}`, ...data, imageUrl, sortOrder: (max._max.sortOrder ?? 0) + 1 },
    });
    return "Section added.";
  });
}

export async function deleteSection(_p: ActionState, fd: FormData) {
  return adminMutation(async () => {
    const s = await prisma.pageSection.delete({ where: { id: idSchema.parse(fd.get("id")) } });
    if (s.imageUrl.startsWith("/uploads/")) await deleteStoredImage(`local:${s.imageUrl.slice("/uploads/".length)}`);
    return "Section deleted.";
  });
}

export async function moveSection(_p: ActionState, fd: FormData) {
  return adminMutation(async () => {
    const id = idSchema.parse(fd.get("id"));
    const direction = z.enum(["up", "down"]).parse(fd.get("direction"));
    const s = await prisma.pageSection.findUniqueOrThrow({ where: { id }, select: { pageId: true } });
    const all = await prisma.pageSection.findMany({ where: { pageId: s.pageId }, orderBy: { sortOrder: "asc" }, select: { id: true, sortOrder: true } });
    await moveItem(all, id, direction, (sid, sortOrder) => prisma.pageSection.update({ where: { id: sid }, data: { sortOrder } }));
    return "Order updated.";
  });
}

export async function updatePageMeta(_p: ActionState, fd: FormData) {
  return adminMutation(async () => {
    const id = idSchema.parse(fd.get("id"));
    const raw = readForm(fd, ["title", "intro", "metaTitle", "metaDescription"]);
    // Only update the fields this particular form included.
    const data = Object.fromEntries(Object.entries(pageMetaSchema.parse(raw)).filter(([k]) => fd.has(k)));
    await prisma.page.update({ where: { id }, data });
    return "Page saved.";
  });
}
