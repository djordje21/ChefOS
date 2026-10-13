# ChefOS

Professional kitchen management & food cost platform (work in progress).

* `docs/02-data-model.md` — proposed database schema
* `docs/03-implementation-plan.md` — phased plan, status
* `tools/workbook-audit/audit.py` — independent decimal re-calculation of the source food cost workbook (`python3 -I tools/workbook-audit/audit.py <file.xlsx>`; requires `openpyxl`)

Business data (workbooks, prices, the full audit report) is intentionally kept out of this repository.
