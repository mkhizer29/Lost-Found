# IBA Lost & Found – Database

This repository contains the Oracle database design and scripts for an IBA campus Lost & Found system.

## Schema Overview

Main tables:

- `APP_USER` – users of the system (students, staff, admin)  
- `CATEGORY` – fixed list of item categories (Electronics, Bags and Wallets, etc.)  
- `LOCATION` – fixed list of IBA campus locations (Gate 1, Library, Pepsi Cafeteria, etc.)  
- `ITEM` – an item that has been reported lost/found  
- `REPORT` – a lost/found report linked to an item and a location  
- `CLAIM` – a claim made by a user on a found item  
- `CLAIM_EVIDENCE` – evidence (TEXT/PHOTO/FILE) submitted for a claim  
- `MESSAGE` – conversation messages between claimant and reporter  
- `NOTIFICATION` – system notifications (new claim, claim status, new message, etc.)

## SQL Scripts

All scripts are under the `sql/` folder.

1. `01_drop_tables.sql`  
   Drops all tables in the correct dependency order (used when resetting the schema).

2. `02_create_tables.sql`  
   Creates all tables, primary keys, foreign keys, and CHECK constraints.

3. `03_insert_lookup_data.sql`  
   Clears transactional data, then inserts lookup/master data:
   - IBA item categories
   - IBA campus locations

4. `04_insert_demo_scenario.sql`  
   Inserts a demo scenario:
   - Users: Ali (BS CS student), Sana (BBA student), Admin
   - Sana reports a found wallet at Pepsi Cafeteria
   - Ali submits a claim with evidence
   - A message and related notifications are created

5. `05_example_queries.sql`  
   Example SELECT queries for:
   - Browse items
   - My Lost / My Found
   - My Claims
   - Admin pending claims
   - Summary of items with claim counts
   - `V_ITEM_OVERVIEW` view

6. `06_business_rules.sql`  
   Implements business rules as triggers:
   - When claim status changes, update item status and send notifications.
   - When a message is inserted, automatically create a NEW_MESSAGE notification for the receiver.

## How to set up the database

In Oracle SQL Developer (or SQL*Plus), run the scripts in this order:

1. `02_create_tables.sql`
2. `03_insert_lookup_data.sql`
3. `04_insert_demo_scenario.sql` (optional but recommended for testing)
4. `06_business_rules.sql`
5. `05_example_queries.sql` (for testing and documentation)

After that, you can run the example queries or connect your application to this schema.
