SET DEFINE OFF;

------------------------------------------------------------
-- Trigger_Testing.sql
-- Manual tests for:
--   1) trg_claim_status_notify
--   2) trg_message_new_notify
--
-- Run order (after schema setup):
--   1. Tables.sql
--   2. Lookup_datasql.sql
--   3. testing.sql
--   4. Business_rules.sql
--   5. Trigger_Testing.sql  (this file)
------------------------------------------------------------

------------------------------------------------------------
-- 1) Check current claim + item before status change
------------------------------------------------------------
SELECT c.claim_id,
       c.status       AS claim_status,
       c.item_id,
       i.title        AS item_title,
       i.status       AS item_status
FROM CLAIM c
JOIN ITEM i ON c.item_id = i.item_id;

------------------------------------------------------------
-- 2) Approve the claim (fires trg_claim_status_notify)
------------------------------------------------------------
UPDATE CLAIM
   SET status      = 'APPROVED',
       reviewed_at = SYSTIMESTAMP,
       reviewed_by = (SELECT user_id FROM APP_USER WHERE role = 'ADMIN')
 WHERE claim_id = (SELECT MIN(claim_id) FROM CLAIM);

COMMIT;

------------------------------------------------------------
-- 3) Check item + notifications after approval
------------------------------------------------------------
-- Item should now be CLAIMED
SELECT item_id, title, status FROM ITEM;

-- Claim should now be APPROVED
SELECT claim_id, status, reviewed_at, reviewed_by FROM CLAIM;

-- New CLAIM_STATUS notifications
SELECT notification_id,
       user_id,
       type,
       reference_type,
       reference_id,
       message,
       is_read,
       created_at
FROM NOTIFICATION
ORDER BY notification_id;

------------------------------------------------------------
-- 4) Insert a new message (fires trg_message_new_notify)
------------------------------------------------------------
INSERT INTO MESSAGE (claim_id, sender_id, receiver_id, body)
VALUES (
  (SELECT MIN(claim_id) FROM CLAIM),
  (SELECT user_id FROM APP_USER WHERE email = 'ali.ahmed@iba.edu.pk'),
  (SELECT user_id FROM APP_USER WHERE email = 'sana.khan@iba.edu.pk'),
  'Testing trigger: new message on the claim.'
);

COMMIT;

------------------------------------------------------------
-- 5) Check messages + NEW_MESSAGE notifications
------------------------------------------------------------
SELECT message_id,
       claim_id,
       sender_id,
       receiver_id,
       body,
       sent_at
FROM MESSAGE
ORDER BY message_id;

SELECT notification_id,
       user_id,
       type,
       reference_type,
       reference_id,
       message,
       is_read,
       created_at
FROM NOTIFICATION
ORDER BY notification_id;
