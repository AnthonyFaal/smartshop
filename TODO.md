# TODO — Favorites (Wishlist) & Reviews (Star Ratings)

## Phase 1: UI building blocks
- [ ] Add reusable star rating components:
  - [ ] `components/ui/star-rating.tsx` with:
    - [ ] `StarRating` (read-only display for average/aggregate ratings)
    - [ ] `StarPicker` (interactive 1–5 selection for users to create/update a review)

## Phase 2: Wishlist (Favorites)
- [ ] Fix `/wishlist` page removal logic:
  - [ ] Replace incorrect “Trash” handler to properly remove product from default wishlist using `trpc.wishlist.remove`
  - [ ] Ensure queries/mutations invalidate so UI updates immediately
- [ ] Wire wishlist heart on `/products/[id]` page:
  - [ ] Determine if product is in the user’s default wishlist
  - [ ] Heart button calls `trpc.wishlist.toggleDefault` (or equivalent) and reflects current state (filled/outline)

## Phase 3: Reviews (with full CRUD)
- [ ] Implement reviews UI on `/products/[id]`:
  - [ ] Render review list using `trpc.review.listProduct`
  - [ ] Add/create/update my review using `trpc.review.upsertMyReview` with interactive `StarPicker`
  - [ ] Show “Delete my review” using `trpc.review.deleteMyReview`
  - [ ] Use `StarRating` to display each review’s star value
- [ ] Ensure reviews UI empty states + loading states are correct

## Phase 4: Verification
- [ ] Add/remove from wishlist and confirm `/wishlist` updates
- [ ] Add a review with star rating, then edit it and confirm list updates
- [ ] Delete a review and confirm list updates + stars/averages recalculate
