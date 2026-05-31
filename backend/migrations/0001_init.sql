-- btree_gist lets the EXCLUDE constraint compare therapist_id (uuid) with =.
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS staff_member (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'staff',
  bio text,
  photo_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS service (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL,
  description text,
  duration_minutes integer NOT NULL,
  buffer_minutes integer NOT NULL DEFAULT 30,
  price_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS working_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id uuid NOT NULL REFERENCES staff_member(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL
);
CREATE INDEX IF NOT EXISTS working_hours_therapist_idx ON working_hours(therapist_id);

CREATE TABLE IF NOT EXISTS time_off (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id uuid NOT NULL REFERENCES staff_member(id) ON DELETE CASCADE,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  reason text
);
CREATE INDEX IF NOT EXISTS time_off_therapist_idx ON time_off(therapist_id);

CREATE TABLE IF NOT EXISTS booking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  confirmation_code text NOT NULL UNIQUE,
  service_id uuid NOT NULL REFERENCES service(id),
  therapist_id uuid NOT NULL REFERENCES staff_member(id),
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  occupied_until timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'confirmed',
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text NOT NULL,
  customer_note text,
  source text NOT NULL DEFAULT 'online',
  payment_status text NOT NULL DEFAULT 'pay_in_person',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- No two active bookings for one therapist may overlap (service time + buffer).
  CONSTRAINT booking_no_overlap EXCLUDE USING gist (
    therapist_id WITH =,
    tstzrange(start_at, occupied_until) WITH &&
  ) WHERE (status IN ('pending', 'confirmed'))
);
CREATE INDEX IF NOT EXISTS booking_therapist_start_idx ON booking(therapist_id, start_at);
CREATE INDEX IF NOT EXISTS booking_status_idx ON booking(status);

CREATE TABLE IF NOT EXISTS notification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES booking(id) ON DELETE CASCADE,
  channel text NOT NULL,
  type text NOT NULL,
  recipient text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  sent_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notification_booking_idx ON notification(booking_id);
-- At most one reminder per booking → reminder job is idempotent.
CREATE UNIQUE INDEX IF NOT EXISTS notification_reminder_unique
  ON notification(booking_id) WHERE type = 'reminder';
