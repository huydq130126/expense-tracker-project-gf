from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
import requests
from urllib.parse import urlencode
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth 
from app.core.config import settings
from app.schemas.auth import SignupRequest, LoginRequest, GoogleLoginRequest, AuthResponse
from app.core.firebase import get_pyrebase_auth 
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix = "/auth", tags = ["Authentication"])

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    try:
        decoded_token = auth.verify_id_token(token)
        return {
            "uid": decoded_token.get("uid"),
            "email" : decoded_token.get("email"),
            "token": token
        }
    except Exception as e:
        logger.error(f"Token check error: {e}")
        raise HTTPException(
            status_code = status.HTTP_401_UNAUTHORIZED,
            detail = "Invalid or expired token",
            headers = {"WWW-Authenticate": "Bearer"}
        )

@router.get("/me")
def get_my_profile(current_user: dict = Depends(get_current_user)):
    return {
        "message": "You have successfully logged in!",
        "user_info": current_user
    }

auth_client = get_pyrebase_auth()
@router.post("/signup")
def signup(payload: SignupRequest):
    try:
        auth_client.create_user_with_email_and_password(payload.email, payload.password)
        return {"message": "Signup Successfully"}
    except Exception as e:
        error_message = str(e)
        if "EMAIL_EXISTS" in error_message:
            detail = "This email is already registered. Please use a different email or sign in."
        elif "WEAK_PASSWORD" in error_message:
            detail = "Password is too weak. Please use at least 6 characters."
        elif "INVALID_EMAIL" in error_message:
            detail = "Invalid email format. Please check your email address."
        elif "TOO_MANY_ATTEMPTS_TRY_LATER" in error_message:
            detail = "Too many attempts. Please try again later."
        else:
            detail = "Registration failed. Please try again."
        logger.error(f"Signup error: {error_message}")
        raise HTTPException(status_code = 400, detail=detail)

@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest):
    try:
        user = auth_client.sign_in_with_email_and_password(payload.email, payload.password)
        return {
            "email": payload.email,
            "uid": user["localId"],
            "idToken": user["idToken"],
            "refreshToken": user.get("refreshToken")
        }
    except Exception as e:
        raise HTTPException(status_code = 401, detail = "Incorrect email or password")
    
@router.get("/google/start")
def google_oauth_start():
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent"
    }
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params)
    return RedirectResponse(url)

@router.get("/google/callback")
def google_oauth_callback(code: str):
    try:
        token_url = "https://oauth2.googleapis.com/token"
        token_data = {
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": settings.google_redirect_uri
        }
        res = requests.post(token_url, data=token_data)
        if not res.ok:
            raise Exception("Cannot get Google token")
        
        google_id_token = res.json().get("id_token")

        firebase_url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key={settings.firebase_api_key}"
        firebase_data = {
            "postBody": f"id_token={google_id_token}&providerId=google.com",
            "requestUri": "http://localhost",
            "returnIdpCredential": True,
            "returnSecureToken": True
        }
        fb_res = requests.post(firebase_url, json=firebase_data)
        if not fb_res.ok:
            raise Exception("Cannot sign in to Firebase")
        
        fb_data = fb_res.json()
        firebase_id_token = fb_data["idToken"]
        user_email = fb_data.get("email", "")

        redirect_url = f"{settings.frontend_url}?id_token={firebase_id_token}&email={user_email}"
        return RedirectResponse(redirect_url)

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))