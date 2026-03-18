-- Reports table: stores report projects with their state
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID REFERENCES datasets(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'in_progress', 'draft', 'complete')),
  sections JSONB DEFAULT '{}',
  tagged_insights JSONB DEFAULT '[]',
  chat_history JSONB DEFAULT '[]',
  canvas_cards JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_reports_updated ON reports(updated_at DESC);
CREATE INDEX idx_reports_dataset ON reports(dataset_id);
