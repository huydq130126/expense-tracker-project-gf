from pydantic import BaseModel
from typing import Optional

class ExpenseCreate(BaseModel):
    amount: float
    category: str
    description: Optional[str] = None
    date: str

class ExpenseResponse(BaseModel):
    id: str
    amount: float
    category: str
    description: Optional[str] = None
    date: str
    user_id: str