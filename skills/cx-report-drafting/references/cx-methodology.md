# CX Stars Methodology

## Programme Overview
CX Stars is Twimbit's benchmarking programme that evaluates customer experience across 100+ companies, 14 industries, and 124 evaluation criteria.

## Evaluation Framework
- **Four Pillars**: Digital Experience, Service Experience, Brand Experience, Employee Experience
- **124 Criteria**: distributed across sub-pillars within each pillar
- **Scoring Scale**: 0-5 (continuous, with 2 decimal precision)
- **Mastery Bands**: Emerging (0-1.4), Developing (1.5-2.9), Proficient (3.0-3.99), Advanced (4.0-4.4), Exceptional (4.5-5.0)

## Data Sources
- Scores are pre-calculated by Twimbit analysts in Excel workbooks
- Qualitative notes are analyst observations captured alongside scores
- All scores are ground truth — never recomputed by the platform

## Interpretation Guidelines
- A company's CX Star Rating is its overall score across all criteria
- Pillar scores (digital_score, service_score, brand_score, employee_score) are pillar-level aggregates
- raw_scores JSONB contains all 124 individual criteria scores
- Companies may excel in one pillar while lagging in others — always report pillar-level detail
