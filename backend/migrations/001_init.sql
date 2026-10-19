CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('staff', 'admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE inquiries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL CHECK (length(trim(customer_name)) > 0),
  contact       TEXT NOT NULL CHECK (length(trim(contact)) > 0),
  subject       TEXT NOT NULL CHECK (length(trim(subject)) > 0),
  description   TEXT NOT NULL CHECK (length(trim(description)) > 0),
  status        TEXT NOT NULL DEFAULT 'New'
                CHECK (status IN ('New', 'In Progress', 'Resolved')),
  created_by    UUID NOT NULL REFERENCES users(id),
  version       INTEGER NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inquiries_created_by ON inquiries(created_by);
CREATE INDEX idx_inquiries_status ON inquiries(status);
CREATE INDEX idx_inquiries_created_at ON inquiries(created_at DESC);

CREATE TABLE inquiry_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id  UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id),
  from_status TEXT,
  to_status   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_inquiry ON inquiry_events(inquiry_id, created_at);