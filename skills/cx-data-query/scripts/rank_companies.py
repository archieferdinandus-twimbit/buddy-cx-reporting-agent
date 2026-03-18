"""Deterministic company ranking by score column. stdlib-only."""
import json
import sys


def rank_companies(data: list[dict], score_key: str, ascending: bool = False) -> list[dict]:
    """Sort companies by a score column, handling nulls."""
    valid = [c for c in data if c.get(score_key) is not None]
    valid.sort(key=lambda c: c[score_key], reverse=not ascending)
    for i, company in enumerate(valid, 1):
        company["rank"] = i
    return valid


if __name__ == "__main__":
    raw = json.load(sys.stdin)
    score_key = sys.argv[1] if len(sys.argv) > 1 else "cx_star_rating"
    ranked = rank_companies(raw, score_key)
    json.dump(ranked, sys.stdout, indent=2)
