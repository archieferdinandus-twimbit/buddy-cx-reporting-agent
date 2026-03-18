-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Datasets (one per uploaded workbook)
CREATE TABLE datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  year INTEGER NOT NULL DEFAULT 2025,
  country TEXT NOT NULL DEFAULT 'Global',
  file_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  company_count INTEGER,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_datasets_user ON datasets(user_id);

-- Companies
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  industry TEXT NOT NULL,
  cx_star_rating REAL,
  cx_star_mastery TEXT,
  digital_score REAL,
  service_score REAL,
  brand_score REAL,
  employee_score REAL,
  include_in_2025 BOOLEAN DEFAULT true,
  raw_scores JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_companies_dataset ON companies(dataset_id);
CREATE INDEX idx_companies_industry ON companies(dataset_id, industry);

-- Qualitative chunks with vector embeddings
CREATE TABLE qualitative_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  chunk_type TEXT NOT NULL DEFAULT 'best_practice',
  pillar TEXT,
  content TEXT NOT NULL,
  embedding VECTOR(1024),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chunks_company ON qualitative_chunks(company_id);
