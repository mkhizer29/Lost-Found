SET DEFINE OFF;
ALTER SESSION SET NLS_TIMESTAMP_FORMAT = 'DD-MON-YYYY HH24:MI';
ALTER SESSION SET NLS_DATE_FORMAT      = 'DD-MON-YYYY HH24:MI';
DECLARE
  v_ali_id           APP_USER.user_id%TYPE;
  v_sana_id          APP_USER.user_id%TYPE;
  v_admin_id         APP_USER.user_id%TYPE;

  v_cat_elec_id      CATEGORY.category_id%TYPE;
  v_cat_acc_id       CATEGORY.category_id%TYPE;

  v_loc_lib_id       LOCATION.location_id%TYPE;
  v_loc_cafe_id      LOCATION.location_id%TYPE;

  v_item_wallet_id   ITEM.item_id%TYPE;
  v_report_found_id  REPORT.report_id%TYPE;

  v_claim_id         CLAIM.claim_id%TYPE;

  v_evidence1_id     CLAIM_EVIDENCE.evidence_id%TYPE;
  v_evidence2_id     CLAIM_EVIDENCE.evidence_id%TYPE;

  v_msg1_id          MESSAGE.message_id%TYPE;
  v_notif1_id        NOTIFICATION.notification_id%TYPE;
BEGIN
  -----------------------------------------------------------------
  -- 1) Clean existing transactional data (KEEP CATEGORY/LOCATION)
  -----------------------------------------------------------------
  DELETE FROM NOTIFICATION;
  DELETE FROM MESSAGE;
  DELETE FROM CLAIM_EVIDENCE;
  DELETE FROM CLAIM;
  DELETE FROM REPORT;
  DELETE FROM ITEM;
  DELETE FROM APP_USER;
  -- DO NOT delete from LOCATION or CATEGORY here anymore

  -----------------------------------------------------------------
  -- 2) Users
  -----------------------------------------------------------------
  INSERT INTO APP_USER (full_name, email, password_hash, role, department)
  VALUES ('Ali Ahmed',
          'ali.ahmed@iba.edu.pk',
          'ali_pw_hash',
          'STUDENT',
          'BS Computer Science')
  RETURNING user_id INTO v_ali_id;

  INSERT INTO APP_USER (full_name, email, password_hash, role, department)
  VALUES ('Sana Khan',
          'sana.khan@iba.edu.pk',
          'sana_pw_hash',
          'STUDENT',
          'BBA')
  RETURNING user_id INTO v_sana_id;

  INSERT INTO APP_USER (full_name, email, password_hash, role, department)
  VALUES ('Admin User',
          'admin@iba.edu.pk',
          'admin_pw_hash',
          'ADMIN',
          'IT Services')
  RETURNING user_id INTO v_admin_id;

  -----------------------------------------------------------------
  -- 3) Get CATEGORY IDs from lookup table
  -----------------------------------------------------------------
  SELECT category_id
    INTO v_cat_elec_id
    FROM CATEGORY
   WHERE name = 'Electronics';

  SELECT category_id
    INTO v_cat_acc_id
    FROM CATEGORY
   WHERE name = 'Bags and Wallets';  -- name must match your lookup script

  -----------------------------------------------------------------
  -- 4) Get LOCATION IDs from lookup table
  -----------------------------------------------------------------
  SELECT location_id
    INTO v_loc_lib_id
    FROM LOCATION
   WHERE name = 'Library';           -- from lookup

  SELECT location_id
    INTO v_loc_cafe_id
    FROM LOCATION
   WHERE name = 'Pepsi Cafeteria';   -- from lookup

  -----------------------------------------------------------------
  -- 5) Found item (wallet) created by Sana
  -----------------------------------------------------------------
  INSERT INTO ITEM
    (title,
     description,
     category_id,
     primary_color,
     brand,
     unique_marks,
     image_url,
     status,
     created_by)
  VALUES
    ('Brown Leather Wallet',
     'Small brown leather wallet with zipper and a blue sticker inside.',
     v_cat_acc_id,
     'Brown',
     'Levis',
     'Blue sticker on inner pocket',
     'wallet1.png',
     'OPEN',
     v_sana_id)
  RETURNING item_id INTO v_item_wallet_id;

  -----------------------------------------------------------------
  -- 6) Found report for that item (reported by Sana at Pepsi Cafeteria)
  -----------------------------------------------------------------
  INSERT INTO REPORT
    (item_id,
     reporter_id,
     report_type,
     location_id,
     event_datetime,
     additional_details)
  VALUES
    (v_item_wallet_id,
     v_sana_id,
     'FOUND',
     v_loc_cafe_id,
     TRUNC(SYSTIMESTAMP - INTERVAL '2' HOUR),
     'Found on a table near the Pepsi counter.')
  RETURNING report_id INTO v_report_found_id;

  -----------------------------------------------------------------
  -- 7) Ali creates a claim on Sana''s found wallet
  -----------------------------------------------------------------
  INSERT INTO CLAIM
    (item_id,
     claimant_id,
     claim_message,
     status)
  VALUES
    (v_item_wallet_id,
     v_ali_id,
     'This looks like my wallet; it contains my CNIC and a PTCL card.',
     'PENDING')
  RETURNING claim_id INTO v_claim_id;

  -----------------------------------------------------------------
  -- 8) Claim evidence (text + photo)
  -----------------------------------------------------------------
  INSERT INTO CLAIM_EVIDENCE
    (claim_id, evidence_type, evidence_value)
  VALUES
    (v_claim_id,
     'TEXT',
     'Inside there is a blue sticker and a folded receipt from ABC Store.')
  RETURNING evidence_id INTO v_evidence1_id;

  INSERT INTO CLAIM_EVIDENCE
    (claim_id, evidence_type, evidence_value)
  VALUES
    (v_claim_id,
     'PHOTO',
     'wallet1.png')
  RETURNING evidence_id INTO v_evidence2_id;

  -----------------------------------------------------------------
  -- 9) Message from Ali to Sana about the claim
  -----------------------------------------------------------------
  INSERT INTO MESSAGE
    (claim_id,
     sender_id,
     receiver_id,
     body)
  VALUES
    (v_claim_id,
     v_ali_id,
     v_sana_id,
     'Hi, I think this wallet is mine. Can we meet near the CS Building to verify?')
  RETURNING message_id INTO v_msg1_id;

  -----------------------------------------------------------------
  -- 10) Notification to Sana about the new claim
  -----------------------------------------------------------------
  INSERT INTO NOTIFICATION
    (user_id,
     type,
     reference_type,
     reference_id,
     message,
     is_read)
  VALUES
    (v_sana_id,
     'SYSTEM',
     'CLAIM',
     v_claim_id,
     'A new claim has been submitted on your found item: Brown Leather Wallet.',
     'N')
  RETURNING notification_id INTO v_notif1_id;

  COMMIT;
END;
/
-- Quick sanity checks
SELECT * FROM APP_USER;
SELECT * FROM ITEM;
SELECT * FROM CLAIM;
SELECT * FROM MESSAGE;
SELECT * FROM NOTIFICATION;
SELECT * FROM CATEGORY;
SELECT * FROM LOCATION;
