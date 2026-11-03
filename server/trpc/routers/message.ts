import { z } from "zod";
import { createTRPCRouter, protectedProcedure, withErrorHandling } from "@/server/trpc/init";
import { prisma } from "@/lib/db/prisma";
import { Errors } from "@/server/errors";
import { createNotification } from "@/lib/notifications/service";

const personSelect = { id: true, email: true, profile: { select: { displayName: true, firstName: true, lastName: true, avatarUrl: true } } } as const;

async function assertParticipant(conversationId: string, userId: string) {
  const participant = await prisma.conversationParticipant.findUnique({ where: { conversationId_userId: { conversationId, userId } } });
  if (!participant) throw Errors.forbidden();
}

export const messageRouter = createTRPCRouter({
  conversations: protectedProcedure.use(withErrorHandling).query(async ({ ctx }) => {
    const conversations = await prisma.conversation.findMany({
      where: { participants: { some: { userId: ctx.user.id } } }, orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
      select: { id: true, productId: true, lastMessageAt: true, createdAt: true,
        product: { select: { id: true, title: true, images: true, store: { select: { name: true } } } },
        participants: { select: { userId: true, lastReadAt: true, user: { select: personSelect } } },
        messages: { where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 1, select: { id: true, senderId: true, content: true, createdAt: true } }, },
    });
    return conversations.map((conversation) => {
      const self = conversation.participants.find((item) => item.userId === ctx.user.id);
      const other = conversation.participants.find((item) => item.userId !== ctx.user.id);
      const lastMessage = conversation.messages[0] ?? null;
      return { ...conversation, other: other?.user ?? null, lastMessage,
        unreadCount: lastMessage && lastMessage.senderId !== ctx.user.id && (!self?.lastReadAt || lastMessage.createdAt > self.lastReadAt) ? 1 : 0 };
    });
  }),
  messages: protectedProcedure.use(withErrorHandling).input(z.object({ conversationId: z.string().uuid() })).query(async ({ input, ctx }) => {
    await assertParticipant(input.conversationId, ctx.user.id);
    return prisma.message.findMany({ where: { conversationId: input.conversationId, deletedAt: null }, orderBy: { createdAt: "asc" }, take: 100,
      select: { id: true, senderId: true, content: true, type: true, createdAt: true, isRead: true } });
  }),
  startProductConversation: protectedProcedure.use(withErrorHandling).input(z.object({ productId: z.string().uuid() })).mutation(async ({ input, ctx }) => {
    const product = await prisma.product.findFirst({ where: { id: input.productId, deletedAt: null, status: "ACTIVE" }, select: { id: true, sellerId: true } });
    if (!product) throw Errors.notFound("Product");
    if (product.sellerId === ctx.user.id) throw Errors.badRequest("You cannot message yourself about this product.");
    const existing = await prisma.conversation.findFirst({ where: { productId: product.id, participants: { every: { userId: { in: [ctx.user.id, product.sellerId] } } } }, select: { id: true } });
    if (existing) return existing;
    return prisma.conversation.create({ data: { productId: product.id, participants: { create: [{ userId: ctx.user.id }, { userId: product.sellerId }] } }, select: { id: true } });
  }),
  send: protectedProcedure.use(withErrorHandling).input(z.object({ conversationId: z.string().uuid(), content: z.string().trim().min(1).max(2_000) })).mutation(async ({ input, ctx }) => {
    await assertParticipant(input.conversationId, ctx.user.id);
    const now = new Date();
    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.message.create({ data: { conversationId: input.conversationId, senderId: ctx.user.id, content: input.content } });
      await tx.conversation.update({ where: { id: input.conversationId }, data: { lastMessageAt: now } });
      return created;
    });
    const recipient = await prisma.conversationParticipant.findFirst({ where: { conversationId: input.conversationId, userId: { not: ctx.user.id } }, select: { userId: true, lastEmailAt: true } });
    if (recipient) {
      const recentlyEmailed = recipient.lastEmailAt && now.getTime() - recipient.lastEmailAt.getTime() < 15 * 60_000;
      await createNotification({ userId: recipient.userId, type: "MESSAGE", title: "New message on SmartShop", body: "You have a new message. Open SmartShop to reply.", data: { conversationId: input.conversationId }, channels: recentlyEmailed ? ["IN_APP"] : ["IN_APP", "EMAIL"] });
      if (!recentlyEmailed) await prisma.conversationParticipant.update({ where: { conversationId_userId: { conversationId: input.conversationId, userId: recipient.userId } }, data: { lastEmailAt: now } });
    }
    return message;
  }),
  markRead: protectedProcedure.use(withErrorHandling).input(z.object({ conversationId: z.string().uuid() })).mutation(async ({ input, ctx }) => {
    await assertParticipant(input.conversationId, ctx.user.id);
    await prisma.$transaction([prisma.conversationParticipant.update({ where: { conversationId_userId: { conversationId: input.conversationId, userId: ctx.user.id } }, data: { lastReadAt: new Date() } }), prisma.message.updateMany({ where: { conversationId: input.conversationId, senderId: { not: ctx.user.id }, isRead: false }, data: { isRead: true } })]);
    return { success: true };
  }),
});

export default messageRouter;
