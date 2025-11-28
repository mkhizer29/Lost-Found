SET DEFINE OFF;

------------------------------------------------------------
-- 04_example_queries.sql
-- Example SELECT queries for Lost & Found @ IBA
-- These match your planned app screens:
--   - Home / Browse
--   - My Lost / My Found
--   - My Claims
--   - Admin pending claims
------------------------------------------------------------

------------------------------------------------------------
-- 1) Home / Browse: list all OPEN or MATCHED items
--    with category, location, reporter and date/time
------------------------------------------------------------
SELECT
  i.item_id,
  i.title,
  i.status,
  c.name           AS category_name,
  l.name           AS location_name,
  r.report_type,
  r.event_datetime,
  u.full_name      AS reporter_name
FROM ITEM i
JOIN CATEGORY c
  ON i.category_id = c.category_id
JOIN REPORT r
  ON r.item_id = i.item_id
JOIN LOCATION l
  ON r.location_id = l.location_id
JOIN APP_USER u
  ON r.reporter_id = u.user_id
WHERE r.is_active = 'Y'
  AND i.status IN ('OPEN', 'MATCHED')
ORDER BY r.event_datetime DESC;


------------------------------------------------------------
-- 2) Browse with simple filters
--    Example: Electronics found at Pepsi Cafeteria
------------------------------------------------------------
SELECT
  i.item_id,
  i.title,
  c.name      AS category_name,
  l.name      AS location_name,
  r.report_type,
  r.event_datetime
FROM ITEM i
JOIN CATEGORY c
  ON i.category_id = c.category_id
JOIN REPORT r
  ON r.item_id = i.item_id
JOIN LOCATION l
  ON r.location_id = l.location_id
WHERE r.is_active = 'Y'
  AND i.status = 'OPEN'
  AND c.name = 'Electronics'
  AND l.name = 'Pepsi Cafeteria'
ORDER BY r.event_datetime DESC;


------------------------------------------------------------
-- 3) "My Lost" items for a given user (by email)
--    Example: Ali's lost reports (report_type = 'LOST')
------------------------------------------------------------
SELECT
  r.report_id,
  i.item_id,
  i.title,
  c.name       AS category_name,
  l.name       AS location_name,
  r.event_datetime,
  i.status     AS item_status
FROM REPORT r
JOIN ITEM i
  ON r.item_id = i.item_id
JOIN CATEGORY c
  ON i.category_id = c.category_id
JOIN LOCATION l
  ON r.location_id = l.location_id
JOIN APP_USER u
  ON r.reporter_id = u.user_id
WHERE u.email = 'ali.ahmed@iba.edu.pk'
  AND r.report_type = 'LOST'
  AND r.is_active = 'Y'
ORDER BY r.event_datetime DESC;


------------------------------------------------------------
-- 4) "My Found" items for a given user (by email)
--    Example: Sana's found reports (report_type = 'FOUND')
------------------------------------------------------------
SELECT
  r.report_id,
  i.item_id,
  i.title,
  c.name       AS category_name,
  l.name       AS location_name,
  r.event_datetime,
  i.status     AS item_status
FROM REPORT r
JOIN ITEM i
  ON r.item_id = i.item_id
JOIN CATEGORY c
  ON i.category_id = c.category_id
JOIN LOCATION l
  ON r.location_id = l.location_id
JOIN APP_USER u
  ON r.reporter_id = u.user_id
WHERE u.email = 'sana.khan@iba.edu.pk'
  AND r.report_type = 'FOUND'
  AND r.is_active = 'Y'
ORDER BY r.event_datetime DESC;


------------------------------------------------------------
-- 5) "My Claims" for a given user (by email)
--    Shows which item, who reported it, and claim status
------------------------------------------------------------
SELECT
  c.claim_id,
  c.status        AS claim_status,
  c.created_at    AS claim_created_at,
  i.item_id,
  i.title         AS item_title,
  rep_u.full_name AS reporter_name,
  rep_r.report_type,
  rep_r.event_datetime
FROM CLAIM c
JOIN ITEM i
  ON c.item_id = i.item_id
JOIN REPORT rep_r
  ON rep_r.item_id = i.item_id
JOIN APP_USER rep_u
  ON rep_r.reporter_id = rep_u.user_id
JOIN APP_USER claimant_u
  ON c.claimant_id = claimant_u.user_id
WHERE claimant_u.email = 'ali.ahmed@iba.edu.pk'
ORDER BY c.created_at DESC;


------------------------------------------------------------
-- 6) Admin view: all pending claims with item & users
------------------------------------------------------------
SELECT
  c.claim_id,
  c.status,
  c.created_at,
  i.item_id,
  i.title                   AS item_title,
  cat.name                  AS category_name,
  rep_u.full_name           AS reporter_name,
  rep_u.email               AS reporter_email,
  claimant_u.full_name      AS claimant_name,
  claimant_u.email          AS claimant_email
FROM CLAIM c
JOIN ITEM i
  ON c.item_id = i.item_id
JOIN CATEGORY cat
  ON i.category_id = cat.category_id
JOIN REPORT rep_r
  ON rep_r.item_id = i.item_id
JOIN APP_USER rep_u
  ON rep_r.reporter_id = rep_u.user_id
JOIN APP_USER claimant_u
  ON c.claimant_id = claimant_u.user_id
WHERE c.status = 'PENDING'
ORDER BY c.created_at;


------------------------------------------------------------
-- 7) Admin summary: items with number of claims
------------------------------------------------------------
SELECT
  i.item_id,
  i.title,
  cat.name     AS category_name,
  COUNT(c.claim_id) AS claim_count
FROM ITEM i
JOIN CATEGORY cat
  ON i.category_id = cat.category_id
LEFT JOIN CLAIM c
  ON c.item_id = i.item_id
GROUP BY i.item_id, i.title, cat.name
ORDER BY claim_count DESC, i.item_id;


------------------------------------------------------------
-- 8) Optional view: item overview for easier querying
------------------------------------------------------------
CREATE OR REPLACE VIEW V_ITEM_OVERVIEW AS
SELECT
  i.item_id,
  i.title,
  i.status,
  i.created_at,
  c.name                 AS category_name,
  l.name                 AS location_name,
  r.report_type,
  r.event_datetime,
  u.full_name            AS reporter_name,
  (
    SELECT COUNT(*)
    FROM CLAIM c2
    WHERE c2.item_id = i.item_id
  ) AS claim_count
FROM ITEM i
JOIN CATEGORY c
  ON i.category_id = c.category_id
JOIN REPORT r
  ON r.item_id = i.item_id
JOIN LOCATION l
  ON r.location_id = l.location_id
JOIN APP_USER u
  ON r.reporter_id = u.user_id
WHERE r.is_active = 'Y';


-- Quick check:
-- SELECT * FROM V_ITEM_OVERVIEW ORDER BY event_datetime DESC;
