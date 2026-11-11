-- Enquiries from the contact form, and a small table for rate limiting.

CREATE TABLE enquiries (
  id           TEXT PRIMARY KEY,
  created_at   TEXT NOT NULL,           -- ISO 8601
  name         TEXT NOT NULL,
  email        TEXT NOT NULL,
  phone        TEXT,
  message      TEXT NOT NULL,
  page         TEXT,                    -- the path the form was sent from
  user_agent   TEXT,
  -- When the enquiry was handed to Craeft's gateway to be emailed (NULL: not yet).
  sent_at      TEXT,
  send_error   TEXT
);
CREATE INDEX enquiries_created ON enquiries (created_at DESC);

CREATE TABLE rate_limits (
  key          TEXT PRIMARY KEY,        -- "<bucket>:<hash of the IP address>"
  count        INTEGER NOT NULL,
  window_start INTEGER NOT NULL         -- epoch seconds
);
