---
name: cx-insight-synthesis
description: >
  Synthesizes qualitative insights from semantic search results across
  CX Stars data. Use when the analyst asks about best practices,
  patterns, what separates leaders from laggards, or why a company
  scores high on a particular pillar.
---

# CX Insight Synthesis

## When to use
- "What is the best practice in gamification?"
- "What separates leaders from laggards in Digital?"
- "Why does Company X score high on Service Experience?"
- "What patterns do you see across Banking?"
- Questions about trends, themes, or qualitative evidence

## Approach
1. Use semantic_search tool to retrieve relevant qualitative chunks
2. Group findings by theme or pillar — see [references/pillar-definitions.md](references/pillar-definitions.md)
3. Cross-reference with quantitative scores using query_scores tool
4. Synthesize narrative following frameworks in [references/synthesis-frameworks.md](references/synthesis-frameworks.md)

## Key Rules
- Always ground insights in retrieved evidence — never fabricate qualitative findings
- When citing a best practice, name the company, industry, and specific practice
- Connect qualitative findings to quantitative performance where possible
- Identify patterns across companies, not just individual examples
