import { createTRPCRouter } from "@/server/trpc/init";
import { authRouter } from "@/server/trpc/routers/auth";
import { productRouter } from "@/server/trpc/routers/product";
import { cartRouter } from "@/server/trpc/routers/cart";
import { orderRouter } from "@/server/trpc/routers/order";
import { adminRouter } from "@/server/trpc/routers/admin";
import { aiRouter } from "@/server/trpc/routers/ai";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  product: productRouter,
  cart: cartRouter,
  order: orderRouter,
  admin: adminRouter,
  ai: aiRouter,
});

export type AppRouter = typeof appRouter;
