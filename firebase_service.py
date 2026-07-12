import firebase_admin
from firebase_admin import credentials, messaging
import os

# Initialize Firebase Admin SDK
# You need a serviceAccountKey.json downloaded from Firebase Console
firebase_cert_path = os.getenv("FIREBASE_CERT_PATH", "serviceAccountKey.json")

# We wrap in a try-except because it will fail if the file doesn't exist
try:
    if os.path.exists(firebase_cert_path):
        cred = credentials.Certificate(firebase_cert_path)
        firebase_admin.initialize_app(cred)
        print("Firebase Admin initialized successfully.")
    else:
        print(f"Warning: Firebase certificate not found at {firebase_cert_path}. FCM notifications will fail.")
except Exception as e:
    print(f"Failed to initialize Firebase Admin: {e}")

def send_meeting_notification(client_fcm_token: str, lead_name: str, meeting_time: str):
    """
    Sends a push notification to the client's browser using FCM when a meeting is booked.
    """
    try:
        message = messaging.Message(
            notification=messaging.Notification(
                title='New Meeting Booked!',
                body=f'You have a new meeting with {lead_name} at {meeting_time}.',
            ),
            token=client_fcm_token,
        )

        # Send a message to the device corresponding to the provided registration token.
        response = messaging.send(message)
        print(f'Successfully sent FCM message: {response}')
        return response
    except Exception as e:
        print(f"Failed to send FCM notification: {e}")
        return None
