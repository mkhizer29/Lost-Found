CREATE TABLE APP_USER (
  user_id        NUMBER GENERATED ALWAYS AS IDENTITY
                 PRIMARY KEY,
  full_name      VARCHAR2(100)      NOT NULL,
  email          VARCHAR2(150)      NOT NULL,
  password_hash  VARCHAR2(200)      NOT NULL,
  role           VARCHAR2(20)       NOT NULL,
  department     VARCHAR2(100),
  status         VARCHAR2(20)       DEFAULT 'ACTIVE' NOT NULL,
  created_at     TIMESTAMP          DEFAULT SYSTIMESTAMP NOT NULL,
  
  CONSTRAINT uq_app_user_email UNIQUE (email),
  CONSTRAINT ck_app_user_email_domain 
    CHECK (LOWER(email) LIKE '%@iba.edu.pk'),
  CONSTRAINT ck_app_user_role
    CHECK (role IN ('STUDENT', 'STAFF', 'ADMIN')),
  CONSTRAINT ck_app_user_status
    CHECK (status IN ('ACTIVE', 'BLOCKED'))
);

-- Putting constraint so user may choose department from selected options
ALTER TABLE APP_USER
  ADD CONSTRAINT ck_app_user_department
  CHECK (department IN (
    'BBA',
    'BS Accounting & Finance',
    'BS Business Analytics',
    'BS Computer Science',
    'BS Economics',
    'BS Economics & Mathematics',
    'BS Social Sciences & Liberal Arts',
    'MBA',
    'MBA Executive',
    'MS Computer Science',
    'MS Economics',
    'MS Finance',
    'MS Mathematics',
    'MS Data Science',
    'MS Islamic Banking & Finance',
    'MS Management',
    'MS Journalism',
    'MS Development Studies',
    'PhD Computer Science',
    'PhD Economics',
    'PhD Mathematics',
    'PhD Finance',
    'PhD Management',
    'Administration',
    'IT Services',
    'Library',
    'Security',
    'Exams Office'
  ));

CREATE TABLE CATEGORY (
  category_id  NUMBER GENERATED ALWAYS AS IDENTITY
               PRIMARY KEY,
  name         VARCHAR2(50)  NOT NULL,
  description  VARCHAR2(255),
  is_active    CHAR(1)       DEFAULT 'Y' NOT NULL,
  
  CONSTRAINT uq_category_name UNIQUE (name),
  CONSTRAINT ck_category_active
    CHECK (is_active IN ('Y','N'))
);

CREATE TABLE LOCATION (
  location_id  NUMBER GENERATED ALWAYS AS IDENTITY
               PRIMARY KEY,
  name         VARCHAR2(100) NOT NULL,
  description  VARCHAR2(255),
  is_active    CHAR(1)       DEFAULT 'Y' NOT NULL,

  CONSTRAINT uq_location_name UNIQUE (name),
  CONSTRAINT ck_location_active
    CHECK (is_active IN ('Y','N'))
);

CREATE TABLE ITEM (
  item_id        NUMBER GENERATED ALWAYS AS IDENTITY
                 PRIMARY KEY,
  title          VARCHAR2(150)    NOT NULL,
  description    VARCHAR2(1000),
  category_id    NUMBER           NOT NULL,
  primary_color  VARCHAR2(50),
  brand          VARCHAR2(100),
  unique_marks   VARCHAR2(255),
  image_url      VARCHAR2(500),
  status         VARCHAR2(20)     DEFAULT 'OPEN' NOT NULL,
  created_at     TIMESTAMP        DEFAULT SYSTIMESTAMP NOT NULL,
  created_by     NUMBER           NOT NULL,

  CONSTRAINT ck_item_status
    CHECK (status IN ('OPEN', 'MATCHED', 'CLAIMED', 'RETURNED', 'ARCHIVED')),
  CONSTRAINT fk_item_category
    FOREIGN KEY (category_id)
    REFERENCES CATEGORY (category_id),
  CONSTRAINT fk_item_created_by
    FOREIGN KEY (created_by)
    REFERENCES APP_USER (user_id)
);

