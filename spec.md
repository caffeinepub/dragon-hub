# Dragon Hub

## Current State
- Shops exist with NSFW flag, categories as free-text array, logo/banner, rules, Q&A, digital product flag
- Each owner can have one shop (enforced by getShopByOwner)
- ShopProduct has `isDigital` but no digital file blob or download-request system
- Navbar has "Sellers" and "Shops" links; HomePage has a "Visit Market" button linking to /marketplace
- Admin page manages users; no global shop category management
- Homepage text has no background behind it

## Requested Changes (Diff)

### Add
- Global preset shop categories (ShopCategory type with id/name) — admins can create/edit/delete
- Digital file blob field on ShopProduct (for digital products)
- Download request system: buyers request download → seller manually approves → buyer gets the file
- Allow up to 2 shops per user: 1 NSFW, 1 non-NSFW (enforce at createShop)
- `getShopsByOwner` returning array for a given owner
- Backend functions: `createShopCategory`, `updateShopCategory`, `deleteShopCategory`, `getAllShopCategories`, `requestDownload`, `approveDownload`, `rejectDownload`, `getDownloadRequests`, `getMyDownloadRequests`

### Modify
- "Marketplace" references in Navbar/HomePage → "Shop Feed" linking to /shops
- Shop category field uses preset category names instead of free text
- Admin panel adds a Shop Categories management tab
- SellersPage product form adds digital file upload field (only shown when isDigital=true)
- ShopDetailPage: Buy Now for digital products shows "Request Download" instead; approved buyers see a download button
- HomePage: all text blocks and sections get a semi-transparent backdrop/background

### Remove
- MarketplacePage direct button on homepage (replace with Shop Feed → /shops)

## Implementation Plan
1. Add `ShopCategory` stable map + CRUD functions to backend
2. Add `digitalFileBlob` field to `ShopProduct`; add download request types and functions
3. Modify `createShop` to enforce 1 NSFW + 1 non-NSFW per user; add `getShopsByOwner`
4. Frontend: Update Navbar (Shops → "Shop Feed"), HomePage button → /shops
5. Frontend: Admin panel — add Shop Categories tab
6. Frontend: SellersPage — digital file upload in product form; show download requests panel
7. Frontend: ShopDetailPage — "Request Download" for digital products; approved download button
8. Frontend: HomePage — add background behind all text blocks
