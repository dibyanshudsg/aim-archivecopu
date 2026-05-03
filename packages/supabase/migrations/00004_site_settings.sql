-- AIM Archive: admin-managed site settings

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  updated_by UUID REFERENCES admins(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO site_settings (key, value, description) VALUES
  ('feedback_form_url', 'https://docs.google.com/forms/d/1VgXbG81Gxloes4cTGcfwzqlfiHxwmToqe_obSj_Mv9w/viewform', 'Public Google Form URL used by the footer feedback link'),
  ('feedback_form_edit_url', 'https://docs.google.com/forms/d/1VgXbG81Gxloes4cTGcfwzqlfiHxwmToqe_obSj_Mv9w/edit', 'Private/admin Google Form edit URL for managing the feedback form')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description;

DROP TRIGGER IF EXISTS site_settings_updated_at ON site_settings;
CREATE TRIGGER site_settings_updated_at
  BEFORE UPDATE ON site_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read site settings" ON site_settings;
CREATE POLICY "Public can read site settings" ON site_settings FOR SELECT USING (TRUE);
