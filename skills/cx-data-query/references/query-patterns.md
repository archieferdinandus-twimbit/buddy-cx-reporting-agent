# SQL Query Patterns for CX Stars Data

## Schema
- `datasets`: id, user_id, name, year, country, status, company_count, uploaded_at
- `companies`: id, dataset_id, company_name, industry, cx_star_rating, cx_star_mastery, digital_score, service_score, brand_score, employee_score, include_in_2025, raw_scores (JSONB)
- `qualitative_chunks`: id, company_id, chunk_type, pillar, content, embedding

## Common Query Patterns

### Rank companies by pillar
```sql
SELECT company_name, industry, digital_score
FROM companies
WHERE dataset_id = $DATASET_ID AND include_in_2025 = true
ORDER BY digital_score DESC
LIMIT 10
```

### Compare companies in an industry
```sql
SELECT company_name, cx_star_rating, digital_score, service_score, brand_score, employee_score
FROM companies
WHERE dataset_id = $DATASET_ID AND industry = 'Banking' AND include_in_2025 = true
ORDER BY cx_star_rating DESC
```

### Filter by mastery band
```sql
SELECT company_name, industry, cx_star_rating, cx_star_mastery
FROM companies
WHERE dataset_id = $DATASET_ID AND cx_star_mastery = 'Exceptional'
ORDER BY cx_star_rating DESC
```

### Industry averages
```sql
SELECT industry,
  COUNT(*) as company_count,
  ROUND(AVG(cx_star_rating)::numeric, 2) as avg_rating,
  ROUND(AVG(digital_score)::numeric, 2) as avg_digital,
  ROUND(AVG(service_score)::numeric, 2) as avg_service,
  ROUND(AVG(brand_score)::numeric, 2) as avg_brand,
  ROUND(AVG(employee_score)::numeric, 2) as avg_employee
FROM companies
WHERE dataset_id = $DATASET_ID AND include_in_2025 = true
GROUP BY industry
ORDER BY avg_rating DESC
```

### Access raw criteria scores via JSONB
```sql
SELECT company_name, raw_scores->>'mobile_app_experience' as mobile_app_score
FROM companies
WHERE dataset_id = $DATASET_ID AND include_in_2025 = true
ORDER BY (raw_scores->>'mobile_app_experience')::float DESC NULLS LAST
LIMIT 10
```
