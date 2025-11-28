SET DEFINE OFF;

------------------------------------------------------------
-- 05_business_rules.sql
-- Business rules implemented via triggers:
--  1) When a claim status changes, update item status and
--     send notifications.
--  2) When a new message is inserted, send notification
--     to the receiver.
------------------------------------------------------------

------------------------------------------------------------
-- Trigger 1: CLAIM status change
--  - Fires AFTER UPDATE OF status on CLAIM
--  - If status actually changed:
--      * If APPROVED  -> set ITEM.status = 'CLAIMED'
--      * If REJECTED/CANCELLED -> leave ITEM.status as is (OPEN/PENDING/etc.)
--      * Insert NOTIFICATION for the claimant (CLAIM_STATUS)
------------------------------------------------------------
CREATE OR REPLACE TRIGGER trg_claim_status_notify
AFTER UPDATE OF status ON CLAIM
FOR EACH ROW
DECLARE
  v_item_title   ITEM.title%TYPE;
  v_reporter_id  APP_USER.user_id%TYPE;
BEGIN
  -- If status didn't change, do nothing
  IF :NEW.status = :OLD.status THEN
    RETURN;
  END IF;

  -- Get item title and reporter (person who found/reported the item)
  BEGIN
    SELECT i.title, r.reporter_id
      INTO v_item_title, v_reporter_id
      FROM ITEM i
      JOIN REPORT r
        ON r.item_id = i.item_id
     WHERE i.item_id = :NEW.item_id
       AND r.is_active = 'Y';
  EXCEPTION
    WHEN NO_DATA_FOUND THEN
      -- Should not happen in normal flow; just ignore
      NULL;
  END;

  -- Update item status depending on claim status
  IF :NEW.status = 'APPROVED' THEN
    UPDATE ITEM
       SET status = 'CLAIMED'
     WHERE item_id = :NEW.item_id;
  ELSIF :NEW.status IN ('REJECTED', 'CANCELLED') THEN
    -- You can choose to set back to OPEN or leave as is.
    -- Example: leave as is (maybe still other claims).
    NULL;
  END IF;

  -- Insert notification for the claimant
  INSERT INTO NOTIFICATION
    (user_id,
     type,
     reference_type,
     reference_id,
     message,
     is_read)
  VALUES
    (:NEW.claimant_id,
     'CLAIM_STATUS',
     'CLAIM',
     :NEW.claim_id,
     'Your claim on item "' || v_item_title || '" is now ' || :NEW.status || '.',
     'N');

  -- (Optional) Also notify the reporter if you want
  IF v_reporter_id IS NOT NULL THEN
    INSERT INTO NOTIFICATION
      (user_id,
       type,
       reference_type,
       reference_id,
       message,
       is_read)
    VALUES
      (v_reporter_id,
       'CLAIM_STATUS',
       'CLAIM',
       :NEW.claim_id,
       'The claim status on your found item "' || v_item_title || '" is now ' || :NEW.status || '.',
       'N');
  END IF;
END;
/
SHOW ERRORS TRIGGER trg_claim_status_notify;


------------------------------------------------------------
-- Trigger 2: MESSAGE insert
--  - Fires AFTER INSERT on MESSAGE
--  - Creates a NEW_MESSAGE notification for receiver
------------------------------------------------------------
CREATE OR REPLACE TRIGGER trg_message_new_notify
AFTER INSERT ON MESSAGE
FOR EACH ROW
DECLARE
  v_item_title ITEM.title%TYPE;
BEGIN
  -- Optional: get item title for a nicer message
  BEGIN
    SELECT i.title
      INTO v_item_title
      FROM CLAIM c
      JOIN ITEM i
        ON c.item_id = i.item_id
     WHERE c.claim_id = :NEW.claim_id;
  EXCEPTION
    WHEN NO_DATA_FOUND THEN
      v_item_title := NULL;
  END;

  INSERT INTO NOTIFICATION
    (user_id,
     type,
     reference_type,
     reference_id,
     message,
     is_read)
  VALUES
    (:NEW.receiver_id,
     'NEW_MESSAGE',
     'MESSAGE',
     :NEW.message_id,
     CASE
       WHEN v_item_title IS NOT NULL THEN
         'You have a new message about item "' || v_item_title || '".'
       ELSE
         'You have a new message on your claim.'
     END,
     'N');
END;
/
SHOW ERRORS TRIGGER trg_message_new_notify;
