"""Turn the raw Google Forms export into an anonymised summary for the deck.

Usage:
    python pipeline/process.py [path/to/responses.csv]

Writes docs/data/summary.json. Only aggregate counts leave this script:
no names, user IDs, timestamps or free-text answers are written out.
"""

from __future__ import annotations

import csv
import json
import sys
from collections import Counter
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_CSV = ROOT / "data" / "raw" / "responses.csv"
RESTAURANTS = ROOT / "data" / "restaurants.json"
OUT = ROOT / "docs" / "data" / "summary.json"
GROUP_TARGET = 20  # book for up to this many people

# Column positions in the form export (headers are long trilingual strings).
COL_DATES, COL_DIET, COL_ALLERGY, COL_SEVERE, COL_FOOD, COL_BUDGET, COL_AREA, COL_NOTES = (
    3, 4, 5, 6, 7, 8, 9, 10,
)
FOOD_MAX_PICKS = 2  # what the form asked for; many people ticked more

# Budget bands -> the highest price per person that band accepts.
BUDGET_CEILING = {"Up to €20": 20, "20–30 €": 30, "30–40 €": 40}
BUDGET_ORDER = list(BUDGET_CEILING)

DATE_ISO = {
    "Thursday 3 December": "2026-12-03",
    "Thursday 10 December": "2026-12-10",
    "Thursday 17 December": "2026-12-17",
}


def english(option: str) -> str:
    """Options look like 'Español / Català / English'; keep the English part."""
    return option.split(" / ")[-1].strip()


def options(cell: str) -> list[str]:
    return [english(x) for x in cell.split(";") if x.strip()]


def load(path: Path) -> list[list[str]]:
    with path.open(encoding="utf-8-sig", newline="") as f:
        rows = list(csv.reader(f))
    return [r + [""] * (COL_NOTES + 1 - len(r)) for r in rows[1:] if any(c.strip() for c in r)]


def summarise(rows: list[list[str]]) -> dict:
    n = len(rows)

    # --- Dates ---------------------------------------------------------
    avail = [set(options(r[COL_DATES])) for r in rows]
    date_counts = Counter(d for a in avail for d in a)
    dates = sorted(date_counts, key=lambda d: (-date_counts[d], DATE_ISO.get(d, d)))
    best = dates[0]
    missing = [a for a in avail if best not in a]
    fallback = Counter(d for a in missing for d in a)
    date_rank = [
        {"label": d, "iso": DATE_ISO.get(d), "count": date_counts[d], "share": date_counts[d] / n}
        for d in dates
    ]

    # --- Food: each person's picks share one vote ----------------------
    food_raw, food_weighted = Counter(), Counter()
    over_limit = blank_food = 0
    for r in rows:
        picks = options(r[COL_FOOD])
        if not picks:
            blank_food += 1
            continue
        if len(picks) > FOOD_MAX_PICKS:
            over_limit += 1
        for p in picks:
            food_raw[p] += 1
            food_weighted[p] += 1 / len(picks)
    food = [
        {"label": k, "mentions": food_raw[k], "weighted": round(food_weighted[k], 2)}
        for k in sorted(food_weighted, key=lambda k: (-food_weighted[k], -food_raw[k]))
    ]

    # --- Budget --------------------------------------------------------
    budget_counts = Counter(r[COL_BUDGET].split(" / ")[-1].strip() for r in rows if r[COL_BUDGET].strip())
    ceilings = [BUDGET_CEILING[b] for b, c in budget_counts.items() for _ in range(c) if b in BUDGET_CEILING]
    acceptance = [
        {"price": p, "ok": sum(1 for c in ceilings if c >= p), "share": sum(1 for c in ceilings if c >= p) / n}
        for p in (20, 25, 30, 35, 40)
    ]
    budget = [{"label": b, "count": budget_counts.get(b, 0)} for b in BUDGET_ORDER]

    # --- Area ----------------------------------------------------------
    area_counts = Counter(english(r[COL_AREA]) for r in rows if r[COL_AREA].strip())
    area = [{"label": k, "count": v} for k, v in area_counts.most_common()]
    area_blank = n - sum(area_counts.values())

    # --- Diet & allergies (counts only) --------------------------------
    diet_counts = Counter(english(r[COL_DIET]) for r in rows if r[COL_DIET].strip())
    diet = [{"label": k, "count": v} for k, v in diet_counts.most_common()]
    allergies = sum(1 for r in rows if r[COL_ALLERGY].strip())
    # Free-text fields are read by a human and never published.
    free_text = sum(1 for r in rows if r[COL_SEVERE].strip() or r[COL_NOTES].strip())

    # --- Conclusions ---------------------------------------------------
    top_food = [f["label"] for f in food[:2]]
    everyone_price = max((a["price"] for a in acceptance if a["ok"] == n), default=None)
    majority_price = max((a["price"] for a in acceptance if a["share"] > 0.5), default=None)
    alt = fallback.most_common(1)[0][0] if fallback else None
    restrictions = [d for d in diet if d["label"] != "No restrictions"]

    conclusions = {
        "date": best,
        "date_iso": DATE_ISO.get(best),
        "date_count": date_counts[best],
        "date_missing": len(missing),
        "date_alternative": alt,
        "date_alternative_covers_missing": fallback.get(alt, 0) if alt else 0,
        "food": top_food,
        "price_everyone": everyone_price,
        "price_majority": majority_price,
        "area": area[0]["label"] if area else None,
        "group_size": f"{n}–{max(n, 20)}",
        "restrictions": restrictions,
    }

    return {
        "generated": date.today().isoformat(),
        "responses": n,
        "dates": date_rank,
        "food": food,
        "food_over_limit": over_limit,
        "food_blank": blank_food,
        "budget": budget,
        "price_acceptance": acceptance,
        "area": area,
        "area_blank": area_blank,
        "diet": diet,
        "allergies": allergies,
        "free_text_reviewed": free_text,
        "conclusions": conclusions,
    }


