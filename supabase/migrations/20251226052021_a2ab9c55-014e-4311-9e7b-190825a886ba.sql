-- SEED: 4 povinné kardio cviky s aliasy, muscle groups a tagy
DO $$
DECLARE
  v_user_id uuid := 'ec31b7f8-001f-4fb4-8dc4-b7bb8be9311b';
  v_veslo_id uuid;
  v_treadmill_id uuid;
  v_rope_id uuid;
  v_skillup_id uuid;
  v_kardio_tag_id uuid;
  v_kondice_tag_id uuid;
  v_plyo_tag_id uuid;
  v_back_horiz_id uuid; v_biceps_id uuid; v_core_anti_ext_id uuid; v_core_lateral_id uuid;
  v_quads_id uuid; v_hamstrings_id uuid; v_glute_max_id uuid; v_calves_id uuid; v_shoulders_mid_id uuid;
BEGIN
  -- Focus tagy
  IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Kardio' AND tag_type = 'focus' AND user_id = v_user_id) THEN
    INSERT INTO tags (name, tag_type, color, is_system, affects_credit, affects_load, user_id) VALUES ('Kardio', 'focus', '#ef4444', true, true, true, v_user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Kondice' AND tag_type = 'focus' AND user_id = v_user_id) THEN
    INSERT INTO tags (name, tag_type, color, is_system, affects_credit, affects_load, user_id) VALUES ('Kondice', 'focus', '#f97316', true, true, true, v_user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Plyometrie' AND tag_type = 'focus' AND user_id = v_user_id) THEN
    INSERT INTO tags (name, tag_type, color, is_system, affects_credit, affects_load, user_id) VALUES ('Plyometrie', 'focus', '#eab308', true, true, true, v_user_id);
  END IF;
  SELECT id INTO v_kardio_tag_id FROM tags WHERE name = 'Kardio' AND tag_type = 'focus' LIMIT 1;
  SELECT id INTO v_kondice_tag_id FROM tags WHERE name = 'Kondice' AND tag_type = 'focus' LIMIT 1;
  SELECT id INTO v_plyo_tag_id FROM tags WHERE name = 'Plyometrie' AND tag_type = 'focus' LIMIT 1;

  -- Cviky (use 'conditioning' for movement_pattern)
  SELECT id INTO v_veslo_id FROM exercises WHERE LOWER(name) = 'veslo' AND is_archived = false LIMIT 1;
  IF v_veslo_id IS NULL THEN
    INSERT INTO exercises (name, name_cs, name_en, search_name, category, default_unit, is_time_based, is_bodyweight, is_archived, movement_pattern, source, trainer_notes)
    VALUES ('Veslo', 'Veslo', 'Rowing Ergometer', 'veslo', 'Kardio', 'cardio_machine', true, true, false, 'conditioning', 'system', 'Kardio - veslovací ergometr')
    RETURNING id INTO v_veslo_id;
  END IF;
  SELECT id INTO v_treadmill_id FROM exercises WHERE LOWER(name) = 'běžecký pás' AND is_archived = false LIMIT 1;
  IF v_treadmill_id IS NULL THEN
    INSERT INTO exercises (name, name_cs, name_en, search_name, category, default_unit, is_time_based, is_bodyweight, is_archived, movement_pattern, source, trainer_notes)
    VALUES ('Běžecký pás', 'Běžecký pás', 'Treadmill Run', 'bezecky pas', 'Kardio', 'cardio_machine', true, true, false, 'conditioning', 'system', 'Kardio - běh na pásu')
    RETURNING id INTO v_treadmill_id;
  END IF;
  SELECT id INTO v_rope_id FROM exercises WHERE LOWER(name) = 'švihadlo' AND is_archived = false LIMIT 1;
  IF v_rope_id IS NULL THEN
    INSERT INTO exercises (name, name_cs, name_en, search_name, category, default_unit, is_time_based, is_bodyweight, is_archived, movement_pattern, source, trainer_notes)
    VALUES ('Švihadlo', 'Švihadlo', 'Jump Rope', 'svihadlo', 'Kardio', 'cardio_machine', true, true, false, 'conditioning', 'system', 'Kardio/kondiční - švihadlo')
    RETURNING id INTO v_rope_id;
  END IF;
  SELECT id INTO v_skillup_id FROM exercises WHERE LOWER(name) = 'skillup' AND is_archived = false LIMIT 1;
  IF v_skillup_id IS NULL THEN
    INSERT INTO exercises (name, name_cs, name_en, search_name, category, default_unit, is_time_based, is_bodyweight, is_archived, movement_pattern, source, trainer_notes)
    VALUES ('SkillUp', 'SkillUp', 'SkillUp', 'skillup', 'Kardio', 'cardio_machine', true, true, false, 'conditioning', 'system', 'Kondiční stroj SkillUp')
    RETURNING id INTO v_skillup_id;
  END IF;

  -- Muscle groups
  SELECT id INTO v_back_horiz_id FROM muscle_groups WHERE name = 'back_horizontal_pull';
  SELECT id INTO v_biceps_id FROM muscle_groups WHERE name = 'biceps';
  SELECT id INTO v_core_anti_ext_id FROM muscle_groups WHERE name = 'core_anti_extension';
  SELECT id INTO v_core_lateral_id FROM muscle_groups WHERE name = 'core_lateral';
  SELECT id INTO v_quads_id FROM muscle_groups WHERE name = 'quadriceps';
  SELECT id INTO v_hamstrings_id FROM muscle_groups WHERE name = 'hamstrings';
  SELECT id INTO v_glute_max_id FROM muscle_groups WHERE name = 'gluteus_maximus';
  SELECT id INTO v_calves_id FROM muscle_groups WHERE name = 'calves';
  SELECT id INTO v_shoulders_mid_id FROM muscle_groups WHERE name = 'shoulders_middle';

  -- VESLO: aliasy + muscle groups + tagy
  IF v_veslo_id IS NOT NULL THEN
    INSERT INTO exercise_aliases (exercise_id, alias_name, alias_normalized, language) SELECT v_veslo_id, 'rowing', 'rowing', 'en' WHERE NOT EXISTS (SELECT 1 FROM exercise_aliases WHERE exercise_id = v_veslo_id AND alias_normalized = 'rowing');
    INSERT INTO exercise_aliases (exercise_id, alias_name, alias_normalized, language) SELECT v_veslo_id, 'rower', 'rower', 'en' WHERE NOT EXISTS (SELECT 1 FROM exercise_aliases WHERE exercise_id = v_veslo_id AND alias_normalized = 'rower');
    INSERT INTO exercise_aliases (exercise_id, alias_name, alias_normalized, language) SELECT v_veslo_id, 'concept2', 'concept2', 'en' WHERE NOT EXISTS (SELECT 1 FROM exercise_aliases WHERE exercise_id = v_veslo_id AND alias_normalized = 'concept2');
    INSERT INTO exercise_aliases (exercise_id, alias_name, alias_normalized, language) SELECT v_veslo_id, 'erg', 'erg', 'en' WHERE NOT EXISTS (SELECT 1 FROM exercise_aliases WHERE exercise_id = v_veslo_id AND alias_normalized = 'erg');
    INSERT INTO exercise_muscle_groups (exercise_id, muscle_group_id, role) SELECT v_veslo_id, v_back_horiz_id, 'primary' WHERE v_back_horiz_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM exercise_muscle_groups WHERE exercise_id = v_veslo_id AND muscle_group_id = v_back_horiz_id);
    INSERT INTO exercise_muscle_groups (exercise_id, muscle_group_id, role) SELECT v_veslo_id, v_quads_id, 'secondary' WHERE v_quads_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM exercise_muscle_groups WHERE exercise_id = v_veslo_id AND muscle_group_id = v_quads_id);
    INSERT INTO exercise_muscle_groups (exercise_id, muscle_group_id, role) SELECT v_veslo_id, v_core_anti_ext_id, 'secondary' WHERE v_core_anti_ext_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM exercise_muscle_groups WHERE exercise_id = v_veslo_id AND muscle_group_id = v_core_anti_ext_id);
    INSERT INTO exercise_tag_map (exercise_id, tag_id) SELECT v_veslo_id, v_kardio_tag_id WHERE v_kardio_tag_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM exercise_tag_map WHERE exercise_id = v_veslo_id AND tag_id = v_kardio_tag_id);
    INSERT INTO exercise_tag_map (exercise_id, tag_id) SELECT v_veslo_id, v_kondice_tag_id WHERE v_kondice_tag_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM exercise_tag_map WHERE exercise_id = v_veslo_id AND tag_id = v_kondice_tag_id);
  END IF;

  -- BĚŽECKÝ PÁS
  IF v_treadmill_id IS NOT NULL THEN
    INSERT INTO exercise_aliases (exercise_id, alias_name, alias_normalized, language) SELECT v_treadmill_id, 'treadmill', 'treadmill', 'en' WHERE NOT EXISTS (SELECT 1 FROM exercise_aliases WHERE exercise_id = v_treadmill_id AND alias_normalized = 'treadmill');
    INSERT INTO exercise_aliases (exercise_id, alias_name, alias_normalized, language) SELECT v_treadmill_id, 'pás', 'pas', 'cs' WHERE NOT EXISTS (SELECT 1 FROM exercise_aliases WHERE exercise_id = v_treadmill_id AND alias_normalized = 'pas');
    INSERT INTO exercise_aliases (exercise_id, alias_name, alias_normalized, language) SELECT v_treadmill_id, 'běh na páse', 'beh na pase', 'cs' WHERE NOT EXISTS (SELECT 1 FROM exercise_aliases WHERE exercise_id = v_treadmill_id AND alias_normalized = 'beh na pase');
    INSERT INTO exercise_muscle_groups (exercise_id, muscle_group_id, role) SELECT v_treadmill_id, v_quads_id, 'primary' WHERE v_quads_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM exercise_muscle_groups WHERE exercise_id = v_treadmill_id AND muscle_group_id = v_quads_id);
    INSERT INTO exercise_muscle_groups (exercise_id, muscle_group_id, role) SELECT v_treadmill_id, v_hamstrings_id, 'primary' WHERE v_hamstrings_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM exercise_muscle_groups WHERE exercise_id = v_treadmill_id AND muscle_group_id = v_hamstrings_id);
    INSERT INTO exercise_muscle_groups (exercise_id, muscle_group_id, role) SELECT v_treadmill_id, v_calves_id, 'secondary' WHERE v_calves_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM exercise_muscle_groups WHERE exercise_id = v_treadmill_id AND muscle_group_id = v_calves_id);
    INSERT INTO exercise_tag_map (exercise_id, tag_id) SELECT v_treadmill_id, v_kardio_tag_id WHERE v_kardio_tag_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM exercise_tag_map WHERE exercise_id = v_treadmill_id AND tag_id = v_kardio_tag_id);
  END IF;

  -- ŠVIHADLO
  IF v_rope_id IS NOT NULL THEN
    INSERT INTO exercise_aliases (exercise_id, alias_name, alias_normalized, language) SELECT v_rope_id, 'jump rope', 'jump rope', 'en' WHERE NOT EXISTS (SELECT 1 FROM exercise_aliases WHERE exercise_id = v_rope_id AND alias_normalized = 'jump rope');
    INSERT INTO exercise_aliases (exercise_id, alias_name, alias_normalized, language) SELECT v_rope_id, 'double unders', 'double unders', 'en' WHERE NOT EXISTS (SELECT 1 FROM exercise_aliases WHERE exercise_id = v_rope_id AND alias_normalized = 'double unders');
    INSERT INTO exercise_aliases (exercise_id, alias_name, alias_normalized, language) SELECT v_rope_id, 'skákání', 'skakani', 'cs' WHERE NOT EXISTS (SELECT 1 FROM exercise_aliases WHERE exercise_id = v_rope_id AND alias_normalized = 'skakani');
    INSERT INTO exercise_muscle_groups (exercise_id, muscle_group_id, role) SELECT v_rope_id, v_calves_id, 'primary' WHERE v_calves_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM exercise_muscle_groups WHERE exercise_id = v_rope_id AND muscle_group_id = v_calves_id);
    INSERT INTO exercise_muscle_groups (exercise_id, muscle_group_id, role) SELECT v_rope_id, v_core_anti_ext_id, 'secondary' WHERE v_core_anti_ext_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM exercise_muscle_groups WHERE exercise_id = v_rope_id AND muscle_group_id = v_core_anti_ext_id);
    INSERT INTO exercise_tag_map (exercise_id, tag_id) SELECT v_rope_id, v_kardio_tag_id WHERE v_kardio_tag_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM exercise_tag_map WHERE exercise_id = v_rope_id AND tag_id = v_kardio_tag_id);
    INSERT INTO exercise_tag_map (exercise_id, tag_id) SELECT v_rope_id, v_plyo_tag_id WHERE v_plyo_tag_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM exercise_tag_map WHERE exercise_id = v_rope_id AND tag_id = v_plyo_tag_id);
  END IF;

  -- SKILLUP
  IF v_skillup_id IS NOT NULL THEN
    INSERT INTO exercise_aliases (exercise_id, alias_name, alias_normalized, language) SELECT v_skillup_id, 'skill up', 'skill up', 'en' WHERE NOT EXISTS (SELECT 1 FROM exercise_aliases WHERE exercise_id = v_skillup_id AND alias_normalized = 'skill up');
    INSERT INTO exercise_aliases (exercise_id, alias_name, alias_normalized, language) SELECT v_skillup_id, 'kondiční stroj', 'kondicni stroj', 'cs' WHERE NOT EXISTS (SELECT 1 FROM exercise_aliases WHERE exercise_id = v_skillup_id AND alias_normalized = 'kondicni stroj');
    INSERT INTO exercise_muscle_groups (exercise_id, muscle_group_id, role) SELECT v_skillup_id, v_quads_id, 'primary' WHERE v_quads_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM exercise_muscle_groups WHERE exercise_id = v_skillup_id AND muscle_group_id = v_quads_id);
    INSERT INTO exercise_muscle_groups (exercise_id, muscle_group_id, role) SELECT v_skillup_id, v_core_lateral_id, 'secondary' WHERE v_core_lateral_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM exercise_muscle_groups WHERE exercise_id = v_skillup_id AND muscle_group_id = v_core_lateral_id);
    INSERT INTO exercise_tag_map (exercise_id, tag_id) SELECT v_skillup_id, v_kondice_tag_id WHERE v_kondice_tag_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM exercise_tag_map WHERE exercise_id = v_skillup_id AND tag_id = v_kondice_tag_id);
    INSERT INTO exercise_tag_map (exercise_id, tag_id) SELECT v_skillup_id, v_kardio_tag_id WHERE v_kardio_tag_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM exercise_tag_map WHERE exercise_id = v_skillup_id AND tag_id = v_kardio_tag_id);
  END IF;
END $$;