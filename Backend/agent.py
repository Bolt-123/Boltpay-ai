import os
import requests
import json
import time
import datetime
import base64
from typing import TypedDict
from langgraph.graph import StateGraph, START, END
from dotenv import load_dotenv

load_dotenv()

class AgentState(TypedDict):
    raw_prompt: str
    extracted_data: dict
    payment_link: str
    status: str

def extract_information(state: AgentState):
    print("\n[AGENT] Step 1: Extracting invoice details & categorizing via Gemini REST API...")
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY is missing from .env file")
        
    models_to_try = [
        "gemini-3.8-flash",
        "gemini-3.5-flash-lite",
        "gemini-3.6-flash"
    ]
    
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{
            "parts": [{"text": f"Extract invoice details and assign a tax/accounting category for this request: {state['raw_prompt']}"}]
        }],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": {
                "type": "OBJECT",
                "properties": {
                    "client_name": {"type": "STRING", "description": "Name of the client"},
                    "client_email": {"type": "STRING", "description": "Email of the client. If missing, use clientname@example.com"},
                    "amount": {"type": "NUMBER", "description": "Total monetary amount as a float"},
                    "description": {"type": "STRING", "description": "Short description of the service provided"},
                    "category": {
                        "type": "STRING", 
                        "description": "Standard accounting tax category (e.g., 'Design & Branding', 'Software Development', 'Marketing & Sales', 'Consulting', 'Legal Services')"
                    }
                },
                "required": ["client_name", "client_email", "amount", "description", "category"]
            }
        }
    }
    
    last_error = None
    for model in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        print(f"[AGENT] Attempting model '{model}'...")
        try:
            res = requests.post(url, headers=headers, json=payload, timeout=10)
            if res.status_code == 200:
                response_json = res.json()
                raw_text = response_json["candidates"][0]["content"]["parts"][0]["text"]
                extracted = json.loads(raw_text)
                print(f"[AGENT] Step 1 Complete via {model}: Extracted & Categorized -> {extracted}")
                return {
                    "extracted_data": extracted,
                    "status": "extracted"
                }
            elif res.status_code == 503:
                print(f"[AGENT] Model '{model}' hit a 503 load spike. Switching model...")
                last_error = f"503 load spike on {model}"
                continue
            else:
                last_error = f"Gemini API Error ({res.status_code}): {res.text}"
                continue
        except Exception as e:
            last_error = str(e)
            continue
            
    raise Exception(f"All Gemini endpoints failed. Last error: {last_error}")

def create_and_send_invoice(state: AgentState):
    print("[AGENT] Step 2: Authenticating with PayPal Sandbox...")
    extracted = state["extracted_data"]
    client_id = os.getenv("PAYPAL_CLIENT_ID")
    secret = os.getenv("PAYPAL_SECRET")
    
    auth = base64.b64encode(f"{client_id}:{secret}".encode()).decode()
    token_res = requests.post(
        "https://api-m.sandbox.paypal.com/v1/oauth2/token",
        headers={"Authorization": f"Basic {auth}", "Content-Type": "application/x-www-form-urlencoded"},
        data={"grant_type": "client_credentials"},
        timeout=20
    )
    
    if token_res.status_code != 200:
        raise Exception(f"PayPal Auth Failed ({token_res.status_code}): {token_res.text}")
        
    access_token = token_res.json().get("access_token")
    print("[AGENT] PayPal Auth Token acquired.")
    
    api_headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    print("[AGENT] Step 3: Creating draft invoice...")
    today_str = datetime.date.today().strftime("%Y-%m-%d")
    invoice_num = f"INV-{int(time.time())}"
    
    draft_payload = {
        "detail": {
            "invoice_number": invoice_num,
            "reference": "BOLTPAY-AI",
            "invoice_date": today_str,
            "currency_code": "USD",
            "note": extracted["description"]
        },
        "invoicer": {
            "name": {
                "given_name": "BoltPay",
                "surname": "Studio"
            }
        },
        "primary_recipients": [{
            "billing_info": {
                "email_address": extracted["client_email"]
            }
        }],
        "items": [{
            "name": extracted["description"],
            "quantity": "1",
            "unit_amount": {
                "currency_code": "USD",
                "value": f"{float(extracted['amount']):.2f}"
            }
        }]
    }
    
    draft_res = requests.post(
        "https://api-m.sandbox.paypal.com/v2/invoicing/invoices", 
        headers=api_headers, 
        json=draft_payload,
        timeout=20
    )
    
    if draft_res.status_code not in [200, 201]:
        raise Exception(f"PayPal Invoice Creation Failed ({draft_res.status_code}): {draft_res.text}")
        
    res_data = draft_res.json()
    
    invoice_id = res_data.get("id")
    if not invoice_id and "href" in res_data:
        invoice_id = res_data["href"].rstrip("/").split("/")[-1]
    if not invoice_id and "Location" in draft_res.headers:
        invoice_id = draft_res.headers["Location"].rstrip("/").split("/")[-1]
    if not invoice_id:
        invoice_id = invoice_num

    print(f"[AGENT] Draft Invoice Created (ID: {invoice_id}). Publishing invoice...")
    
    # Send without forcing email delivery to guarantee status moves to SENT/UNPAID
    requests.post(
        f"https://api-m.sandbox.paypal.com/v2/invoicing/invoices/{invoice_id}/send", 
        headers=api_headers, 
        json={"send_to_recipient": False},
        timeout=20
    )
    
    # Query invoice details to retrieve PayPal's active payer_view_url
    get_res = requests.get(
        f"https://api-m.sandbox.paypal.com/v2/invoicing/invoices/{invoice_id}",
        headers=api_headers,
        timeout=20
    )
    
    payment_link = f"https://www.sandbox.paypal.com/invoice/p/{invoice_id}"
    if get_res.status_code == 200:
        inv_details = get_res.json()
        meta = inv_details.get("detail", {}).get("metadata", {})
        payer_url = meta.get("payer_view_url") or meta.get("recipient_view_url")
        if payer_url:
            payment_link = payer_url
            print(f"[AGENT] Active Payer Link acquired: {payment_link}")

    print("[AGENT] Step 4 Complete: PayPal invoice generated and published.")
    
    return {
        "status": "sent",
        "payment_link": payment_link
    }

workflow = StateGraph(AgentState)
workflow.add_node("extract", extract_information)
workflow.add_node("paypal", create_and_send_invoice)

workflow.add_edge(START, "extract")
workflow.add_edge("extract", "paypal")
workflow.add_edge("paypal", END)

agent = workflow.compile()