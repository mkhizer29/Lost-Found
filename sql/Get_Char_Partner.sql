CREATE OR REPLACE FUNCTION GET_CHAT_PARTNER(
    p_claim_id IN NUMBER,
    p_viewer_id IN NUMBER
) RETURN VARCHAR2 IS
    v_claimant_id NUMBER;
    v_reporter_id NUMBER;
    v_partner_name VARCHAR2(100);
BEGIN
    -- 1. Get the Claimant ID and Reporter ID for this claim
    SELECT c.claimant_id, r.reporter_id
    INTO v_claimant_id, v_reporter_id
    FROM CLAIM c
    JOIN ITEM i ON c.item_id = i.item_id
    JOIN REPORT r ON i.item_id = r.item_id
    WHERE c.claim_id = p_claim_id;

    -- 2. Logic: Who is the "Other" person?
    IF p_viewer_id = v_claimant_id THEN
        -- I am the Claimant, so I want the Reporter's Name
        SELECT full_name INTO v_partner_name FROM APP_USER WHERE user_id = v_reporter_id;
        
    ELSIF p_viewer_id = v_reporter_id THEN
        -- I am the Reporter, so I want the Claimant's Name
        SELECT full_name INTO v_partner_name FROM APP_USER WHERE user_id = v_claimant_id;
        
    ELSE
        -- I am neither (maybe Admin)
        v_partner_name := 'System Admin';
    END IF;

    RETURN v_partner_name;

EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RETURN 'Unknown User';
    WHEN OTHERS THEN
        RETURN 'Error';
END;
/