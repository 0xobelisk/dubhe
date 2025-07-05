#!/usr/bin/env python3
import psycopg2
import json
import select
import sys
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_notifications():
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("Error: DATABASE_URL not found in environment")
        return
    
    print(f"Connecting to database...")
    
    try:
        # Connect to database
        conn = psycopg2.connect(database_url)
        conn.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT)
        
        cursor = conn.cursor()
        
        # Listen to notification channels
        cursor.execute('LISTEN "store:all";')
        cursor.execute('LISTEN "table:store_encounter:change";')
        
        print("Listening for notifications on channels:")
        print("- store:all")
        print("- table:store_encounter:change")
        print("\nWaiting for notifications... (Press Ctrl+C to exit)")
        
        while True:
            # Wait for notifications
            if select.select([conn], [], [], 5) == ([], [], []):
                print(".", end="", flush=True)
                continue
            else:
                conn.poll()
                while conn.notifies:
                    notify = conn.notifies.pop(0)
                    print(f"\n📨 Received notification:")
                    print(f"  Channel: {notify.channel}")
                    print(f"  Payload: {notify.payload}")
                    
                    # Try to parse JSON payload
                    try:
                        payload_data = json.loads(notify.payload)
                        print(f"  Parsed data:")
                        for key, value in payload_data.items():
                            print(f"    {key}: {value}")
                    except json.JSONDecodeError:
                        print(f"  (Payload is not valid JSON)")
                    print("-" * 50)
                
    except KeyboardInterrupt:
        print("\n\nStopping notification listener...")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'conn' in locals():
            conn.close()
            print("Database connection closed.")

if __name__ == "__main__":
    test_notifications() 