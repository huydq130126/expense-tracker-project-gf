import firebase_admin
import pyrebase
from firebase_admin import credentials, firestore
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

def initialize_firebase():
    """Initialize Firebase Admin SDK."""
    try:
        # Check if already initialized
        if not firebase_admin._apps:
            cred = credentials.Certificate(settings.firebase_service_account_path)
            firebase_admin.initialize_app(cred)
            logger.info("Firebase Admin SDK initialized successfully.")
        else:
            logger.info("Firebase Admin SDK already initialized.")
    except Exception as e:
        logger.error(f"Error initializing Firebase Admin SDK: {e}")

def get_firestore_client():
    return firestore.client()

_pyrebase_auth = None
def get_pyrebase_auth():
    global _pyrebase_auth
    if _pyrebase_auth is None:
        firebase_cfg = {
            "apiKey": settings.firebase_api_key,
            "authDomain": settings.firebase_auth_domain,
            "databaseURL": settings.firebase_database_url,
            "projectId": settings.firebase_project_id,
            "storageBucket": settings.firebase_storage_bucket,
            "messagingSenderId": settings.firebase_messaging_sender_id,
            "appId": settings.firebase_app_id
        }
        firebase_app = pyrebase.initialize_app(firebase_cfg)
        _pyrebase_auth = firebase_app.auth()
    return _pyrebase_auth