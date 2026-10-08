"use server";

import { prisma } from "@/lib/db";
import { hotelSettingsSchema, mapsSettingsSchema, seoSettingsSchema } from "@/lib/validation/schemas";
import { uploadImage } from "@/lib/storage";
import { AVAILABILITY_TAG, CONTENT_TAG } from "@/config/site";
import { adminMutation, readForm, type ActionState } from "./helpers";

export async function updateHotelSettings(_p: ActionState, fd: FormData) {
  return adminMutation(async () => {
    const data = hotelSettingsSchema.parse(
      readForm(fd, [
        "name",
        "tagline",
        "description",
        "phone",
        "whatsapp",
        "email",
        "address",
        "locationDescription",
        "city",
        "region",
        "country",
        "checkInTime",
        "checkOutTime",
        "googleBusinessUrl",
        "facebookUrl",
        "instagramUrl",
        "tiktokUrl",
        "youtubeUrl",
      ]),
    );
    await prisma.hotelSettings.update({ where: { id: "default" }, data });
    return "Hotel information saved. The website has been updated.";
  });
}

export async function updateMapsSettings(_p: ActionState, fd: FormData) {
  return adminMutation(async () => {
    const data = mapsSettingsSchema.parse(readForm(fd, ["googleMapsUrl", "googleMapsEmbedUrl", "locationDescription", "googleBusinessUrl"]));
    await prisma.hotelSettings.update({ where: { id: "default" }, data });
    return "Google Maps settings saved.";
  });
}

export async function updateSeoSettings(_p: ActionState, fd: FormData) {
  return adminMutation(async () => {
    const data = seoSettingsSchema.parse(readForm(fd, ["siteTitle", "titleTemplate", "defaultDescription", "googleSiteVerification"]));
    const file = fd.get("file");
    let defaultOgImageUrl: string | undefined;
    if (file instanceof File && file.size > 0) defaultOgImageUrl = (await uploadImage(file, "pages")).url;
    await prisma.sEOSettings.update({ where: { id: "default" }, data: { ...data, ...(defaultOgImageUrl ? { defaultOgImageUrl } : {}) } });
    return "SEO settings saved.";
  });
}

export async function togglePublicAvailability(): Promise<ActionState> {
  return adminMutation(
    async () => {
      const h = await prisma.hotelSettings.findUniqueOrThrow({ where: { id: "default" }, select: { showPublicAvailability: true } });
      await prisma.hotelSettings.update({ where: { id: "default" }, data: { showPublicAvailability: !h.showPublicAvailability } });
      return h.showPublicAvailability ? "Public availability hidden. The website shows normal room information." : "The website now shows how many rooms are available (counts only).";
    },
    { tags: [CONTENT_TAG, AVAILABILITY_TAG] },
  );
}
