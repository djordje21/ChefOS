# ChefOS — Proposed Data Model (Phase 1 + hooks for later phases)

PostgreSQL (Supabase). Every business table carries `organization_id` and is protected by Row-Level Security. All money and quantities are `numeric` (no floats). Computed values (line cost, portion cost, FC %) are **not stored as editable fields**. They are computed by one costing engine. The only stored computed values are immutable **costing snapshots** that record past decisions.

## 1. Tenancy & access

| Table | Key columns | Notes |
|---|---|---|
| `organizations` | id, name, base_currency (RSD), locale | One per business (e.g. a hotel group) |
| `outlets` | id, organization_id, name, type | e.g. "Main Restaurant", "Lounge Bar" |
| `profiles` | id (= auth.users.id), full_name | Supabase Auth |
| `memberships` | organization_id, user_id, role | role ∈ owner, executive_chef, editor, viewer |
| `role_permissions` | role, permission | Fine-grained: `recipe.view`, `recipe.edit`, `recipe.approve`, `price.edit`, `user.manage`, `settings.edit`, `import.run` … |
| `audit_log` | id, organization_id, user_id, entity, entity_id, action, before jsonb, after jsonb, at | Written by triggers; append-only |

## 2. Settings

| Table | Key columns |
|---|---|
| `org_settings` | organization_id, menu_vat_rate, price_rounding_step, price_rounding_mode (`up`/`nearest`/`down`), default_allowance_rate, allowance_scope |
| `menu_categories` | id, organization_id, name, target_fc_rate, sort_order |
| `vat_rates` | id, organization_id, name, rate, valid_from | Changes to VAT keep a history |

## 3. Units

| Table | Key columns | Notes |
|---|---|---|
| `units` | code (g, kg, ml, l, pcs, …), dimension (mass/volume/count), factor_to_base | Base units are g, ml, pcs. kg→g = 1000, l→ml = 1000 |
| `ingredient_unit_conversions` | ingredient_id, from_unit, to_unit, factor, note | **Explicit only**, e.g. "1 pc egg = 60 g", "jus density 1.0 g/ml". Never implied |

## 4. Ingredients, suppliers, prices

| Table | Key columns | Notes |
|---|---|---|
| `ingredient_categories` | id, organization_id, name | |
| `ingredients` | id, organization_id, name, normalized_name (unique per org), category_id, recipe_unit (base unit), default_yield_rate (0 < y ≤ 1), is_prep (house-made), prep_recipe_id null, status (active/archived), notes | Duplicates are blocked by `normalized_name` (lower-cased, trimmed, whitespace collapsed) |
| `suppliers` | id, organization_id, name, contact fields, lead_time_days, notes | |
| `supplier_products` | id, supplier_id, ingredient_id, supplier_sku, pack_qty, pack_unit, min_order_qty, notes | e.g. 5 kg carton, 24 × pcs case |
| `ingredient_prices` | id, ingredient_id, supplier_product_id null, price, currency, pack_qty, pack_unit, vat_included bool, vat_rate, effective_from, source (manual/import/supplier_offer), created_by | **Append-only.** The "current price" is the latest effective row. Nothing is overwritten |
| `exchange_rates` | currency, rate_to_base, effective_from | Only used when a price is in EUR |

Cost per usable base unit = `price_excl_vat ÷ (pack_qty × unit factor) ÷ yield`.

## 5. Recipes

| Table | Key columns | Notes |
|---|---|---|
| `recipes` | id, organization_id, name, kind (`dish_component` / `prep` / `sub_recipe`), current_version_id, status | |
| `recipe_versions` | id, recipe_id, version_no, yield_qty, yield_unit, portions, allowance_rate null (inherit), method, cooking_method, prep_minutes, cook_minutes, storage, plating, equipment, internal_notes, approval_status (draft/submitted/approved/rejected), approved_by, approved_at | Approved versions are **immutable**. Editing one creates a new draft version |
| `recipe_lines` | id, recipe_version_id, line_no, ingredient_id **xor** sub_recipe_id, quantity, unit, quantity_basis (`net` / `as_purchased`), yield_override null, note | A CHECK constraint enforces "exactly one of ingredient / sub-recipe". Cycle detection runs on save |
| `recipe_allergens` | recipe_version_id, allergen_code, status (contains / may_contain / free / not_declared), verified_by | The 14 EU allergens |
| `recipe_dietary_tags` | recipe_version_id, tag (V, VG, GF …) | |

Costing rules: yield is applied once, only when `quantity_basis = net`. A sub-recipe contributes `qty × (sub-batch cost ÷ sub-batch yield)`, so its own lines are never added to the parent. The allowance is applied only at the outermost costed level.

## 6. Menus & dishes

| Table | Key columns | Notes |
|---|---|---|
| `menus` | id, organization_id, outlet_id, name, status, valid_from/to | |
| `dishes` | id, organization_id, outlet_id, menu_id, category_id, name, sort_no, target_fc_override null, gross_price, vat_rate_id, pricing_basis (`per_portion` / `per_100g`), menu_status, diet_label | `gross_price` is the only price you type in |
| `dish_components` | dish_id, recipe_id, quantity (portions), sort | One dish, many recipes (main + side + sauce) |
| `costing_snapshots` | id, dish_id or recipe_version_id, taken_at, reason, payload jsonb (full breakdown), totals | Immutable. Taken on approval, on a price change, and on demand |

## 7. Sales & menu engineering

| Table | Key columns |
|---|---|
| `sales_imports` | id, organization_id, outlet_id, period_from/to, file_name, status |
| `sales_lines` | id, sales_import_id, dish_id null, pos_item_name, qty, net_revenue |
| `pos_item_mappings` | organization_id, pos_item_name, dish_id |

Classification thresholds (popularity = 70% × 1/n mix rule; contribution = weighted average) are stored in `org_settings` and documented. With no sales data, the module shows "unavailable".

## 8. Import

| Table | Key columns |
|---|---|
| `import_batches` | id, organization_id, source_file, file_hash, status (preview/committed/rolled_back), created_by |
| `import_rows` | batch_id, sheet, row_no, raw jsonb, outcome (created/updated/unchanged/incomplete/rejected), target_entity, target_id, messages |
| `external_keys` | organization_id, source, source_key, entity, entity_id | Makes re-import idempotent (source key = sheet + normalized name) |

## 9. Later phases (tables reserved, not built in Phase 1)

* **Pre-opening:** `projects`, `workstreams`, `task_templates`, `tasks`, `task_dependencies`, `task_comments`, `task_attachments`, `task_evidence` (task history comes through `audit_log`).
* **Portfolio / website:** `articles`, `portfolio_items`, `media_assets`, with an explicit `published` flag and a separate public read-only view. Internal tables are never exposed.
* **AI assistant:** `ai_conversations`, `ai_proposed_changes` (status: pending/accepted/rejected). A change reaches live data only through an explicit confirm action.
* **Future:** inventory, waste, production planning, and labour cost all hang off `ingredients`, `recipes`, and `outlets`.
