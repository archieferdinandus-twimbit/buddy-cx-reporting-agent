---
name: cx-data-query
description: >
  Handles all quantitative queries against CX Stars scoring data.
  Use for rankings, comparisons, averages, top/bottom performers,
  score filtering by mastery band or industry, and any question
  requiring structured data retrieval from the companies table.
---

# CX Data Query

## When to use
- Ranking questions: "top 5 companies in Digital", "bottom performers"
- Score comparisons between companies or industries
- Filtering by mastery band (Emerging, Developing, Proficient, Advanced, Exceptional)
- Aggregations: average score, count by industry, percentiles
- Any question containing: "top", "bottom", "average", "rank", "compare", "score"

## Approach
1. Identify which pillar(s) are relevant (digital_score, service_score, brand_score, employee_score)
2. Use the query_scores or compute_aggregate tool — never compute scores manually
3. Always scope queries to the active dataset_id
4. See [references/query-patterns.md](references/query-patterns.md) for validated SQL patterns

## Key Rules
- NEVER perform arithmetic — always use compute_aggregate tool
- Scores are ground truth from the uploaded Excel file — cite them exactly
- Always cite specific company names and scores in responses
- Filter to include_in_2025 = true unless user specifies otherwise
- See [references/mastery-bands.md](references/mastery-bands.md) for band definitions
