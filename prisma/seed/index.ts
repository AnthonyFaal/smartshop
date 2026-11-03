import { seedAdmin, seedSubscriptionOfferings, seedCategories, seedLocations, seedPilotDeliveryZones } from "./core.seed";
import { seedDemoSeller, seedDemoProducts } from "./demo.seed";

async function main() {
  const isProd = process.env.NODE_ENV === "production";
  const isDemoSeed = process.env.SEED_DEMO === "true";

  // ALWAYS SAFE (production allowed)
  await seedAdmin();
  await seedSubscriptionOfferings();
  await seedCategories();
  await seedLocations();
  await seedPilotDeliveryZones();

  // ONLY IN DEV OR EXPLICIT DEMO MODE
  if (!isProd || isDemoSeed) {
    const { seller, store } = await seedDemoSeller();
    await seedDemoProducts(store.id, seller.id);
  }

  console.log("Seed completed successfully");
}

main()

  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    const { prisma } = await import("./types");
    await prisma.$disconnect();
  });
