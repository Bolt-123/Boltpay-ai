from flask import Flask, request, jsonify
from flask_cors import CORS
from agent import agent
import json
import os
import re

app = Flask(__name__)
CORS(app)

DB_FILE = "invoices.json"

def load_db():
    if os.path.exists(DB_FILE):
        try:
            with open(DB_FILE, "r") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_db(db):
    with open(DB_FILE, "w") as f:
        json.dump(db, f, indent=4)

# Persistent database storage
invoice_db = load_db()

def clean_id(raw_id: str) -> str:
    if not raw_id:
        return ""
    cleaned = re.sub(r'^(INV2|INV)[-\s]?', '', str(raw_id), flags=re.IGNORECASE)
    return cleaned.replace("-", "").replace("#", "").strip().upper()

@app.route('/api/generate-invoice', methods=['POST'])
@app.route('/api/generate-invoice', methods=['POST'])
def generate_invoice():
    try:
        data = request.json
        prompt = data.get("prompt", "")
        
        if not prompt:
            return jsonify({"status": "error", "error": "Prompt is required"}), 400
        
        final_state = agent.invoke({"raw_prompt": prompt})
        
        payment_link = final_state.get("payment_link", "")
        extracted_data = final_state.get("extracted_data", {})
        
        raw_id = payment_link.rstrip("/").split("/")[-1] if payment_link else f"INV-{len(invoice_db)+1}"
        invoice_id = clean_id(raw_id)
        
        invoice_record = {
            "id": raw_id.replace("#", ""),
            "normalized_id": invoice_id,
            "client_name": extracted_data.get("client_name", "N/A"),
            "client_email": extracted_data.get("client_email", "N/A"),
            "description": extracted_data.get("description", "N/A"),
            "category": extracted_data.get("category", "General Services"),
            "amount": float(extracted_data.get("amount", 0.0)),
            "status": "Pending",
            "payment_link": payment_link
        }
        
        invoice_db[invoice_id] = invoice_record
        save_db(invoice_db)
        print(f"[DATABASE] Stored new invoice ({invoice_id}) | Category: {invoice_record['category']}")
        
        return jsonify({
            "status": "success",
            "payment_link": payment_link,
            "extracted_data": extracted_data,
            "invoice": invoice_record
        }), 200
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 500

@app.route('/api/invoices', methods=['GET'])
def get_invoices():
    return jsonify({
        "status": "success",
        "invoices": list(invoice_db.values())
    }), 200

@app.route('/api/webhook', methods=['POST'])
def paypal_webhook():
    event = request.json or {}
    event_type = event.get("event_type")
    
    print(f"\n[WEBHOOK RECEIVED] Event Type: {event_type}")
    
    if event_type in ["INVOICING.INVOICE.PAID", "PAYMENT.CAPTURE.COMPLETED"]:
        resource = event.get("resource", {})
        invoice_obj = resource.get("invoice", {})
        
        raw_id = invoice_obj.get("id") or resource.get("id") or resource.get("invoice_id")
        target_id = clean_id(raw_id)
        
        print(f"[WEBHOOK] Raw ID: {raw_id} -> Normalized Search Key: {target_id}")
        
        reconciled = False
        for key, record in invoice_db.items():
            if key == target_id or target_id in key or key in target_id:
                record["status"] = "Paid"
                reconciled = True
                print(f"[DATABASE SUCCESS] Invoice #{record['id']} marked as PAID!")
                break
                
        if not reconciled and target_id:
            invoice_db[target_id] = {"id": raw_id, "status": "Paid"}
            
        save_db(invoice_db)
        return jsonify({"status": "reconciled", "invoice_id": raw_id}), 200
        
    return jsonify({"status": "ignored"}), 200

if __name__ == '__main__':
    app.run(debug=True, port=5000)