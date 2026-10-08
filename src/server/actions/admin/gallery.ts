"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { galleryImageSchema } from "@/lib/validation/schemas";
import { deleteStoredImage, uploadImage } from "@/lib/storage";
import { adminMutation, idSchema, moveItem, readForm, type ActionState } from "./helpers";

function parseMeta(fd: FormData) {
  const data = galleryImageSchema.parse(readForm(fd, ["title", "caption", "alt", "credit", "categoryId"], ["isHotelPhoto", "featured"]));
  return { ...data, categoryId: data.categoryId || null };
}

export async function uploadGalleryImage(_p: ActionState, fd: FormData) {
  return adminMutation(async () => {
    const data = parseMeta(fd);
    const { url, storageKey } = await uploadImage(fd.get("file"), "gallery");
    // New uploads go to the top of the gallery.
    await prisma.galleryImage.updateMany({ data: { sortOrder: { increment: 1 } } });
    await prisma.galleryImage.create({ data: { ...data, url, storageKey, sortOrder: 1 } });
    return "Photo uploaded and added to the gallery.";
  });
}

export async function updateGalleryImage(_p: ActionState, fd: FormData) {
  return adminMutation(async () => {
    const id = idSchema.parse(fd.get("id"));
    const data = parseMeta(fd);
    const file = fd.get("file");
    if (file instanceof File && file.size > 0) {
      // Replace the picture but keep all details (title, category, order).
      const old = await prisma.galleryImage.findUniqueOrThrow({ where: { id }, select: { storageKey: true } });
      const { url, storageKey } = await uploadImage(file, "gallery");
      await prisma.galleryImage.update({ where: { id }, data: { ...data, url, storageKey } });
      if (old.storageKey) await deleteStoredImage(old.storageKey);
      return "Photo replaced and details saved.";
    }
    await prisma.galleryImage.update({ where: { id }, data });
    return "Photo details saved.";
  });
}

export async function deleteGalleryImage(_p: ActionState, fd: FormData) {
  return adminMutation(async () => {
    const img = await prisma.galleryImage.delete({ where: { id: idSchema.parse(fd.get("id")) } });
    if (img.storageKey) await deleteStoredImage(img.storageKey);
    return "Photo deleted.";
  });
}

export async function moveGalleryImage(_p: ActionState, fd: FormData) {
  return adminMutation(async () => {
    const id = idSchema.parse(fd.get("id"));
    const direction = z.enum(["up", "down"]).parse(fd.get("direction"));
    const all = await prisma.galleryImage.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }], select: { id: true, sortOrder: true } });
    await moveItem(all, id, direction, (gid, sortOrder) => prisma.galleryImage.update({ where: { id: gid }, data: { sortOrder } }));
    return "Order updated.";
  });
}
