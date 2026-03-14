# Dragon Hub

## Current State
Dragon Hub has: videos, marketplace listings, forums (categories/threads/replies), user profiles with profile pic, admin panel with user management. Authorization and blob storage components are active.

## Requested Changes (Diff)

### Add
- **Shops**: Users can create a shop (name, description, banner image). Each shop can have multiple products (title, description, price, image). Shop pages show the owner's products. Users can browse all shops.
- **Groups**: Discord-like groups. Users can create groups (name, description, icon). Each group has text channels. Members can join groups and post messages in channels.
- **Shop route**: `/shops` (browse all), `/shops/:id` (shop detail + products)
- **Groups route**: `/groups` (browse all), `/groups/:id` (group detail with channels + messages)
- **Nav links**: Add Shops and Groups to navbar

### Modify
- Marketplace remains but Shops are a separate concept (a shop is a storefront, marketplace listings are individual items)
- Navbar to include new routes

### Remove
- Nothing removed

## Implementation Plan
1. Backend: Add Shop, ShopProduct, Group, GroupChannel, GroupMessage types and CRUD methods
2. Frontend: ShopsPage, ShopDetailPage, GroupsPage, GroupDetailPage components
3. Wire new routes in App.tsx and add nav links
