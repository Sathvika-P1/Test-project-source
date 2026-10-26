# UI Guidelines — Shopping Website

## Navigation and information architecture
- **Top bar only, no sidebar.** A shopper browses a catalogue; a sidebar would steal width from product grids.
- **Order, left to right:** brand ("Shopping Website", links home), then `Home` (`home`), `Shop` (`shop`), then the personal destinations `Account` (`account`), `Saved` (`wishlist`), `Bag` (`cart`). The key in brackets is each link's `data-nav-key`.
- **The existing app layout has no navigation yet** (only a bare page body), so this set is the product's initial navigation; add a section here and in `app-shell.html` together, never in one alone.
- **Below the tablet breakpoint the links collapse behind one menu button**, because five links do not fit a phone-width top bar.
- **Filters and sorting live inside the Shop screen** (as `.chip` filters and a `.dropdown` for sort), not in the global navigation, so the top bar stays stable.

## Layout and density
- **Spacious consumer layout:** one centred `.container`, generous `space-4`/`space-5` between sections, because shoppers scan images and prices rather than data tables.
- **Mobile first.** Design at phone width, then widen; the breakpoints that matter are phone (below 48rem, navigation collapsed) and desktop (48rem and above, navigation inline).
- **Product listings use `.grid`** so columns reflow without per-breakpoint rules.

## Component usage
- **`.card`** for a product, an order or a summary block: each is a self-contained unit that is browsed as a set.
- **Table** only for order history and bag line items on wide screens; on phones show those same rows as `.card`s, since tables overflow at phone width.
- **Plain list (`.stack` with `.divider`)** for short homogeneous rows such as addresses or filters.
- **One `.btn-primary` per screen region** (Add to bag, Checkout); everything else is `.btn-secondary` or `.btn-ghost`, so the main action is unmistakable.
- **`.btn-danger` only for destructive actions** (remove address, cancel order) and always behind a `.modal` confirmation.
- **`.toast`** confirms low-stakes success (added to bag, saved); **`.alert`** is for problems that need action (payment failed, out of stock), because a toast disappears.
- **`.drawer`** holds the bag preview and mobile filters, keeping the shopper on the current page; **`.modal`** is for decisions that must block.
- **Forms use `.field`** with an error in `.field-error` and `.is-invalid` on the control, so checkout errors are found next to the input.
- **`.skeleton`** for product grids while loading, `.spinner` only for button-sized waits, and `.empty-state` (with a Shop action) for an empty bag or wishlist.
- **`.badge-success`/`-warning`/`-danger`** for stock and order status (In stock, Low stock, Cancelled), so status reads the same everywhere.

## Theme
- **Light only.** The existing app is a white page with dark text, and a single theme keeps product photography true to colour; dark theme is out of scope until requested.
- **Warm, earthy tone:** warm stone neutrals with a terracotta `color-primary`, so the store feels inviting and handmade rather than clinical; keep `color-primary` for the main action and links only, so it stays the one warm accent on the page.

## Voice and tone
- **Friendly, brief and concrete:** "Added to bag", not "Item successfully added to your shopping cart", because shoppers skim.
- **Sentence case everywhere;** button labels start with a verb ("Add to bag", "Place order").
- **Errors say what to do next** ("Enter a postcode like 560001"), never blame the shopper.
- **Say "Bag" and "Saved" consistently** — never mix with "Cart" or "Wishlist" in visible copy.
