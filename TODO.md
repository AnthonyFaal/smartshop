# Inventory Mode Enforcement TODO

## Step 1 — Implement strict inventory mode rules (server)
- [ ] Update `server/services/product.service.ts`
  - [ ] Enforce mutually exclusive modes on create:
    - variant-based when `sizesQuantities` provided with at least 1 valid entry (size non-empty)
      - [ ] Require >= 1 variant entry
      - [ ] Set `product.stock` to `0`
      - [ ] Persist inventory only in `ProductVariant.stock` (create variant rows; stock must be non-negative)
    - simple mode when `sizesQuantities` is absent/empty
      - [ ] Reject any submitted variant data
      - [ ] Create no `ProductVariant` rows
      - [ ] Ensure `product.stock` is non-negative
  - [ ] Enforce lifecycle immutability on update:
    - [ ] If product has variants: reject updates that attempt to change `stock` or switch to simple mode (and reject any mode switch).
    - [ ] If product has no variants: ensure no variant-mode data is accepted (server should not create/associate variants).
  - [ ] Fix inventory normalization on read (`getProduct`):
    - [ ] Fetch `ProductVariant.stock` (not `quantity`)
    - [ ] If variants exist: compute `effectiveStock = sum(variant.stock)`
    - [ ] If no variants: use `product.stock`
    - [ ] Return normalized shape for frontend/cart/order.

## Step 2 — Fix cart selection rules + single source of truth
- [ ] Update `server/services/cart.service.ts`
  - [ ] `getCart`: fetch variants with `{ size, stock }`
  - [ ] `addToCart`:
    - [ ] Variant-based: require `selectedSize` exactly matching an existing variant; validate stock against that variant’s `stock`
    - [ ] Simple: reject any variant selection data; validate stock against `product.stock`
    - [ ] Merge quantities only after validating against the correct source
  - [ ] `updateCartItem`:
    - [ ] Enforce the same strict selection rules
  - [ ] Ensure only the single inventory source is used during cart operations.

## Step 3 — Fix checkout/order stock deduction
- [ ] Update `server/services/order.service.ts`
  - [ ] `createOrderFromCart`:
    - [ ] For variant-based products: deduct only the selected `ProductVariant.stock`
    - [ ] For simple products: deduct only `Product.stock`
    - [ ] Never update both in the same transaction for a single cart item.

## Step 4 — Update frontend inventory display & selection rules
- [ ] Update `app/products/[id]/page.tsx`
  - [ ] Use `effectiveStock` from API
  - [ ] For variant-based products: require selection of exactly one variant before enabling add-to-cart
  - [ ] Ensure size availability uses variant `stock`

## Step 5 — Update seller product creation UX (client + server expectations)
- [ ] Update `app/seller/products/new/page.tsx`
  - [ ] If “no sizes/variants” checked:
    - [ ] Do not send `sizesQuantities` at all
  - [ ] If variant mode:
    - [ ] Do not send non-empty `stock` inventory meaningfully (server will set to 0)
    - [ ] Validate at least one variant entry before submit
  - [ ] Keep UX aligned with server validation.

## Step 6 — Verification
- [ ] Run typecheck/lint/tests if available
- [ ] Manual test matrix:
  - [ ] Create simple product → no variants created; stock editable and non-negative
  - [ ] Create variant-based product → product stock saved as 0; variants created; negative stock rejected
  - [ ] Add to cart:
    - [ ] simple product with no size selection passes
    - [ ] variant-based product requires size selection
  - [ ] Checkout:
    - [ ] simple product deducts product stock only
    - [ ] variant-based product deducts selected variant stock only
