# ChefOS — Database Schema & Security Model (authoritative)

Supersedes the table lists in `02-data-model.md` wherever they differ. Approved decisions: `04-architecture-assessment.md` §7 (all five recommendations approved, with clarifications).

Legend: **P1** = built in Phase 1 · **P2+** = specified now, built later (no Phase 1 decision may block it).

---

## 1. Isolation pattern (applies to every business table)

```sql
id            uuid primary key default gen_random_uuid(),
workspace_id  uuid not null references workspaces(id),
unique (workspace_id, id)                         -- target of composite FKs
-- every reference to another business row:
foreign key (workspace_id, ingredient_id) references ingredients (workspace_id, id)
```

* Because of the composite FK, the **database** rejects a row that points at another workspace's data. This holds even for the service role and even if application code has a bug.
* RLS is enabled on every table in `public`. Policies call helper functions in a `private` schema, which is not exposed through the Data API (`security definer`, `search_path=''`).
* No table grants anything to `anon`. Only `authenticated` gets grants, and RLS narrows them.
* A CI test fails if any table in `public` has RLS disabled, has no `workspace_id`, or lacks the composite-FK pattern. Exceptions must be listed explicitly (e.g. `profiles`, system reference tables).

**Verified (13 Oct 2026)** on PostgreSQL 16 with a Supabase-compatible `auth.uid()` stub. A spike with two workspaces, two outlets and three users confirmed:
* a cross-workspace FK insert is rejected even as superuser;
* a foreign workspace is invisible;
* inserting into a foreign workspace is rejected by RLS;
* updating a foreign workspace affects 0 rows;
* an outlet-restricted user sees only their outlet's recipes plus shared ones, cannot create recipes in another outlet, but can read shared ingredients;
* with no session, nothing is visible.

## 2. Identity, registration, workspace creation — P1

| Table | Columns / rules |
|---|---|
| `profiles` | `id` = `auth.users.id`, full_name, ui_language, created_at. Created by a trigger on sign-up. **Sign-up creates nothing else**: no workspace, no membership, no role |
| `workspaces` | id, name, kind (`operational` / `demo`), base_currency (ISO, required), locale, timezone, plan_id, status (`active` / `suspended`), created_by, created_at |
| `memberships` | workspace_id, user_id, role_id, all_outlets bool, status (`active` / `suspended`), PK (workspace_id, user_id) |
| `invitations` | workspace_id, email, role_id, outlet grants (jsonb), token_hash, invited_by, expires_at, accepted_at. Default role = **viewer** |

Rules:
* **Open registration** goes through Supabase Auth (email + password) with **email confirmation required**. No session is issued until the address is confirmed.
* **Controlled workspace creation:** only through the RPC `create_workspace(name, base_currency, locale, timezone, template?)`. It requires a confirmed email and checks the plan limit `max_owned_workspaces`. It makes the caller **owner of that new workspace only**.
* **Least privilege:** a user gets rights only by creating their own workspace or by accepting an invitation, and the invitation states the role. There is **no platform-admin role in the application**. Platform administration happens only with the secret key or SQL, outside the app.
* Invitation acceptance (RPC `accept_invitation(token)`) checks that the email matches and the token has not expired. Single use.
* Members can never raise their own role. Only holders of `member.manage` can change roles, and nobody can remove or demote the last owner.

## 3. Permissions: workspace level vs outlet level — P1

| Table | Columns |
|---|---|
| `sys_permissions` | code, level (`workspace` / `outlet`), description |
| `roles` | id, workspace_id, name, is_system, level (`workspace` / `outlet`) |
| `role_permissions` | role_id, permission_code (the permission's level must match the role's level) |
| `outlets` | id, workspace_id, name, type (restaurant / bar / breakfast / banqueting / room_service / other), active |
| `outlet_memberships` | workspace_id, outlet_id, user_id, outlet_role_id. Requires an existing workspace membership; cascades when that membership is removed |

**Workspace-level permissions:** `workspace.settings`, `member.manage`, `outlet.manage`, `ingredient.view`, `ingredient.edit`, `supplier.view`, `supplier.edit`, `supplier.approve`, `price.view`, `price.edit`, `price.approve`, `recipe.library.edit`, `recipe.library.approve`, `import.run`, `export.run`, `report.workspace`.

**Outlet-level permissions:** `outlet.view`, `recipe.edit`, `recipe.approve`, `menu.edit`, `menu.price.edit`, `menu.approve`, `report.outlet`.

