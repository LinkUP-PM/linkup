import type { ApplicationEventType } from "@linkup/shared";
import { prisma } from "./prisma.js";

export async function appendApplicationEvent(
  applicationId: string,
  type: ApplicationEventType,
  at: Date = new Date(),
): Promise<void> {
  await prisma.applicationEvent.create({
    data: {
      applicationId,
      type,
      at,
    },
  });
}
