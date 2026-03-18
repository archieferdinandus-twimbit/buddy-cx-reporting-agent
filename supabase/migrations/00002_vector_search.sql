-- IVFFlat index for fast cosine similarity (run after initial data load, needs ~100+ rows)
CREATE INDEX IF NOT EXISTS idx_chunks_embedding
  ON qualitative_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- RPC function for validated read-only SQL execution
CREATE OR REPLACE FUNCTION exec_readonly_sql(query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  IF upper(trim(query)) NOT LIKE 'SELECT%' THEN
    RAISE EXCEPTION 'Only SELECT statements allowed';
  END IF;
  EXECUTE format('SELECT jsonb_agg(row_to_json(t)) FROM (%s) t', query) INTO result;
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- RPC function for semantic search via pgvector
CREATE OR REPLACE FUNCTION search_qualitative_chunks(
  query_embedding VECTOR(1024),
  match_count INTEGER DEFAULT 10,
  filter_pillar TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  company_id UUID,
  company_name TEXT,
  industry TEXT,
  chunk_type TEXT,
  pillar TEXT,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    qc.id,
    qc.company_id,
    c.company_name,
    c.industry,
    qc.chunk_type,
    qc.pillar,
    qc.content,
    1 - (qc.embedding <=> query_embedding) AS similarity
  FROM qualitative_chunks qc
  JOIN companies c ON c.id = qc.company_id
  WHERE
    qc.embedding IS NOT NULL
    AND (filter_pillar IS NULL OR qc.pillar = filter_pillar)
  ORDER BY qc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
