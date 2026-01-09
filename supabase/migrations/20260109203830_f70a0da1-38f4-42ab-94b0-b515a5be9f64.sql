-- Insert the test template with user_id
INSERT INTO training_templates (
  user_id,
  name,
  description,
  category,
  is_public,
  tags,
  estimated_duration
) VALUES (
  '7f53e3c4-5ae8-421b-b59e-d6bf451b32b7',
  'Plyo Test Day – malý prostor (bez platformy)',
  'Rychlý test explozivity a reaktivity bez skokové desky. Vhodné do malého prostoru. Sleduje vertikálu, dálku z místa a symetrii jednonož.

**Odhadovaný čas:** 15-20 minut
**Vybavení:** metr, stopky, telefon-video, bedna (volitelně pro Drop Jump)

## Warm-up protokol
1. 3–5 min lehké zahřátí (běh na místě / švihadlo / rotoped)
2. Mobilita: kotník + kyčel (2×30–45 s na stranu)
3. Aktivace: 2×10 calf raises, 2×8 dřep s vlastní vahou
4. 2× submax CMJ (70–80 %)
5. 1× submax broad jump (70–80 %)

## Pořadí testů
1. **CMJ** – 3 pokusy, pauza 60–90 s
2. **SJ** – 3 pokusy, pauza 60–90 s
3. **Drop Jump** (VOLITELNĚ) – 3 pokusy, pauza 90–120 s (jen pokud je bedna)
4. **Standing Broad Jump** – 3 pokusy, pauza 60–90 s
5. **Single-leg Hop for Distance** – 3+3 pokusy, pauza 60–90 s
6. **Pogo Hops 10 s** – 2 pokusy, pauza 60–90 s
7. **Single-leg Pogo 10 s** – 2+2 pokusy, pauza 60–90 s

## Pravidla pauz
- Mezi pokusy: dle protokolu výše
- Mezi cviky: 2 min (u DJ 2–3 min)

## Pravidla záznamu dat
- U každého cviku ukládej attempt_number
- U distance/height vyhodnoť BEST
- U jednostranných cviků vždy zaznamenej LEFT i RIGHT
- Video je volitelné

## Pravidla vyhodnocení
- Zobraz BEST pro každý cvik
- U jednonožních cviků zobraz asymetrii (%) L vs R
- U reps testů zobraz nejlepší pokus a trend v čase',
  'tests',
  true,
  ARRAY['plyo', 'jump', 'power', 'reactive', 'small-space', 'test'],
  20
);