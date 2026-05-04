from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.firebase import initialize_firebase
from app.routers.auth import router as auth_router
from app.routers.expenses import router as expenses_router

initialize_firebase()
app = FastAPI(title = "Expense Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials = True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(auth_router)
app.include_router(expenses_router)
@app.get("/")
def read_root():
    return {"message": "Welcome to Expense Tracker API"}

@app.get("/health")
def health():
    return{"status": "OK"}