def rank_restaurants(summary: dict, path: Path = RESTAURANTS) -> dict | None:
    """Score each hand-curated candidate against what the team asked for.

    score = 0.5 * food appeal + 0.35 * budget fit + 0.15 * central location
      food appeal: weighted votes of its best-matching cuisine / top cuisine's votes
      budget fit:  share of respondents whose budget covers its average price
    """
    if not path.exists():
        return None
    data = json.loads(path.read_text(encoding="utf-8"))
    n = summary["responses"]
    votes = {f["label"]: f["weighted"] for f in summary["food"]}
    top = max(votes.values()) if votes else 1
    ceilings = [BUDGET_CEILING[b["label"]] for b in summary["budget"] for _ in range(b["count"])]

    ranked = []
    for r in data["restaurants"]:
        food = max((votes.get(c, 0) for c in r["cuisine"]), default=0) / top
        price = r.get("avg_price")
        budget = sum(1 for c in ceilings if price is not None and c >= price) / n if price else 0
        central = 1.0 if r.get("central") else 0.0
        fits_group = r.get("max_group") is None or r["max_group"] >= GROUP_TARGET
        score = 0.5 * food + 0.35 * budget + 0.15 * central
        ranked.append({
            **r,
            "fits_group": fits_group,
            "group_confirm": r.get("max_group") is None,
            "food_fit": round(food, 2),
            "budget_fit": round(budget, 2),
            "score": round(score * 100),
        })
    ranked.sort(key=lambda r: (-r["score"], r.get("avg_price") or 99))
    return {"source": data.get("source"), "checked": data.get("checked"), "items": ranked}


def main() -> None:
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_CSV
    summary = summarise(load(src))
    summary["restaurants"] = rank_restaurants(summary)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    c = summary["conclusions"]
    print(f"{summary['responses']} responses -> {OUT.relative_to(ROOT)}")
    print(f"  date:   {c['date']} ({c['date_count']}/{summary['responses']})")
    print(f"  food:   {', '.join(c['food'])}")
    print(f"  price:  everyone <= €{c['price_everyone']}, majority <= €{c['price_majority']}")
    print(f"  area:   {c['area']}")
    if summary["restaurants"]:
        for r in summary["restaurants"]["items"][:5]:
            print(f"  {r['score']:>3}  {r['name']} ({', '.join(r['cuisine'])}, ~€{r['avg_price']})")


if __name__ == "__main__":
    main()
