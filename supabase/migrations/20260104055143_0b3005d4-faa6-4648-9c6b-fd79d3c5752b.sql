-- Fix badges with 0 XP bonus - give them appropriate XP values
UPDATE badge_definitions SET xp_bonus = 30 WHERE id = 'milestone_25';
UPDATE badge_definitions SET xp_bonus = 40 WHERE id = 'milestone_50';
UPDATE badge_definitions SET xp_bonus = 30 WHERE id = 'streak_4';
UPDATE badge_definitions SET xp_bonus = 25 WHERE id = 'type_strength_20';
UPDATE badge_definitions SET xp_bonus = 20 WHERE id = 'special_comeback';
UPDATE badge_definitions SET xp_bonus = 25 WHERE id = 'special_hattrick';
UPDATE badge_definitions SET xp_bonus = 25 WHERE id = 'challenger';
UPDATE badge_definitions SET xp_bonus = 20 WHERE id = 'first_pr';
UPDATE badge_definitions SET xp_bonus = 25 WHERE id = 'training_pr';