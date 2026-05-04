from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    firebase_service_account_path: str = "../firebase_service_account.json"
    firebase_api_key: str
    firebase_auth_domain: str
    firebase_project_id: str
    firebase_storage_bucket: str
    firebase_messaging_sender_id: str
    firebase_app_id: str
    firebase_database_url: str = ""
    
    google_client_id: str
    google_client_secret: str
    google_redirect_uri: str
    frontend_url: str

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding = "utf-8")

settings = Settings()