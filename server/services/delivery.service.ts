import { DeliveryStatus, FulfillmentMethod } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { Errors } from "@/server/errors";
import { createNotification } from "@/lib/notifications/service";
import { createSettlementForDeliveredOrder } from "@/server/services/settlement.service";

export async function getFulfillmentQuote(
  method: FulfillmentMethod,
  locationId?: string
) {
  if (method === "PICKUP") {
    return { shippingCost: 0, zone: null, promisedBy: null };
  }
  if (!locationId) throw Errors.badRequest("Choose a campus delivery zone.");

  const zone = await prisma.deliveryZone.findFirst({
    where: { locationId, isActive: true },
    include: { location: { select: { id: true, name: true, slug: true } } },
  });
  if (!zone) throw Errors.badRequest("Campus delivery is not available for this location.");

  return {
    shippingCost: Number(zone.deliveryFee),
    zone,
    promisedBy: new Date(Date.now() + zone.promisedMinutes * 60_000),
  };
}

export async function createDeliveryTaskForPaidOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true, buyerId: true, orderNumber: true, fulfillmentMethod: true,
      shippingAddress: true,
    },
  });
  if (!order || order.fulfillmentMethod !== "CAMPUS_DELIVERY") return null;

  const locationId = (order.shippingAddress as Record<string, unknown>).fulfillmentLocationId;
  if (typeof locationId !== "string") throw new Error("Campus delivery order has no fulfillment location");
  const quote = await getFulfillmentQuote("CAMPUS_DELIVERY", locationId);
  if (!quote.zone || !quote.promisedBy) return null;

  const task = await prisma.deliveryTask.upsert({
    where: { orderId },
    create: { orderId, zoneId: quote.zone.id, promisedBy: quote.promisedBy },
    update: {},
  });
  await createNotification({
    userId: order.buyerId,
    type: "ORDER",
    title: "Campus delivery scheduled",
    body: `Order ${order.orderNumber} is scheduled for delivery by ${quote.promisedBy.toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" })}.`,
    data: { orderId, deliveryTaskId: task.id },
  });
  return task;
}

export async function listOperationsQueue() {
  return prisma.deliveryTask.findMany({
    where: { status: { in: ["UNASSIGNED", "ASSIGNED", "PICKED_UP"] } },
    orderBy: { promisedBy: "asc" },
    include: {
      zone: { include: { location: { select: { name: true } } } },
      order: { select: { orderNumber: true, sellerId: true, buyerId: true, shippingAddress: true } },
      runner: { select: { id: true, profile: { select: { displayName: true, firstName: true, lastName: true } } } },
    },
  });
}

export async function updateDeliveryTask(
  actorId: string,
  taskId: string,
  status: DeliveryStatus,
  runnerId?: string,
  proofUrl?: string,
  handoffCode?: string
) {
  const task = await prisma.deliveryTask.findUnique({ where: { id: taskId }, include: { order: true } });
  if (!task) throw Errors.notFound("Delivery task");

  const allowed: Record<DeliveryStatus, DeliveryStatus[]> = {
    UNASSIGNED: ["ASSIGNED", "CANCELLED"], ASSIGNED: ["PICKED_UP", "CANCELLED"],
    PICKED_UP: ["DELIVERED", "FAILED"], DELIVERED: [], FAILED: [], CANCELLED: [],
  };
  if (!allowed[task.status].includes(status)) throw Errors.badRequest(`Cannot transition delivery from ${task.status} to ${status}`);
  if (status === "ASSIGNED" && !runnerId) throw Errors.badRequest("Assign a runner before starting delivery.");
  if (status === "ASSIGNED" && runnerId) {
    const runner = await prisma.user.findFirst({ where: { id: runnerId, role: "RUNNER", isActive: true, isSuspended: false, deletedAt: null }, select: { id: true } });
    if (!runner) throw Errors.badRequest("Runner account is not active or has not been approved for delivery work.");
  }
  if (status === "PICKED_UP" && !runnerId && !task.runnerId) throw Errors.badRequest("A runner must be assigned before pickup.");
  if (status === "DELIVERED" && !(proofUrl ?? task.deliveryProofUrl)) {
    throw Errors.badRequest("Upload delivery proof before marking this order delivered.");
  }
  if (status === "DELIVERED" && handoffCode !== task.order.pickupCode) {
    throw Errors.badRequest("The buyer handoff code does not match this order.");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const delivery = await tx.deliveryTask.update({
      where: { id: taskId },
      data: {
        status, ...(status === "ASSIGNED" && { runnerId, assignedAt: new Date() }),
        ...(status === "PICKED_UP" && { pickedUpAt: new Date() }),
        ...(status === "PICKED_UP" && proofUrl && { pickupProofUrl: proofUrl }),
        ...(status === "DELIVERED" && { deliveredAt: new Date(), deliveryProofUrl: proofUrl ?? task.deliveryProofUrl }),
      },
    });
    if (status === "DELIVERED") {
      await tx.order.update({ where: { id: task.orderId }, data: { status: "DELIVERED" } });
    }
    return delivery;
  });
  await createNotification({
    userId: task.order.buyerId, type: "ORDER", title: "Delivery update",
    body: `Order ${task.order.orderNumber} is ${status.toLowerCase().replace("_", " ")}.`,
    data: { orderId: task.orderId, deliveryTaskId: taskId, actorId },
  });
  if (status === "DELIVERED") await createSettlementForDeliveredOrder(task.orderId);
  return updated;
}
