"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { facilitySchema, faqSchema } from "@/lib/validation/schemas";
import { FACILITY_ICON_KEYS } from "@/config/icons";
import { adminMutation, idSchema, moveItem, readForm, type ActionState } from "./helpers";

function parseFacility(fd: FormData) {
  const data = facilitySchema.parse(readForm(fd, ["name", "description", "icon"], ["active"]));
  return { ...data, icon: FACILITY_ICON_KEYS.includes(data.icon) ? data.icon : "check" };
}

export async function createFacility(_p: ActionState, fd: FormData) {
  return adminMutation(async () => {
    const data = parseFacility(fd);
    const max = await prisma.facility.aggregate({ _max: { sortOrder: true } });
    await prisma.facility.create({ data: { ...data, sortOrder: (max._max.sortOrder ?? 0) + 1 } });
    return `“${data.name}” added${data.active ? " and now shown on the website" : ""}.`;
  });
}

export async function updateFacility(_p: ActionState, fd: FormData) {
  return adminMutation(async () => {
    const id = idSchema.parse(fd.get("id"));
    await prisma.facility.update({ where: { id }, data: parseFacility(fd) });
    return "Facility saved.";
  });
}

export async function toggleFacility(_p: ActionState, fd: FormData) {
  return adminMutation(async () => {
    const id = idSchema.parse(fd.get("id"));
    const f = await prisma.facility.findUniqueOrThrow({ where: { id }, select: { active: true } });
    await prisma.facility.update({ where: { id }, data: { active: !f.active } });
    return f.active ? "Facility hidden from the website." : "Facility is now shown on the website.";
  });
}

export async function deleteFacility(_p: ActionState, fd: FormData) {
  return adminMutation(async () => {
    await prisma.facility.delete({ where: { id: idSchema.parse(fd.get("id")) } });
    return "Facility deleted.";
  });
}

export async function moveFacility(_p: ActionState, fd: FormData) {
  return adminMutation(async () => {
    const id = idSchema.parse(fd.get("id"));
    const direction = z.enum(["up", "down"]).parse(fd.get("direction"));
    const all = await prisma.facility.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, sortOrder: true } });
    await moveItem(all, id, direction, (fid, sortOrder) => prisma.facility.update({ where: { id: fid }, data: { sortOrder } }));
    return "Order updated.";
  });
}

// ── FAQs ──────────────────────────────

export async function createFaq(_p: ActionState, fd: FormData) {
  return adminMutation(async () => {
    const data = faqSchema.parse(readForm(fd, ["question", "answer"], ["active"]));
    const max = await prisma.fAQ.aggregate({ _max: { sortOrder: true } });
    await prisma.fAQ.create({ data: { ...data, sortOrder: (max._max.sortOrder ?? 0) + 1 } });
    return "Question added.";
  });
}

export async function updateFaq(_p: ActionState, fd: FormData) {
  return adminMutation(async () => {
    const id = idSchema.parse(fd.get("id"));
    await prisma.fAQ.update({ where: { id }, data: faqSchema.parse(readForm(fd, ["question", "answer"], ["active"])) });
    return "Question saved.";
  });
}

export async function deleteFaq(_p: ActionState, fd: FormData) {
  return adminMutation(async () => {
    await prisma.fAQ.delete({ where: { id: idSchema.parse(fd.get("id")) } });
    return "Question deleted.";
  });
}

export async function moveFaq(_p: ActionState, fd: FormData) {
  return adminMutation(async () => {
    const id = idSchema.parse(fd.get("id"));
    const direction = z.enum(["up", "down"]).parse(fd.get("direction"));
    const all = await prisma.fAQ.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, sortOrder: true } });
    await moveItem(all, id, direction, (fid, sortOrder) => prisma.fAQ.update({ where: { id: fid }, data: { sortOrder } }));
    return "Order updated.";
  });
}
