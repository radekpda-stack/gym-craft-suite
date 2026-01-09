-- First insert the plyometric exercises
INSERT INTO exercises (
  name, name_cs, category, subcategory, movement_pattern, difficulty,
  description_cs, description_en, instructions_cs, instructions_en, trainer_notes,
  equipment, muscle_groups, is_bodyweight, source
) VALUES
(
  'Countermovement Jump (CMJ)',
  'Skok do výšky z protipohybu (CMJ)',
  'plyometrics',
  'vertical',
  'conditioning',
  'intermediate',
  'Vertikální skok s protipohybem pro měření explozivní síly dolních končetin.',
  'Vertical jump with countermovement to measure lower body explosive power.',
  '1. Stoj vzpřímený, paže podél těla
2. Rychlý sed (protipohyb) s švihem paží dozadu
3. Okamžitý odraz vzhůru s maximálním úsilím
4. Paže švihnou vzhůru
5. Dopad do měkkých kolen',
  '1. Stand upright, arms at sides
2. Quick squat (countermovement) with arms swinging back
3. Immediate takeoff upward with maximum effort
4. Arms swing upward
5. Land with soft knees',
  'Měření: best_of_3, pauza 60-90s. Space: small.',
  ARRAY['telefon-video'],
  ARRAY['quadriceps', 'glutes', 'calves'],
  true,
  'system'
),
(
  'Squat Jump (SJ)',
  'Skok z pauzy (SJ)',
  'plyometrics',
  'vertical',
  'conditioning',
  'intermediate',
  'Vertikální skok bez protipohybu - izoluje koncentrickou sílu.',
  'Vertical jump without countermovement - isolates concentric power.',
  '1. Sesed do pozice dřepu (90° v kolenou)
2. Pauza 2-3 sekundy bez pohybu
3. Odraz vzhůru bez jakéhokoli předpružení
4. Maximální výskok
5. Dopad do měkkých kolen',
  '1. Lower into squat position (90° knee angle)
2. Pause 2-3 seconds without movement
3. Jump upward without any countermovement
4. Maximum height jump
5. Land with soft knees',
  'Měření: best_of_3, pauza 60-90s. Space: small.',
  ARRAY['telefon-video'],
  ARRAY['quadriceps', 'glutes', 'calves'],
  true,
  'system'
),
(
  'Drop Jump (DJ)',
  'Seskok s odrazem (DJ)',
  'plyometrics',
  'vertical',
  'conditioning',
  'advanced',
  'Seskok z bedny s okamžitým odrazem - měří reaktivní sílu.',
  'Drop from box with immediate rebound - measures reactive strength.',
  '1. Stoj na bedně (30-50 cm)
2. Krok vpřed (ne skok) dolů z bedny
3. Dopad na přední část chodidel
4. Okamžitý odraz vzhůru (minimální kontakt se zemí)
5. Maximální výška výskoku',
  '1. Stand on box (30-50 cm)
2. Step forward (not jump) off the box
3. Land on balls of feet
4. Immediate rebound upward (minimal ground contact)
5. Maximum jump height',
  'VOLITELNÝ. Měření: best_of_3, pauza 90-120s. Space: small.',
  ARRAY['bedna', 'telefon-video'],
  ARRAY['quadriceps', 'glutes', 'calves'],
  true,
  'system'
),
(
  'Standing Broad Jump',
  'Skok do dálky z místa',
  'plyometrics',
  'horizontal',
  'conditioning',
  'beginner',
  'Horizontální skok z místa - základní test explozivity dolních končetin.',
  'Horizontal jump from standing - basic lower body power test.',
  '1. Stoj za startovní čárou, nohy na šířku ramen
2. Protipohyb s švihem paží dozadu
3. Odraz oběma nohama současně vpřed
4. Let s nohama před tělem
5. Dopad na obě nohy, stabilizace',
  '1. Stand behind starting line, feet shoulder width
2. Countermovement with arms swinging back
3. Takeoff with both feet simultaneously forward
4. Flight with legs in front of body
5. Land on both feet, stabilize',
  'Měření: best_of_3, pauza 60-90s. Space: medium.',
  ARRAY['metr', 'telefon-video'],
  ARRAY['quadriceps', 'glutes', 'hamstrings'],
  true,
  'system'
),
(
  'Single-leg Hop for Distance',
  'Jednoskok do dálky',
  'plyometrics',
  'unilateral',
  'conditioning',
  'intermediate',
  'Jednonožní skok do dálky - měří unilaterální sílu a odhaluje asymetrie.',
  'Single-leg horizontal hop - measures unilateral power and reveals asymmetries.',
  '1. Stoj na jedné noze za startovní čárou
2. Protipohyb s švihem paží
3. Odraz z jedné nohy vpřed
4. Let s kontrolou těla
5. Dopad na stejnou nohu, stabilizace',
  '1. Stand on one leg behind starting line
2. Countermovement with arm swing
3. Hop forward from single leg
4. Flight with body control
5. Land on same leg, stabilize',
  'Měření: best_of_3 na každou nohu, pauza 60-90s. Space: medium.',
  ARRAY['metr', 'telefon-video'],
  ARRAY['quadriceps', 'glutes', 'calves'],
  true,
  'system'
),
(
  'Double-leg Pogo Hops',
  'Kotníkové odrazy na místě',
  'plyometrics',
  'reactive',
  'conditioning',
  'beginner',
  'Rychlé kotníkové odrazy na místě - měří reaktivní sílu kotníků.',
  'Fast ankle bounces in place - measures ankle reactive strength.',
  '1. Stoj vzpřímený, paže před tělem nebo v bok
2. Odrazy pouze z kotníků (kolena téměř rovná)
3. Minimální kontakt se zemí
4. Udržuj rytmus a výšku odrazů
5. Počítej skoky za 10 sekund',
  '1. Stand upright, arms in front or at sides
2. Bounce from ankles only (knees almost straight)
3. Minimal ground contact
4. Maintain rhythm and bounce height
5. Count jumps for 10 seconds',
  'Měření: total_in_time (10s), 2 pokusy, pauza 60-90s. Space: small.',
  ARRAY['stopky', 'telefon-video'],
  ARRAY['calves'],
  true,
  'system'
),
(
  'Single-leg Pogo Hops',
  'Kotníkové odrazy na jedné noze',
  'plyometrics',
  'reactive',
  'conditioning',
  'intermediate',
  'Jednonožní kotníkové odrazy - měří unilaterální reaktivní sílu.',
  'Single-leg ankle bounces - measures unilateral reactive strength.',
  '1. Stoj na jedné noze
2. Odrazy pouze z kotníku (koleno téměř rovné)
3. Druhá noha pokrčená vzadu
4. Minimální kontakt se zemí
5. Počítej skoky za 10 sekund',
  '1. Stand on one leg
2. Bounce from ankle only (knee almost straight)
3. Other leg bent behind
4. Minimal ground contact
5. Count jumps for 10 seconds',
  'Měření: total_in_time (10s), 2 pokusy na nohu, pauza 60-90s. Space: small.',
  ARRAY['stopky', 'telefon-video'],
  ARRAY['calves'],
  true,
  'system'
)
ON CONFLICT (id) DO NOTHING;