Resolution:
`can(outlet, perm)` = the workspace role grants `perm` **and** `memberships.all_outlets`, **or** an outlet role on that outlet grants `perm`.
Workspace-level permissions come **only** from the workspace role; an outlet role can never grant them.

System roles seeded into each new workspace (editable copies):

| Role | Level | Gets |
|---|---|---|
| Owner | ws | everything |
| Executive Chef | ws | everything except `member.manage` (configurable) and `workspace.settings` |
| Chef / Editor | ws | view + edit; no approve, no members, no settings |
| Viewer | ws | view only (`price.view` is off by default: purchase prices are sensitive) |
| Outlet Chef | outlet | recipe/menu edit + approve for the assigned outlets |
| Outlet Viewer | outlet | view + outlet reports |

### What is shared and what is outlet-specific

| Shared across outlets (workspace) | Outlet-specific |
|---|---|
| Ingredients, units, conversions, suppliers, supplier products, prices, preferred suppliers (default) | Menus, dishes, **selling prices**, outlet tax rate overrides, outlet FC targets, outlet reports, outlet sales |
| Recipe library (`recipes.outlet_id IS NULL`) | Outlet recipes (`recipes.outlet_id = X`) |
| Costing policy (default) | Optional policy override per outlet (P2+) |
| | Optional preferred-supplier override per outlet (P2+) |

Editing the shared library requires `recipe.library.edit` (workspace level). An outlet-restricted chef can **use** library recipes but cannot edit them. (The spike let any member edit library recipes; the real policies check the permission.)

## 4. Plans & entitlements (ready for billing, no billing in P1) — P1 (tables only)

| Table | Columns |
|---|---|
| `plans` | id, code (`free`, …), name, limits jsonb (`max_owned_workspaces`, `max_members`, `max_outlets`, `max_ingredients`, `max_recipes`, `max_storage_mb`), features jsonb |
| `workspaces.plan_id` | Defaults to `free` |
| `usage_counters` | View/function counting members, outlets, ingredients and recipes per workspace |

Limits are enforced in RPCs and insert triggers and are read from `plans`. A future billing system only has to change `workspaces.plan_id`, so nothing needs re-architecting.

## 5. Audit — P1

`audit_log(id, workspace_id, actor_user_id, entity, entity_id, action, before jsonb, after jsonb, at, request_id)`. Append-only: no update/delete grants, and rows are written by triggers. Members can read only their own workspace's log, and only with `report.workspace`.

## 6. Workspace configuration (versioned) — P1 schema, P2 UI

| Table | Key columns |
|---|---|
| `costing_policy_versions` | workspace_id, outlet_id null, valid_from, default_quantity_basis (`net` / `as_purchased`), rounding_mode (`none` / `up` / `nearest` / `down`), rounding_step, price_endings, menu_price_entry (`tax_inclusive` / `tax_exclusive`), input_tax_recoverable, price_source (`preferred_supplier` / `lowest_approved` / `latest_approved`), fc_basis (`net_of_tax`), created_by |
| `cost_adders` | workspace_id, policy_version_id, name (e.g. "Seasoning & minor items", "Packaging"), kind (`percent` / `fixed`), value, scope (`all` / `menu_category` / `dish`), scope_id, apply_level (`dish`): the general replacement for the Excel 3% allowance; applied once, never inside sub-recipes |
| `tax_rates` | workspace_id, name, rate, valid_from, valid_to |
| `exchange_rates` | workspace_id, currency, rate_to_base, valid_from, note: entered by users, never fetched silently |
| `workspace_units` | workspace_id, code, name, dimension (`mass` / `volume` / `count`), factor_to_base (null for count units such as case or bunch) |
| `categories` | workspace_id, scope (`ingredient` / `menu` / `recipe`), name, parent_id |
| `fc_targets` | workspace_id, outlet_id null, menu_category_id, target_rate, valid_from |
| `approval_rules` | workspace_id, subject (`price_change` / `new_supplier` / `recipe` / `menu_price`), threshold_pct, required_permission |
| `reporting_preferences` | workspace_id, average_fc_methods, menu_engineering_thresholds |

**Reproducibility:** every versioned row has `valid_from`. A calculation "as of date T" uses the policy version, targets, tax rates, exchange rates, approved prices and approved recipe versions that were in effect at T. Rows are append-only: a change creates a new version. Snapshots additionally store the full breakdown.

## 7. Ingredients & Supplier Intelligence — P2+ (designed now)

