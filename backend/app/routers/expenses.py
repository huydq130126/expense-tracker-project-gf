from fastapi import APIRouter, Depends
from typing import List
from fastapi import HTTPException
from app.schemas.expense import ExpenseCreate, ExpenseResponse
from app.routers.auth import get_current_user
from app.core.firebase import get_firestore_client

router = APIRouter(prefix="/expenses", tags=["Expenses"])

#Add expense API
@router.post("/", response_model=ExpenseResponse)
def add_expense(
    expense :ExpenseCreate,
    current_user: dict = Depends(get_current_user)
):
    db = get_firestore_client()
    user_id = current_user["uid"]
    expense_data = expense.model_dump()
    expense_data["user_id"] = user_id
    _, doc_ref = db.collection("expenses").add(expense_data)
    return {**expense_data, "id": doc_ref.id}


#Get expense list API
@router.get("/", response_model = List[ExpenseResponse])
def get_expenses(current_user: dict = Depends(get_current_user)):
    db = get_firestore_client()
    user_id = current_user["uid"]

    docs = db.collection("expenses").where("user_id", "==", user_id).stream()
    expenses_list = []

    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        expenses_list.append(data)
    return expenses_list

@router.delete("/{expense_id}")
def delete_expense(expense_id: str, current_user: dict = Depends(get_current_user)):
    db = get_firestore_client()
    doc_ref = db.collection("expenses").document(expense_id)
    doc = doc_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Expense not found")
    if doc.to_dict().get("user_id") != current_user["uid"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    doc_ref.delete()
    return {"message": "Deleted successfully"}
