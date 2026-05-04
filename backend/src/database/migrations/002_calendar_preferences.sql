ALTER TABLE users ADD COLUMN IF NOT EXISTS calendar_preferences JSONB DEFAULT '{
  "defaultDurationMinutes": 30,
  "slotStepMinutes": 30,
  "minNoticeHours": 2,
  "maxBookingDays": 30,
  "allowPatientModeChoice": true,
  "sessions": [
    {"id": "mon-am", "dayOfWeek": 1, "start": "09:00", "end": "12:00", "mode": "both", "enabled": true},
    {"id": "mon-pm", "dayOfWeek": 1, "start": "14:00", "end": "17:00", "mode": "both", "enabled": true},
    {"id": "tue-am", "dayOfWeek": 2, "start": "09:00", "end": "12:00", "mode": "both", "enabled": true},
    {"id": "tue-pm", "dayOfWeek": 2, "start": "14:00", "end": "17:00", "mode": "both", "enabled": true},
    {"id": "wed-am", "dayOfWeek": 3, "start": "09:00", "end": "12:00", "mode": "both", "enabled": true},
    {"id": "wed-pm", "dayOfWeek": 3, "start": "14:00", "end": "17:00", "mode": "both", "enabled": true},
    {"id": "thu-am", "dayOfWeek": 4, "start": "09:00", "end": "12:00", "mode": "both", "enabled": true},
    {"id": "thu-pm", "dayOfWeek": 4, "start": "14:00", "end": "17:00", "mode": "both", "enabled": true},
    {"id": "fri-am", "dayOfWeek": 5, "start": "09:00", "end": "12:00", "mode": "both", "enabled": true},
    {"id": "fri-pm", "dayOfWeek": 5, "start": "14:00", "end": "17:00", "mode": "both", "enabled": true}
  ]
}'::jsonb;

ALTER TABLE users ALTER COLUMN calendar_preferences SET DEFAULT '{
  "defaultDurationMinutes": 30,
  "slotStepMinutes": 30,
  "minNoticeHours": 2,
  "maxBookingDays": 30,
  "allowPatientModeChoice": true,
  "sessions": [
    {"id": "mon-am", "dayOfWeek": 1, "start": "09:00", "end": "12:00", "mode": "both", "enabled": true},
    {"id": "mon-pm", "dayOfWeek": 1, "start": "14:00", "end": "17:00", "mode": "both", "enabled": true},
    {"id": "tue-am", "dayOfWeek": 2, "start": "09:00", "end": "12:00", "mode": "both", "enabled": true},
    {"id": "tue-pm", "dayOfWeek": 2, "start": "14:00", "end": "17:00", "mode": "both", "enabled": true},
    {"id": "wed-am", "dayOfWeek": 3, "start": "09:00", "end": "12:00", "mode": "both", "enabled": true},
    {"id": "wed-pm", "dayOfWeek": 3, "start": "14:00", "end": "17:00", "mode": "both", "enabled": true},
    {"id": "thu-am", "dayOfWeek": 4, "start": "09:00", "end": "12:00", "mode": "both", "enabled": true},
    {"id": "thu-pm", "dayOfWeek": 4, "start": "14:00", "end": "17:00", "mode": "both", "enabled": true},
    {"id": "fri-am", "dayOfWeek": 5, "start": "09:00", "end": "12:00", "mode": "both", "enabled": true},
    {"id": "fri-pm", "dayOfWeek": 5, "start": "14:00", "end": "17:00", "mode": "both", "enabled": true}
  ]
}'::jsonb;

UPDATE users
SET calendar_preferences = DEFAULT
WHERE calendar_preferences IS NULL;
