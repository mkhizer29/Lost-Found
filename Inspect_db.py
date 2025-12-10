import oracledb
import os
from db import get_connection

def inspect_database():
    print("--- 🔍 STARTING LOST & FOUND DATABASE INSPECTION ---")
    
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # === DEFINING YOUR PROJECT SPECIFIC TABLES ===
        # We only want to see these tables, ignoring others in the schema.
        target_tables = [
            'APP_USER', 
            'CATEGORY', 
            'CLAIM', 
            'CLAIM_EVIDENCE', 
            'ITEM', 
            'LOCATION', 
            'MESSAGE', 
            'NOTIFICATION', 
            'REPORT'
        ]
        
        # Convert list to SQL format: 'TABLE1','TABLE2',...
        sql_table_list = "'" + "','".join(target_tables) + "'"

        # 1. Get ONLY specific tables
        print(f"\n[1] FETCHING PROJECT TABLES ({len(target_tables)} tables)...")
        
        cursor.execute(f"""
            SELECT table_name 
            FROM user_tables 
            WHERE table_name IN ({sql_table_list}) 
            ORDER BY table_name
        """)
        
        tables = [row[0] for row in cursor.fetchall()]
        
        if not tables:
            print("❌ No matching Lost & Found tables found! Check your table names.")
            return

        for table in tables:
            print(f"\n{'='*40}")
            print(f"📄 TABLE: {table}")
            print(f"{'='*40}")

            # 2. Get Columns for this table
            cursor.execute(f"""
                SELECT column_name, data_type, data_length, nullable, data_default
                FROM user_tab_columns
                WHERE table_name = :1
                ORDER BY column_id
            """, [table])
            
            columns = cursor.fetchall()
            print(f"{'Column Name':<25} | {'Type':<15} | {'Null?':<6} | {'Default'}")
            print("-" * 75)
            for col in columns:
                col_name = col[0]
                # Format type (e.g., VARCHAR2(255))
                data_type = f"{col[1]}({col[2]})" if col[1] in ['VARCHAR2', 'CHAR'] else col[1]
                nullable = "YES" if col[3] == 'Y' else "NO"
                # Clean up default value string
                default_val = str(col[4]).strip() if col[4] else "None"
                print(f"{col_name:<25} | {data_type:<15} | {nullable:<6} | {default_val}")

            # 3. Get Primary Keys
            cursor.execute(f"""
                SELECT cols.column_name
                FROM all_constraints cons, all_cons_columns cols
                WHERE cons.constraint_type = 'P'
                AND cons.constraint_name = cols.constraint_name
                AND cons.owner = cols.owner
                AND cols.table_name = :1
            """, [table])
            pk_rows = cursor.fetchall()
            if pk_rows:
                pks = [row[0] for row in pk_rows]
                print(f"\n🔑 PRIMARY KEY: {', '.join(pks)}")

            # 4. Get Foreign Keys
            cursor.execute(f"""
                SELECT a.column_name, c_pk.table_name, c_pk.constraint_name
                FROM all_cons_columns a
                JOIN all_constraints c ON a.owner = c.owner
                                      AND a.constraint_name = c.constraint_name
                JOIN all_constraints c_pk ON c.r_owner = c_pk.owner
                                         AND c.r_constraint_name = c_pk.constraint_name
                WHERE c.constraint_type = 'R'
                AND a.table_name = :1
            """, [table])
            
            fks = cursor.fetchall()
            if fks:
                print("🔗 FOREIGN KEYS:")
                for fk in fks:
                    print(f"   - {fk[0]} -> References {fk[1]}")

    except Exception as e:
        print(f"\n❌ ERROR: {e}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
        print("\n--- ✅ INSPECTION COMPLETE ---")

if __name__ == "__main__":
    inspect_database()