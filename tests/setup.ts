import "@testing-library/jest-dom/vitest";

process.env.DATABASE_URL ??=
  "postgresql://smartshop:smartshop@localhost:5432/smartshop";
process.env.JWT_SECRET ??= "test-jwt-secret-minimum-32-characters-long";
process.env.CSRF_SECRET ??= "test-csrf-secret-minimum-32-characters";
