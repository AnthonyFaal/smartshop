import { createTRPCRouter, sellerProcedure, withErrorHandling } from "@/server/trpc/init";
import { prisma } from "@/lib/db/prisma";

export const messageRouter = createTRPCRouter({
  sellerConversations: sellerProcedure
    .use(withErrorHandling)
    .query(async ({ ctx }) => {
      const conversations = await prisma.conversation.findMany({
        where: {
          participants: {
            some: { userId: ctx.user.id },
          },
        },
        orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          productId: true,
          lastMessageAt: true,
          createdAt: true,
          participants: {
            select: {
              userId: true,
              lastReadAt: true,
              user: {
                select: {
                  id: true,
                  email: true,
                  profile: {
                    select: {
                      displayName: true,
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
            },
          },
          messages: {
            where: { deletedAt: null },
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
              id: true,
              senderId: true,
              content: true,
              type: true,
              isRead: true,
              createdAt: true,
              sender: {
                select: {
                  id: true,
                  email: true,
                  profile: {
                    select: {
                      displayName: true,
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      return conversations.map((conversation) => {
        const sellerParticipant = conversation.participants.find(
          (participant) => participant.userId === ctx.user.id
        );
        const buyerParticipant =
          conversation.participants.find(
            (participant) => participant.userId !== ctx.user.id
          ) ?? conversation.participants[0];
        const lastReadAt = sellerParticipant?.lastReadAt;
        const unreadCount = conversation.messages.filter(
          (message) =>
            message.senderId !== ctx.user.id &&
            (!lastReadAt || message.createdAt > lastReadAt)
        ).length;

        return {
          ...conversation,
          buyer: buyerParticipant?.user ?? null,
          messages: [...conversation.messages].reverse(),
          unreadCount,
        };
      });
    }),
});

export default messageRouter;
