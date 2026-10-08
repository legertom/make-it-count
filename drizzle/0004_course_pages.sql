-- Three course pages were folded into their neighbours (why-scenario -> why-frame,
-- model-three -> model-desk, more-why -> more-ask). Point saved progress at the
-- replacement pages, then recompute furthest_index for the new page order so
-- "reached" counts and the home page's progress bar stay honest. The order here
-- mirrors CHAPTERS in lib/course-pages.ts at the time of this migration.
UPDATE "progress" SET
  "furthest_page" = CASE "furthest_page"
    WHEN 'why-scenario' THEN 'why-frame'
    WHEN 'model-three' THEN 'model-desk'
    WHEN 'more-why' THEN 'more-ask'
    ELSE "furthest_page" END,
  "current_page" = CASE "current_page"
    WHEN 'why-scenario' THEN 'why-frame'
    WHEN 'model-three' THEN 'model-desk'
    WHEN 'more-why' THEN 'more-ask'
    ELSE "current_page" END;
--> statement-breakpoint
UPDATE "progress" SET "furthest_index" = CASE "furthest_page"
  WHEN 'why-frame' THEN 0
  WHEN 'model-what' THEN 1
  WHEN 'model-desk' THEN 2
  WHEN 'habits-map' THEN 3
  WHEN 'h1' THEN 4
  WHEN 'h2' THEN 5
  WHEN 'h3a' THEN 6
  WHEN 'h3b' THEN 7
  WHEN 'h4a' THEN 8
  WHEN 'h4g' THEN 9
  WHEN 'h4b' THEN 10
  WHEN 'h4c' THEN 11
  WHEN 'h5' THEN 12
  WHEN 'burn-challenge' THEN 13
  WHEN 'burn-tools' THEN 14
  WHEN 'burn-surfaces' THEN 15
  WHEN 'burn-checks' THEN 16
  WHEN 'more-ask' THEN 17
  WHEN 'final' THEN 18
  WHEN 'done' THEN 19
  ELSE 0 END;
