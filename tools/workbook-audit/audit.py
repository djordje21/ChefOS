"""Independent re-calculation of a source food cost workbook.

Re-implements every costing formula with decimal arithmetic, compares the result
against the values Excel cached in the file, and lists data-quality findings.
The workbook is never modified.

Usage:  python3 -I tools/workbook-audit/audit.py path/to/source_workbook.xlsx
"""
import sys
from collections import defaultdict
from decimal import Decimal as D, ROUND_HALF_UP, ROUND_CEILING, getcontext

import openpyxl

getcontext().prec = 34
TOL = D("1e-9")


def dec(v):
    return D(str(v))


def main(path):
    wb = openpyxl.load_workbook(path, data_only=True)
    issues = []

    s = wb["Settings"]
    vat, step, allowance = dec(s["B5"].value), dec(s["B6"].value), dec(s["B7"].value)
    targets = {s.cell(r, 1).value: dec(s.cell(r, 2).value) for r in range(12, 24)}

    # Ingredients
    ing, by_norm = {}, defaultdict(list)
    ws = wb["Ingredients"]
    for r in range(5, ws.max_row + 1):
        name, unit, price, yld = (ws.cell(r, c).value for c in (2, 3, 4, 5))
        if not name:
            if any(ws.cell(r, c).value not in (None, 1) for c in (1, 3, 4)) or ws.cell(r, 12).value:
                issues.append(f"Ingredients!{r}: row has data but no ingredient name")
            continue
        if name != name.strip():
            issues.append(f"Ingredients!{r}: leading/trailing space in name {name!r}")
        key = name.strip().lower()
        by_norm[key].append(r)
        if price in (None, 0):
            issues.append(f"Ingredients!{r}: {name}: missing/zero price")
            cpu = None
        else:
            divisor = D(1000) if unit in ("kg", "l") else D(1)
            cpu = dec(price) / dec(yld) / divisor
            if abs(cpu - dec(ws.cell(r, 8).value)) > TOL:
                issues.append(f"Ingredients!{r}: cost/unit mismatch {cpu} vs Excel {ws.cell(r, 8).value}")
        ing[key] = dict(row=r, name=name, unit=unit, price=price, yld=yld, cpu=cpu,
                        category=ws.cell(r, 1).value, uses=0)
    for k, rows in by_norm.items():
        if len(rows) > 1:
            issues.append(f"Ingredients: exact duplicate name {k!r} rows {rows}")

    # Recipes
    ws = wb["Recipes"]
    cost = defaultdict(D)
    for r in range(5, ws.max_row + 1):
        dish, name, qty = (ws.cell(r, c).value for c in (1, 2, 3))
        if not dish or not name:
            continue
        key = name.strip().lower()
        i = ing.get(key)
        if i is None:
            issues.append(f"Recipes!{r}: {dish}: unknown ingredient {name!r}")
            continue
        i["uses"] += 1
        if name != i["name"]:
            issues.append(f"Recipes!{r}: name differs in case/spacing: {name!r} vs {i['name']!r}")
        if qty in (None, 0):
            issues.append(f"Recipes!{r}: {dish}: {name}: quantity {qty!r} (Excel status still 'OK' for 0)")
        if i["cpu"] is None:
            continue
        line = dec(qty or 0) * i["cpu"]
        if abs(line - dec(ws.cell(r, 6).value)) > TOL:
            issues.append(f"Recipes!{r}: line cost mismatch {line} vs {ws.cell(r, 6).value}")
        cost[dish] += line

    # Dishes
    ws = wb["Dishes"]
    seen_no = defaultdict(list)
    rows = []
    for r in range(5, 66):
        dish = ws.cell(r, 3).value
        if not dish:
            continue
        seen_no[ws.cell(r, 1).value].append(dish)
        cat = ws.cell(r, 2).value
        portion = cost[dish] * (1 + allowance)
        override = ws.cell(r, 7).value
        target = dec(override) if override is not None else targets[cat]
        sugg_net = portion / target
        sugg_nearest = (sugg_net * (1 + vat) / step).quantize(D(1), ROUND_HALF_UP) * step
        sugg_up = (sugg_net * (1 + vat) / step).quantize(D(1), ROUND_CEILING) * step
        gross = dec(ws.cell(r, 11).value)
        net = gross / (1 + vat)
        fc = portion / net
        for col, mine in ((5, portion), (9, sugg_net), (10, sugg_nearest), (12, net), (13, fc), (14, net - portion)):
            if abs(mine - dec(ws.cell(r, col).value)) > TOL:
                issues.append(f"Dishes!{r}: col {col} mismatch {mine} vs {ws.cell(r, col).value}")
        rows.append(dict(cat=cat, dish=dish, cost=portion, target=target, sugg=sugg_nearest,
                         sugg_up=sugg_up, gross=gross, net=net, fc=fc,
                         fc_at_sugg=portion / (sugg_nearest / (1 + vat))))
    for no, dishes in seen_no.items():
        if len(dishes) > 1:
            issues.append(f"Dishes: number {no} used by {dishes}")

    print(f"Settings: VAT {vat}, rounding step {step}, allowance {allowance}")
    print(f"Ingredients: {len(ing)}  |  recipe dishes: {len(cost)}  |  menu dishes: {len(rows)}")
    print("\n== Dish reconciliation (Decimal re-calculation vs Excel: mismatches listed under issues)")
    print(f"{'Dish':58} {'Cost':>9} {'Tgt':>6} {'Sugg':>6} {'Up':>6} {'Final':>6} {'FC%':>6} {'FC@sugg':>8}")
    for x in rows:
        print(f"{x['dish'][:58]:58} {x['cost']:9.2f} {x['target']*100:5.1f}% {x['sugg']:6.0f} {x['sugg_up']:6.0f} "
              f"{x['gross']:6.0f} {x['fc']*100:5.2f}% {x['fc_at_sugg']*100:7.2f}%")
    n = len(rows)
    print(f"\nSimple average FC (Excel method): {sum(x['fc'] for x in rows) / n * 100:.4f}%")
    print(f"Aggregate FC (sum cost / sum net, one of each dish): "
          f"{sum(x['cost'] for x in rows) / sum(x['net'] for x in rows) * 100:.4f}%")
    breach = [x['dish'] for x in rows if x['fc_at_sugg'] > x['target']]
    print(f"Suggested prices (round-to-nearest) that land above target: {len(breach)}/{n}")
    print("\nUnused ingredients:", ", ".join(i["name"].strip() for i in ing.values() if i["uses"] == 0))
    print("\n== Issues")
    for i in issues:
        print(" -", i)


if __name__ == "__main__":
    main(sys.argv[1])