CREATE TABLE REPORT (
  report_id        NUMBER GENERATED ALWAYS AS IDENTITY
                   PRIMARY KEY,
  item_id          NUMBER        NOT NULL,
  reporter_id      NUMBER        NOT NULL,
  report_type      VARCHAR2(10)  NOT NULL,
  location_id      NUMBER        NOT NULL,
  event_datetime   TIMESTAMP,
  additional_details VARCHAR2(1000),
  created_at       TIMESTAMP     DEFAULT SYSTIMESTAMP NOT NULL,
  is_active        CHAR(1)       DEFAULT 'Y' NOT NULL,

  CONSTRAINT uq_report_item UNIQUE (item_id),
  CONSTRAINT ck_report_type
    CHECK (report_type IN ('LOST','FOUND')),
  CONSTRAINT ck_report_active
    CHECK (is_active IN ('Y','N')),
  CONSTRAINT fk_report_item
    FOREIGN KEY (item_id)
    REFERENCES ITEM (item_id),
  CONSTRAINT fk_report_reporter
    FOREIGN KEY (reporter_id)
    REFERENCES APP_USER (user_id),
  CONSTRAINT fk_report_location
    FOREIGN KEY (location_id)
    REFERENCES LOCATION (location_id)
);

CREATE TABLE CLAIM (
  claim_id      NUMBER GENERATED ALWAYS AS IDENTITY
                PRIMARY KEY,
  item_id       NUMBER         NOT NULL,
  claimant_id   NUMBER         NOT NULL,
  claim_message VARCHAR2(1000),
  status        VARCHAR2(20)   DEFAULT 'PENDING' NOT NULL,
  created_at    TIMESTAMP      DEFAULT SYSTIMESTAMP NOT NULL,
  reviewed_at   TIMESTAMP,
  reviewed_by   NUMBER,

  CONSTRAINT ck_claim_status
    CHECK (status IN ('PENDING','APPROVED','REJECTED','CANCELLED')),
  CONSTRAINT fk_claim_item
    FOREIGN KEY (item_id)
    REFERENCES ITEM (item_id),
  CONSTRAINT fk_claim_claimant
    FOREIGN KEY (claimant_id)
    REFERENCES APP_USER (user_id),
  CONSTRAINT fk_claim_reviewed_by
    FOREIGN KEY (reviewed_by)
    REFERENCES APP_USER (user_id)
);



CREATE TABLE CLAIM_EVIDENCE (
  evidence_id    NUMBER GENERATED ALWAYS AS IDENTITY
                 PRIMARY KEY,
  claim_id       NUMBER        NOT NULL,
  evidence_type  VARCHAR2(20)  NOT NULL,
  evidence_value VARCHAR2(1000),
  created_at     TIMESTAMP     DEFAULT SYSTIMESTAMP NOT NULL,

  CONSTRAINT ck_claim_evidence_type
    CHECK (evidence_type IN ('PHOTO','TEXT','FILE')),
  CONSTRAINT fk_claim_evidence_claim
    FOREIGN KEY (claim_id)
    REFERENCES CLAIM (claim_id)
);

CREATE TABLE MESSAGE (
  message_id   NUMBER GENERATED ALWAYS AS IDENTITY
               PRIMARY KEY,
  claim_id     NUMBER          NOT NULL,
  sender_id    NUMBER          NOT NULL,
  receiver_id  NUMBER          NOT NULL,
  body         VARCHAR2(2000)  NOT NULL,
  sent_at      TIMESTAMP       DEFAULT SYSTIMESTAMP NOT NULL,
  is_read      CHAR(1)         DEFAULT 'N' NOT NULL,

  CONSTRAINT ck_message_is_read
    CHECK (is_read IN ('Y','N')),
  CONSTRAINT fk_message_claim
    FOREIGN KEY (claim_id)
    REFERENCES CLAIM (claim_id),
  CONSTRAINT fk_message_sender
    FOREIGN KEY (sender_id)
    REFERENCES APP_USER (user_id),
  CONSTRAINT fk_message_receiver
    FOREIGN KEY (receiver_id)
    REFERENCES APP_USER (user_id)
);


CREATE TABLE NOTIFICATION (
  notification_id  NUMBER GENERATED ALWAYS AS IDENTITY
                   PRIMARY KEY,
  user_id          NUMBER        NOT NULL,
  type             VARCHAR2(30)  NOT NULL,
  reference_type   VARCHAR2(20),
  reference_id     NUMBER,
  message          VARCHAR2(500) NOT NULL,
  is_read          CHAR(1)       DEFAULT 'N' NOT NULL,
  created_at       TIMESTAMP     DEFAULT SYSTIMESTAMP NOT NULL,

  CONSTRAINT ck_notification_is_read
    CHECK (is_read IN ('Y','N')),
  CONSTRAINT ck_notification_type
    CHECK (type IN ('NEW_MATCH','CLAIM_STATUS','NEW_MESSAGE','SYSTEM')),
  CONSTRAINT ck_notification_ref_type
    CHECK (reference_type IS NULL 
           OR reference_type IN ('ITEM','CLAIM','MESSAGE')),
  CONSTRAINT fk_notification_user
    FOREIGN KEY (user_id)
    REFERENCES APP_USER (user_id)
);





