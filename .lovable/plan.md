

## Add Show/Hide Toggle for Brands

### What This Does
Adds a visibility toggle to each brand in the admin Brands Management page. Hidden brands will not appear on the frontend (chat, state permissions, product selectors), but remain manageable in admin.

### Database Change
Add an `is_visible` boolean column to the `brands` table:

```text
ALTER TABLE public.brands
  ADD COLUMN is_visible boolean NOT NULL DEFAULT true;
```

No new RLS policies needed -- existing policies already cover admin write and authenticated read.

### Frontend Changes

**1. `src/components/product-management/BrandsManagement.tsx`**
- Update the `Brand` interface to include `is_visible: boolean`
- Add a `Switch` toggle in each brand card to flip visibility
- Call `supabase.from('brands').update({ is_visible }).eq('id', brand.id)` on toggle
- Visually dim hidden brands (e.g., reduced opacity)

**2. `src/hooks/useProductsData.ts`**
- Filter the brands query to only return visible brands: `.eq('is_visible', true)`
- This automatically hides brands (and their products) from all non-admin frontend features (state permissions, product selectors, chat context)

**3. `src/components/product-management/ProductsManagement.tsx`**
- No changes needed -- it already sources brands from `useProductsData`, which will filter automatically

### How It Works
- Admin toggles a brand's visibility via a switch in the brand card
- Hidden brands still appear in the admin Brands page (with dimmed styling) for management
- All other pages only see visible brands since `useProductsData` filters them out
