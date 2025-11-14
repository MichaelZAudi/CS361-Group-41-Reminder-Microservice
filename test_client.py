import requests
import time

BASE_URL = 'http://localhost:3000'


def test_timed_reminder():
    print("\n--- Testing Timed Reminder ---")
    data = {'message': 'Test timed reminder', 'seconds': 5}
    response = requests.post(f'{BASE_URL}/reminders', json=data)
    result = response.json()
    
    if result.get('success'):
        reminder_id = result['reminder']['id']
        print(f"Created reminder ID: {reminder_id}")
        print("Waiting 5 seconds...")
        time.sleep(6)
        
        # Check if it fired
        response = requests.get(f'{BASE_URL}/reminders')
        reminders = response.json()
        reminder = next((r for r in reminders if r['id'] == reminder_id), None)
        
        if reminder and reminder.get('fired'):
            print(f"SUCCESS - Reminder fired: {reminder['message']}")
        else:
            print("FAILED - Reminder did not fire")
    else:
        print("Failed to create reminder")


def test_event_reminder():
    print("\n--- Testing Event Reminder ---")
    data = {'message': 'Test event reminder', 'eventName': 'test_event'}
    response = requests.post(f'{BASE_URL}/reminders/event', json=data)
    result = response.json()
    
    if result.get('success'):
        reminder_id = result['reminder']['id']
        print(f"Created event reminder ID: {reminder_id}")
        
        # Trigger the event
        print("Triggering event...")
        response = requests.post(f'{BASE_URL}/events/test_event')
        trigger_result = response.json()
        print(f"Triggered {trigger_result['remindersTriggered']} reminder(s)")
        
        # Verify it fired
        response = requests.get(f'{BASE_URL}/reminders')
        reminders = response.json()
        reminder = next((r for r in reminders if r['id'] == reminder_id), None)
        
        if reminder and reminder.get('fired'):
            print(f"SUCCESS - Event reminder fired: {reminder['message']}")
        else:
            print("FAILED - Event reminder did not fire")
    else:
        print("Failed to create event reminder")


def test_recurring_reminder():
    print("\n--- Testing Recurring Reminder ---")
    data = {'message': 'Test recurring reminder', 'duration_seconds': 2, 'recurrences': 3}
    response = requests.post(f'{BASE_URL}/reminders/recurring', json=data)
    result = response.json()
    
    if result.get('success'):
        reminder_id = result['reminder']['id']
        print(f"Created recurring reminder ID: {reminder_id}")
        print("Waiting for 3 recurrences (2 seconds each)...")
        
        time.sleep(7)
        
        # Check final status
        response = requests.get(f'{BASE_URL}/reminders')
        reminders = response.json()
        reminder = next((r for r in reminders if r['id'] == reminder_id), None)
        
        if reminder and reminder.get('remaining') == 0:
            print(f"SUCCESS - All recurrences completed: {reminder['message']}")
        else:
            print(f"FAILED - Remaining: {reminder.get('remaining') if reminder else 'N/A'}")
    else:
        print("Failed to create recurring reminder")


def test_get_all():
    print("\n--- Getting All Reminders ---")
    response = requests.get(f'{BASE_URL}/reminders')
    reminders = response.json()
    print(f"Total reminders: {len(reminders)}")
    
    for r in reminders:
        status = "FIRED" if r.get('fired') else "PENDING"
        print(f"  - [{status}] {r.get('message')}")


if __name__ == "__main__":
    print("Testing Reminder Microservice")
    print(f"Server: {BASE_URL}\n")
    
    try:
        test_timed_reminder()
        test_event_reminder()
        test_recurring_reminder()
        test_get_all()
        
        print("\nAll tests completed!")
        
    except requests.exceptions.ConnectionError:
        print("ERROR: Cannot connect to server. Is it running?")
    except Exception as e:
        print(f"ERROR: {e}")

