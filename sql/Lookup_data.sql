------------------------------------------------------------
-- 03_insert_lookup_data.sql
-- Purpose:
--   Seed lookup tables (CATEGORY, LOCATION) with standard
--   values for the Lost & Found system at IBA.
--
-- How to use:
--   - Run AFTER 02_create_tables.sql
--   - Run BEFORE inserting any ITEM / REPORT / CLAIM data
------------------------------------------------------------

-- Optional: clear existing lookup data if safe to do so
-- (uncomment only if there is no important data depending on it)
-- DELETE FROM LOCATION;
-- DELETE FROM CATEGORY;
------------------------------------------------------------
-- Insert CATEGORY lookup values
------------------------------------------------------------

INSERT INTO CATEGORY (name, description, is_active) VALUES
  ('Electronics',       'Phones, laptops, headphones, chargers, etc.',          'Y');

INSERT INTO CATEGORY (name, description, is_active) VALUES
  ('Bags and Wallets',    'Backpacks, handbags, purses, wallets, etc.',           'Y');

INSERT INTO CATEGORY (name, description, is_active) VALUES
  ('Books and Notebooks', 'Textbooks, notebooks, diaries, notes, etc.',           'Y');

INSERT INTO CATEGORY (name, description, is_active) VALUES
  ('ID and Documents',    'Student ID, CNIC, cards, important papers, etc.',      'Y');

INSERT INTO CATEGORY (name, description, is_active) VALUES
  ('Clothing',          'Jackets, hoodies, scarves, caps, etc.',                'Y');

INSERT INTO CATEGORY (name, description, is_active) VALUES
  ('Keys and Access Cards','Keys, RFID cards, access tags, etc.',                 'Y');

INSERT INTO CATEGORY (name, description, is_active) VALUES
  ('Stationery',        'Pens, markers, calculators, geometry boxes, etc.',     'Y');

INSERT INTO CATEGORY (name, description, is_active) VALUES
  ('Other',             'Items that do not fit in any other category.',         'Y');

------------------------------------------------------------
-- Insert LOCATION lookup values (IBA Main Campus locations)
------------------------------------------------------------

INSERT INTO LOCATION (name, description, is_active) VALUES
  ('Gate 1',              'Main entry gate for access to the IBA main campus.',                             'Y');

INSERT INTO LOCATION (name, description, is_active) VALUES
  ('Gate 2',              'Secondary campus gate used for student and visitor entry.',                      'Y');

INSERT INTO LOCATION (name, description, is_active) VALUES
  ('Gate 3',              'Additional campus access gate near academic and sports areas.',                  'Y');

INSERT INTO LOCATION (name, description, is_active) VALUES
  ('Gate 4',              'Back side campus gate mainly for service and limited access.',                   'Y');

INSERT INTO LOCATION (name, description, is_active) VALUES
  ('Library',             'Mian Abdullah Library building with study spaces and academic resources.',       'Y');

INSERT INTO LOCATION (name, description, is_active) VALUES
  ('Adamjee Building',    'Adamjee Academic Center with classrooms, seminar rooms and labs.',               'Y');

INSERT INTO LOCATION (name, description, is_active) VALUES
  ('Tabba Building North','North wing of Abdul Razzak Tabba Building with computing labs and teaching rooms.','Y');

INSERT INTO LOCATION (name, description, is_active) VALUES
  ('Tabba Building South','South wing of Abdul Razzak Tabba Building with labs, classrooms and breakout spaces.','Y');

INSERT INTO LOCATION (name, description, is_active) VALUES
  ('Fauji Lawn',          'Open green lawn near Fauji Foundation Building used for outdoor events.',        'Y');

INSERT INTO LOCATION (name, description, is_active) VALUES
  ('Fauji Building',      'Fauji Foundation academic building with specialist labs and teaching facilities.','Y');

INSERT INTO LOCATION (name, description, is_active) VALUES
  ('Aman Building',       'Aman Center for Entrepreneurial Development with business classrooms and modern labs.','Y');

INSERT INTO LOCATION (name, description, is_active) VALUES
  ('OBS Courtyard',       'Open air courtyard between Adamjee, Tabba and Aman buildings used as a social study space.','Y');

INSERT INTO LOCATION (name, description, is_active) VALUES
  ('Pepsi Cafeteria',     'Main Pepsi dining hall at Alumni Students Center serving meals and snacks.',     'Y');

INSERT INTO LOCATION (name, description, is_active) VALUES
  ('Student Centre',      'Alumni Students Center with event hall, lounges, gyms and indoor sports facilities.','Y');

INSERT INTO LOCATION (name, description, is_active) VALUES
  ('Gani Tayub Auditorium','Large auditorium at main campus used for talks, seminars and conferences.',     'Y');

INSERT INTO LOCATION (name, description, is_active) VALUES
  ('Faculty Parking',     'Designated parking area reserved for faculty and staff vehicles on campus.',     'Y');

INSERT INTO LOCATION (name, description, is_active) VALUES
  ('Student Parking',     'Main parking area for student cars and motorbikes on campus.',                   'Y');

INSERT INTO LOCATION (name, description, is_active) VALUES
  ('Cricket Ground',      'Cricket ground in UBL Sports Complex used for practice and matches with floodlights.','Y');

INSERT INTO LOCATION (name, description, is_active) VALUES
  ('Football Ground',     'Football ground with jogging track in UBL Sports Complex.',                      'Y');

INSERT INTO LOCATION (name, description, is_active) VALUES
  ('Tennis Court',        'Outdoor tennis courts in the sports complex suitable for evening play.',         'Y');

INSERT INTO LOCATION (name, description, is_active) VALUES
  ('Basketball Court',    'Outdoor basketball court in the sports complex used for training and tournaments.','Y');

INSERT INTO LOCATION (name, description, is_active) VALUES
  ('Organic Garden',      'Green area on campus used for small scale plantation and environment activities.','Y');

INSERT INTO LOCATION (name, description, is_active) VALUES
  ('Boys Prayer Hall',    'Indoor prayer hall reserved for male students and staff.',                       'Y');

INSERT INTO LOCATION (name, description, is_active) VALUES
  ('Girls Prayer Area',   'Dedicated prayer area for female students and staff.',                           'Y');

INSERT INTO LOCATION (name, description, is_active) VALUES
  ('Gatorade',            'Small Gatorade branded kiosk or stall near sports and student activity area.',   'Y');

INSERT INTO LOCATION (name, description, is_active) VALUES
  ('NBP Building',        'NBP technology building with hardware lab and IT facilities.',                   'Y');

INSERT INTO LOCATION (name, description, is_active) VALUES
  ('Construction Area',   'Area of campus currently under construction with restricted access.',            'Y');

COMMIT;