```
ingredient (what the kitchen uses: workspace canonical item, base unit, default yield)
   ▲ many-to-one
supplier_product (what a supplier sells: code, spec, brand, packaging, purchase unit)
   ▲ one-to-many
supplier_price (pending → approved | rejected → superseded; append-only, valid_from/to)
   ▲ comes from
price_list → price_list_lines (staged import: matched / new / unmatched / ambiguous)
```

| Table | Key columns |
|---|---|
| `ingredients` | workspace_id, name, normalized_name **unique per workspace**, category_id, base_unit, default_yield_rate (0<y≤1), spec_notes, is_prep, prep_recipe_id, status, origin, confirmed_at |
| `ingredient_unit_conversions` | workspace_id, ingredient_id, from_unit, to_unit, factor, note: explicit only |
| `suppliers` | workspace_id, name, tax_id, contacts, payment_terms, lead_time_days, min_order_value, status (`pending` / `approved` / `blocked`), approved_by |
| `supplier_products` | workspace_id, supplier_id, ingredient_id, supplier_code (unique per supplier), supplier_description, brand, origin_country, spec jsonb, purchase_unit (what you order: case, kg, piece…), units_per_purchase_unit, unit_content_qty + unit_content_unit (e.g. 24 × 330 ml, 1 × 5 kg), **content_in_ingredient_base_units** (derived and checked, needs a conversion if the units differ), yield_override, min_order_qty, status |
| `supplier_prices` | workspace_id, supplier_product_id, price, currency, tax_included, tax_rate_id, valid_from, valid_to, status (`pending` / `approved` / `rejected` / `superseded`), source (`price_list` / `quote` / `manual` / `invoice`), price_list_line_id, submitted_by, decided_by, decided_at, decision_note. **Never updated in place**: an approved price is superseded by a newer approved one |
| `price_lists` | workspace_id, supplier_id, file_name, file_hash, received_at, valid_from, import_mapping_id, status |
| `price_list_lines` | workspace_id, price_list_id, row_no, raw jsonb, supplier_code, description, pack text, price, match_status, matched_supplier_product_id, issues |
| `ingredient_supplier_preferences` | workspace_id, ingredient_id, outlet_id null, supplier_product_id, rank, valid_from, reason |
| `cost_change_events` | workspace_id, trigger (`price_approved` / `recipe_approved` / `policy_changed`), source_id, created_at |
| `cost_change_impacts` | workspace_id, event_id, subject (recipe / dish), subject_id, outlet_id, old_cost, new_cost, delta_pct, target_rate, breaches_target: an immutable record of what changed |

**Comparison maths** (one engine function, used by the comparison table, the AI assistant and reports):
`effective cost per usable base unit = price_excl_tax (incl. tax if input tax is not recoverable) × FX(valid_from) ÷ content_in_ingredient_base_units ÷ yield`.
Products whose units cannot be converted are listed as "not comparable: missing conversion" and are never guessed.

**Approval flow:**
1. A price-list import creates `pending` prices.
2. The rules decide: auto-approve if the change is below threshold and the supplier is approved; otherwise queue for someone with `price.approve`.
3. Approval writes the decision, supersedes the previous price, and emits a `cost_change_event`.
4. A recursive query finds every recipe (through sub-recipes) and every dish using the ingredient. Costs are recomputed and the impacts recorded.
5. The dashboard and notifications show old vs new cost and target breaches.

Recipes are never modified by a price change. Only the costing changes.

## 8. Recipes, menus, sales, import — P2+ (as in `02-data-model.md` v2, plus the outlet column)

* `recipes.outlet_id` is nullable (null = shared library).
* `menus.outlet_id`, `dishes.outlet_id` and `sales_*.outlet_id` are **not null**.
* `recipe_versions.effective_from` = approval time. Approved versions are immutable.
* `recipe_lines`: exactly one of ingredient / sub-recipe; cycle check runs in a trigger.
* `costing_snapshots` store `policy_version_id` and the price IDs they used.
* The import framework (`import_mappings`, `import_batches`, `import_rows`, `external_keys`) is shared by workbook, ingredient-list, supplier price-list and sales imports.

## 9. Demo data

* A demo workspace is created from a **fictional** template: invented restaurant, suppliers, prices, recipes and menu.
* `workspaces.kind = 'demo'`, with every row `origin = 'demo'`. It is labelled in the UI on every screen, can be reset, and is never the default database.
* No real workbook data in the repo, fixtures, seeds or demo. Your real workbook is imported by you, into your own workspace, at runtime.
