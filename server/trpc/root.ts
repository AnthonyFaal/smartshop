import { createTRPCRouter } from "@/server/trpc/init";
import { authRouter } from "@/server/trpc/routers/auth";
import { productRouter } from "@/server/trpc/routers/product";
import { cartRouter } from "@/server/trpc/routers/cart";
import { orderRouter } from "@/server/trpc/routers/order";
import { adminRouter } from "@/server/trpc/routers/admin";
import { aiRouter } from "@/server/trpc/routers/ai";
import { storeRouter } from "@/server/trpc/routers/store";
import { messageRouter } from "@/server/trpc/routers/message";
import { locationRouter } from "@/server/trpc/routers/location";
import { wishlistRouter } from "@/server/trpc/routers/wishlist";
import { reviewRouter } from "@/server/trpc/routers/review";
import { promotionRouter } from "@/server/trpc/routers/promotion";
import { deliveryRouter } from "@/server/trpc/routers/delivery";
import { settlementRouter } from "@/server/trpc/routers/settlement";
import { disputeRouter } from "@/server/trpc/routers/dispute";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  product: productRouter,
  cart: cartRouter,
  order: orderRouter,
  admin: adminRouter,
  store: storeRouter,
  ai: aiRouter,
  message: messageRouter,
  location: locationRouter,
  wishlist: wishlistRouter,
  review: reviewRouter,
  promotion: promotionRouter,
  delivery: deliveryRouter,
  settlement: settlementRouter,
  dispute: disputeRouter,
});


export type AppRouter = typeof appRouter;
