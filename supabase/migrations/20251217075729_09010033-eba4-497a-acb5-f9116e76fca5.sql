-- Add feedback_questions column to feedback_settings for dynamic questionnaire configuration
ALTER TABLE public.feedback_settings 
ADD COLUMN IF NOT EXISTS feedback_questions jsonb DEFAULT '{
  "questions": [
    {"id": "soreness", "type": "slider", "label": "Svalovka", "emoji": "💪", "minLabel": "Žádná", "maxLabel": "Extrémní", "min": 1, "max": 10, "defaultValue": 5, "enabled": true, "order": 0},
    {"id": "body_feel", "type": "slider", "label": "Celkový pocit v těle", "emoji": "🧘", "minLabel": "Špatně", "maxLabel": "Výborně", "min": 1, "max": 10, "defaultValue": 5, "enabled": true, "order": 1},
    {"id": "energy", "type": "slider", "label": "Energie", "emoji": "⚡", "minLabel": "Vyčerpaný", "maxLabel": "Plný energie", "min": 1, "max": 10, "defaultValue": 5, "enabled": true, "order": 2},
    {"id": "pain", "type": "slider", "label": "Bolest (ne jen svalovka)", "emoji": "🩹", "minLabel": "Žádná", "maxLabel": "Silná", "min": 1, "max": 10, "defaultValue": 1, "enabled": true, "order": 3, "showPainAreas": true, "painAreaThreshold": 4},
    {"id": "session_fit", "type": "slider", "label": "Jak sedl trénink", "emoji": "🎯", "minLabel": "Vůbec", "maxLabel": "Perfektně", "min": 1, "max": 10, "defaultValue": 5, "enabled": true, "order": 4},
    {"id": "difficulty", "type": "slider", "label": "Jak těžký byl trénink", "emoji": "🏋️", "minLabel": "Lehký", "maxLabel": "Velmi těžký", "min": 1, "max": 10, "defaultValue": 5, "enabled": true, "order": 5},
    {"id": "fun", "type": "slider", "label": "Jak moc to bavilo", "emoji": "😊", "minLabel": "Vůbec", "maxLabel": "Maximálně", "min": 1, "max": 10, "defaultValue": 5, "enabled": true, "order": 6}
  ],
  "painAreas": [
    {"id": "knee", "label": "Koleno", "enabled": true},
    {"id": "back", "label": "Záda", "enabled": true},
    {"id": "shoulder", "label": "Rameno", "enabled": true},
    {"id": "hip", "label": "Kyčel", "enabled": true},
    {"id": "ankle", "label": "Kotník", "enabled": true},
    {"id": "wrist", "label": "Zápěstí", "enabled": true},
    {"id": "neck", "label": "Krk", "enabled": true},
    {"id": "other", "label": "Jiné", "enabled": true}
  ],
  "noteEnabled": true,
  "noteMaxLength": 200
}'::jsonb;