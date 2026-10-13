# ChefOS — Data Model (v2: universal workspaces)

PostgreSQL (Supabase). See `04-architecture-assessment.md` for the reasoning.

General rules:
* Every business table has `workspace_id uuid NOT NULL`, RLS enabled, and **composite foreign keys** `(workspace_id, <fk>) → (workspace_id, id)`. Cross-workspace references are therefore impossible at the database level.
* Money and quantities are stored as `numeric`; the engine works in decimal. Nothing is stored as a float.
* Calculated values are never editable fields. The only persisted results are immutable costing snapshots.
* Provenance columns on business tables: `origin` (manual / import / template / demo), `import_batch_id`, `confirmed_at`, `confirmed_by`.
* No business data is seeded globally. A new workspace is empty unless the user copies a template.

## 1. System reference (global, read-only, no business data)

| Table | Content |
|---|---|
| `sys_units` | g, kg, mg, ml, l, cl, pcs: dimension (mass / volume / count) plus factor to base. Physical constants only |
| `sys_currencies` | ISO 4217 codes and minor-unit digits |
| `sys_allergen_frameworks`, `sys_allergens` | EU 1169/2011 (14), UK (14), US FALCPA+sesame (9) |
| `sys_permissions` | Permission catalog: `recipe.view`, `recipe.edit`, `recipe.approve`, `price.edit`, `price.approve`, `supplier.approve`, `member.manage`, `settings.edit`, `import.run`, `export.run`, … |
| `sys_templates` | Starter templates (regional settings, demo kitchen) as versioned JSON. **Copied** into a workspace, never referenced |

## 2. Workspace, access, audit

| Table | Key columns |
|---|---|
| `workspaces` | id, name, kind (`operational` / `demo`), base_currency, locale, timezone, created_by |
| `outlets` | id, workspace_id, name, type, active |
| `profiles` | id (= auth user), full_name, ui_language |
| `roles` | id, workspace_id, name, is_system (owner / executive_chef / editor / viewer) |
| `role_permissions` | role_id, permission |
| `memberships` | workspace_id, user_id, role_id, outlet_scope (null = all outlets), status |
| `invitations` | workspace_id, email, role_id, token_hash, expires_at |
| `audit_log` | workspace_id, user_id, entity, entity_id, action, before, after, at (append-only, written by triggers) |

## 3. Workspace configuration (versioned)

| Table | Key columns |
|---|---|
| `costing_policy_versions` | workspace_id, valid_from, default_quantity_basis (`net` / `as_purchased`), allowance_mode (`none` / `dish` / `category`), allowance_rate, rounding_mode (`none` / `up` / `nearest` / `down`), rounding_step, price_endings, menu_price_entry (`tax_inclusive` / `tax_exclusive`), input_tax_recoverable, price_source (`latest_approved` / `preferred_supplier`), fc_status_tolerance |
| `approval_rules` | workspace_id, subject (price_change / supplier / recipe), threshold_pct, required_permission |
| `reporting_preferences` | workspace_id, average_fc_method(s), default_period, menu_engineering thresholds |
| `tax_rates` | workspace_id, name, rate, valid_from, valid_to |
| `exchange_rates` | workspace_id, currency, rate_to_base, valid_from, source note (entered by the user) |
| `workspace_units` | workspace_id, code, name, dimension, factor_to_base (null for count-type packaging units) |
| `ingredient_unit_conversions` | workspace_id, ingredient_id, from_unit, to_unit, factor, note (explicit only) |
| `categories` | workspace_id, scope (ingredient / menu / recipe), name, parent_id, target_fc_rate (menu scope), allowance_rate override, tax_rate_id default |
| `dietary_tags` | workspace_id, code, label |
| `workspace_allergen_framework` | workspace_id, framework_id |

## 4. Ingredients, suppliers, prices

| Table | Key columns | Notes |
|---|---|---|
| `ingredients` | workspace_id, name, normalized_name (unique per workspace), category_id, base_unit, default_yield_rate (0<y≤1), is_prep, prep_recipe_id, status, notes | |
| `suppliers` | workspace_id, name, contacts, status (pending / approved / blocked), lead_time_days, notes | |
| `supplier_products` | workspace_id, supplier_id, ingredient_id, supplier_code, description, pack_qty, pack_unit, min_order_qty | Supplier-specific codes |
| `price_lists` | workspace_id, supplier_id, name, valid_from, source file, import_batch_id | A supplier price-list upload |
| `ingredient_prices` | workspace_id, supplier_product_id, price, currency, tax_included, tax_rate_id, valid_from, status (pending / approved / rejected), approved_by, price_list_id | **Append-only**; costing uses approved prices per policy |

## 5. Recipes

| Table | Key columns | Notes |
|---|---|---|
| `recipes` | workspace_id, name, kind (`dish_component` / `prep` / `sub_recipe`), category_id, current_version_id, status | |
| `recipe_versions` | workspace_id, recipe_id, version_no, yield_qty, yield_unit, portions, allowance_override, method, cooking_method, prep_min, cook_min, storage, plating, equipment, notes, approval_status, approved_by/at | Approved versions are immutable |
| `recipe_lines` | workspace_id, recipe_version_id, line_no, ingredient_id XOR sub_recipe_id, quantity, unit, quantity_basis (null = policy default), yield_override, note | Cycle check on save |
| `recipe_allergens` | workspace_id, recipe_version_id, allergen_id, status (contains / may_contain / free / not_declared), verified_by | |
| `recipe_dietary_tags` | workspace_id, recipe_version_id, tag_id | |

## 6. Menus, dishes, snapshots

| Table | Key columns |
|---|---|
| `menus` | workspace_id, outlet_id, name, status, valid_from/to |
| `dishes` | workspace_id, outlet_id, menu_id, category_id, name, sort_no, target_fc_override, price, tax_rate_id, pricing_basis (`per_portion` / `per_weight` with unit qty), menu_status |
| `dish_components` | workspace_id, dish_id, recipe_id, quantity |
| `costing_snapshots` | workspace_id, subject (dish / recipe_version), policy_version_id, taken_at, reason, payload (full breakdown), totals (immutable) |

## 7. Sales & menu engineering

`sales_imports`, `sales_lines`, `pos_item_mappings`, all workspace-scoped. Classification thresholds come from `reporting_preferences`. Without sales data the analysis is marked unavailable.

## 8. Import framework

| Table | Key columns |
|---|---|
| `import_mappings` | workspace_id, name, target (workbook / ingredients / supplier_price_list / sales), sheet & column mapping JSON. Reusable; "the source workbook layout" is just one saved mapping |
| `import_batches` | workspace_id, mapping_id, file_name, file_hash, status (preview / committed / rolled_back) |
| `import_rows` | workspace_id, batch_id, sheet, row_no, raw, outcome (created / updated / unchanged / incomplete / rejected), target entity/id, messages |
| `external_keys` | workspace_id, source, source_key, entity, entity_id: makes re-import idempotent |

## 9. Later phases (reserved, workspace-scoped)

Pre-opening: `projects`, `workstreams`, `task_templates`, `tasks`, `task_dependencies`, `task_comments`, `task_attachments`, `task_evidence`.
Portfolio: `articles`, `portfolio_items`, `media_assets`, each with an explicit `published` flag, served through a separate public view.
AI: `ai_conversations`, `ai_proposed_changes` (pending / accepted / rejected; explicit confirmation required).
Future: inventory, waste, production, labour, all hanging off workspace ingredients, recipes and outlets.
