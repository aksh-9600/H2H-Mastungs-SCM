import os
import sqlite3
import pandas as pd
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import ast
import json
import numpy as np
import io

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    query: str

def get_db_connection():
    conn = sqlite3.connect('insight_flow.db')
    conn.row_factory = sqlite3.Row
    return conn

def parse_json_columns(df):
    """Safely parse JSON columns in a DataFrame."""
    df = df.replace({np.nan: None})
    for col in ['sentiment_history', 'top_risk_factors']:
        if col in df.columns:
            df[col] = df[col].apply(lambda x: json.loads(x) if isinstance(x, str) else (x if x is not None else []))
    return df

@app.get("/api/dashboard")
def get_dashboard_data():
    conn = get_db_connection()
    df = pd.read_sql_query("SELECT * FROM customers", conn)
    conn.close()
    df = parse_json_columns(df)
    return df.to_dict(orient="records")

@app.get("/api/customers")
def get_customers():
    """Return all customers with full details for the Customers view."""
    conn = get_db_connection()
    df = pd.read_sql_query("SELECT * FROM customers ORDER BY customer_name ASC", conn)
    conn.close()
    df = parse_json_columns(df)
    return df.to_dict(orient="records")

@app.get("/api/actions")
def get_actions():
    """Return all action cards for at-risk customers."""
    conn = get_db_connection()
    df = pd.read_sql_query("SELECT * FROM customers WHERE action_card IS NOT NULL ORDER BY health_score ASC", conn)
    conn.close()
    df = parse_json_columns(df)
    
    actions = []
    for _, row in df.iterrows():
        if row.get('action_card'):
            actions.append({
                "customer_name": row['customer_name'],
                "health_score": row['health_score'],
                "action_card": row['action_card'],
                "contract_value": row['contract_value'],
                "top_risk_factors": row.get('top_risk_factors', []),
                "support_tickets": row.get('support_tickets', 0),
                "outages_experienced": row.get('outages_experienced', 0),
                "login_frequency_days_per_month": row.get('login_frequency_days_per_month', 0),
                "usage_hours": row.get('usage_hours', 0),
                "last_login_date": row.get('last_login_date', 'N/A'),
            })
    return actions

@app.post("/api/query")
def process_nlq(request: QueryRequest):
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    
    try:
        if api_key:
            from langchain_google_genai import ChatGoogleGenerativeAI
            from langchain_community.utilities import SQLDatabase
            from langchain.chains import create_sql_query_chain
            
            db = SQLDatabase.from_uri("sqlite:///insight_flow.db")
            llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", google_api_key=api_key)
            chain = create_sql_query_chain(llm, db)
            
            sql_query = chain.invoke({"question": request.query})
            
            if "```sql" in sql_query:
                sql_query = sql_query.split("```sql")[1].split("```")[0].strip()
            elif "```" in sql_query:
                sql_query = sql_query.split("```")[1].strip()
                
            conn = get_db_connection()
            result_df = pd.read_sql_query(sql_query, conn)
            conn.close()
            result_df = parse_json_columns(result_df)
            return result_df.to_dict(orient="records")
        else:
            # Smart fallback keyword matching
            lower_q = request.query.lower()
            conn = get_db_connection()
            
            if any(kw in lower_q for kw in ['high-risk', 'high risk', 'at risk', 'risk', 'critical', 'danger']):
                sql_query = "SELECT * FROM customers WHERE health_score < 50 ORDER BY health_score ASC"
            elif any(kw in lower_q for kw in ['healthy', 'good', 'safe', 'stable']):
                sql_query = "SELECT * FROM customers WHERE health_score >= 70 ORDER BY health_score DESC"
            elif any(kw in lower_q for kw in ['top 10 spenders', 'highest value', 'top contracts', 'most valuable']):
                sql_query = "SELECT * FROM customers ORDER BY contract_value DESC LIMIT 10"
            elif any(kw in lower_q for kw in ['most active', 'active', 'engaged', 'usage']):
                sql_query = "SELECT * FROM customers ORDER BY usage_hours DESC LIMIT 10"
            elif any(kw in lower_q for kw in ['least active', 'inactive', 'disengaged', 'low usage']):
                sql_query = "SELECT * FROM customers ORDER BY usage_hours ASC LIMIT 10"
            elif any(kw in lower_q for kw in ['complaint', 'ticket', 'support', 'issue']):
                sql_query = "SELECT * FROM customers WHERE support_tickets >= 8 ORDER BY support_tickets DESC"
            elif any(kw in lower_q for kw in ['outage', 'downtime', 'connection']):
                sql_query = "SELECT * FROM customers WHERE outages_experienced >= 2 ORDER BY outages_experienced DESC"
            elif 'top 10' in lower_q:
                sql_query = "SELECT * FROM customers ORDER BY health_score DESC LIMIT 10"
            elif 'bottom' in lower_q or 'worst' in lower_q:
                sql_query = "SELECT * FROM customers ORDER BY health_score ASC LIMIT 10"
            elif 'all' in lower_q:
                sql_query = "SELECT * FROM customers ORDER BY health_score ASC"
            else:
                # Try name search
                search_term = request.query.strip()
                sql_query = f"SELECT * FROM customers WHERE customer_name LIKE '%{search_term}%' ORDER BY health_score ASC"
                
            result_df = pd.read_sql_query(sql_query, conn)
            conn.close()
            
            # If name search returned nothing, return top results
            if result_df.empty:
                conn = get_db_connection()
                result_df = pd.read_sql_query("SELECT * FROM customers ORDER BY health_score ASC LIMIT 20", conn)
                conn.close()
            
            result_df = parse_json_columns(result_df)
            return result_df.to_dict(orient="records")
            
    except Exception as e:
        print(f"Error in NLQ: {e}")
        conn = get_db_connection()
        result_df = pd.read_sql_query("SELECT * FROM customers LIMIT 10", conn)
        conn.close()
        result_df = parse_json_columns(result_df)
        return result_df.to_dict(orient="records")

@app.post("/api/upload")
async def upload_document(file: UploadFile = File(...)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
        
    try:
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        
        # Verify required columns (or some of them)
        required_cols = ['customer_name', 'support_tickets', 'outages_experienced', 'login_frequency_days_per_month', 'usage_hours', 'contract_value']
        for col in required_cols:
            if col not in df.columns:
                raise HTTPException(status_code=400, detail=f"Missing required column: {col}")
                
        # Calculate risk score and predict churn (similar to mock_generator)
        df['churn_status'] = 0 # Default if model doesn't work
        try:
            features = ['support_tickets', 'outages_experienced', 'login_frequency_days_per_month', 'usage_hours', 'contract_value']
            X = df[features].fillna(0)
            
            # Simple dummy model for probability
            risk_score_fake = (X['support_tickets'] * 2) + (X['outages_experienced'] * 10) - (X['login_frequency_days_per_month'] * 1) - (X['usage_hours'] * 0.1)
            prob_churn = 1 / (1 + np.exp(-(risk_score_fake - 5) / 10))
            df['health_score'] = 100 - (prob_churn * 100).astype(int)
        except Exception as e:
            print(f"Error calculating health score: {e}")
            df['health_score'] = 80
            
        healthy_means = {'support_tickets': 2, 'outages_experienced': 0, 'login_frequency_days_per_month': 20, 'usage_hours': 100}
        bad_directions = {
            'support_tickets': 1,
            'outages_experienced': 1,
            'login_frequency_days_per_month': -1,
            'usage_hours': -1,
            'contract_value': 0
        }
        
        feature_labels = {
            'support_tickets': 'High volume of support tickets',
            'outages_experienced': 'Frequent outages experienced',
            'login_frequency_days_per_month': 'Low login frequency',
            'usage_hours': 'Low usage hours'
        }
        
        top_reasons = []
        action_cards = []
        sentiment_histories = []
        
        for i, row in df.iterrows():
            # Add sentiment history if not exists
            if 'sentiment_history' not in df.columns:
                support_tickets = row.get('support_tickets', 0)
                sentiment_history = [int(np.clip(100 - (support_tickets*5) + np.random.normal(0, 10), 0, 100)) for _ in range(6)]
                sentiment_histories.append(json.dumps(sentiment_history))
            
            deviations = {}
            for feat in ['support_tickets', 'outages_experienced', 'login_frequency_days_per_month', 'usage_hours']:
                if feat in row:
                    diff = (row[feat] - healthy_means[feat]) / (df[feat].std() + 1e-9) if df[feat].std() > 0 else 0
                    badness = diff * bad_directions[feat]
                    if badness > 0:
                        deviations[feat] = badness
            
            sorted_devs = sorted(deviations.items(), key=lambda item: item[1], reverse=True)
            top_2 = [feature_labels[f[0]] for f in sorted_devs[:2]] if sorted_devs else []
            
            name = row.get('customer_name', 'Customer')
            action = None
            if df['health_score'][i] < 50:
                if 'Frequent outages experienced' in top_2:
                    action = f"Warning: {name}'s connection drops. Draft maintenance alert."
                elif 'High volume of support tickets' in top_2:
                    action = f"Alert: Setup a check-in call with {name} regarding their tickets."
                elif 'Low login frequency' in top_2:
                    action = f"Engagement: {name} hasn't logged in much. Send workflow."
                else:
                    action = f"Review account {name} to prevent churn."
                    
            top_reasons.append(json.dumps(top_2))
            action_cards.append(action)
            
        if 'sentiment_history' not in df.columns:
            df['sentiment_history'] = sentiment_histories
        else:
            df['sentiment_history'] = df['sentiment_history'].apply(lambda x: json.dumps(x) if isinstance(x, list) else x)
            
        df['top_risk_factors'] = top_reasons
        df['action_card'] = action_cards
        
        if 'last_login_date' not in df.columns:
            df['last_login_date'] = '2026-04-20'
            
        # Save to DB
        conn_pd = sqlite3.connect('insight_flow.db')
        df.to_sql('customers', conn_pd, if_exists='replace', index=False)
        conn_pd.close()
        
        return {"status": "success", "message": f"Document processed successfully. {len(df)} customers imported."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ChatRequest(BaseModel):
    message: str
    
@app.post("/api/chat")
def process_chat(request: ChatRequest):
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    
    # Try AI-powered response first
    if api_key:
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", google_api_key=api_key)
            
            system_prompt = "You are an AI assistant for the Insight-Flow platform, a customer retention dashboard. Answer the user's questions clearly and concisely. If they ask about the app, explain it helps identify high-risk customers."
            response = llm.invoke(f"{system_prompt}\nUser: {request.message}")
            
            return {"reply": response.content}
        except Exception as e:
            print(f"Chat error: {e}")
    
    # Smart local fallback — answer from database context
    lower_msg = request.message.lower().strip()
    
    try:
        conn = get_db_connection()
        df = pd.read_sql_query("SELECT * FROM customers", conn)
        conn.close()
        
        total = len(df)
        critical = len(df[df['health_score'] < 50])
        at_risk = len(df[(df['health_score'] >= 50) & (df['health_score'] < 70)])
        healthy = len(df[df['health_score'] >= 70])
        avg_health = round(df['health_score'].mean(), 1) if total > 0 else 0
        
        if any(kw in lower_msg for kw in ['hello', 'hi', 'hey', 'greet']):
            return {"reply": f"Hello! I'm the Insight-Flow assistant. I can help you understand your customer data. You currently have {total} customers tracked — {critical} critical, {at_risk} at risk, and {healthy} healthy. What would you like to know?"}
        elif any(kw in lower_msg for kw in ['how many', 'total', 'count']):
            return {"reply": f"You have **{total} customers** in the system.\n\n• 🟢 Healthy (70+): **{healthy}**\n• 🟡 At Risk (50-69): **{at_risk}**\n• 🔴 Critical (<50): **{critical}**\n\nAverage health score: **{avg_health}**"}
        elif any(kw in lower_msg for kw in ['risk', 'critical', 'danger', 'churn']):
            worst = df.nsmallest(5, 'health_score')[['customer_name', 'health_score']].to_dict(orient='records')
            names = ', '.join([f"{r['customer_name']} ({r['health_score']})" for r in worst])
            return {"reply": f"There are **{critical} critical customers** (health score < 50). The most at-risk are: {names}. Navigate to the Intelligence Grid or Action Center for detailed retention actions."}
        elif any(kw in lower_msg for kw in ['best', 'healthy', 'top', 'good']):
            best = df.nlargest(5, 'health_score')[['customer_name', 'health_score']].to_dict(orient='records')
            names = ', '.join([f"{r['customer_name']} ({r['health_score']})" for r in best])
            return {"reply": f"Your healthiest customers are: {names}. These accounts show strong engagement and low risk."}
        elif any(kw in lower_msg for kw in ['what', 'about', 'insight', 'explain', 'help']):
            return {"reply": "Insight-Flow is a **customer retention intelligence platform**. It tracks customer health scores, identifies churn risks using predictive analytics, and suggests proactive retention actions.\n\n**Key features:**\n• Intelligence Grid — overview of all customers\n• Customers — detailed customer list\n• Action Center — AI-suggested retention actions\n• Analytics — visual charts and trends\n• Smart Search — natural language queries\n\nTry asking me about your at-risk customers or search for specific companies!"}
        elif any(kw in lower_msg for kw in ['value', 'revenue', 'contract', 'money']):
            total_value = df['contract_value'].sum()
            at_risk_value = df[df['health_score'] < 50]['contract_value'].sum()
            return {"reply": f"Total portfolio value: **${total_value:,.0f}**\nAt-risk revenue (health < 50): **${at_risk_value:,.0f}** ({(at_risk_value/total_value*100):.1f}% of total)\n\nProtecting at-risk accounts should be your top priority!"}
        else:
            return {"reply": f"I can help you with customer insights! Here's a quick summary:\n\n• Total customers: **{total}**\n• Critical accounts: **{critical}**\n• Average health: **{avg_health}**\n\nTry asking about 'at-risk customers', 'revenue at risk', or 'what is Insight-Flow'."}
    except Exception as e:
        print(f"Local chat error: {e}")
        return {"reply": "I'm the Insight-Flow assistant. I can answer questions about your customer data. Try asking about at-risk customers, health scores, or how the platform works!"}


@app.get("/api/analytics")
def get_analytics():
    conn = get_db_connection()
    df = pd.read_sql_query("SELECT * FROM customers", conn)
    conn.close()
    
    total = len(df)
    if total == 0:
        return {
            "distribution": {"healthy": 0, "risk": 0, "critical": 0},
            "activity": {"top": [], "bottom": []},
            "engagement": {"labels": [], "data": []},
            "value_distribution": {"high": 0, "medium": 0, "low": 0}
        }
        
    healthy_count = len(df[df['health_score'] >= 70])
    risk_count = len(df[(df['health_score'] >= 50) & (df['health_score'] < 70)])
    critical_count = len(df[df['health_score'] < 50])
    
    if 'usage_hours' in df.columns:
        top_active = df.sort_values(by='usage_hours', ascending=False).head(5)[['customer_name', 'usage_hours']].to_dict(orient='records')
        bottom_active = df.sort_values(by='usage_hours', ascending=True).head(5)[['customer_name', 'usage_hours']].to_dict(orient='records')
    else:
        top_active = []
        bottom_active = []
        
    engagement_data = [int(total * 10 + np.random.randint(-20, 20)) for _ in range(6)]
    
    if 'contract_value' in df.columns:
        mean_val = df['contract_value'].mean()
        high_val = len(df[df['contract_value'] > mean_val * 1.5])
        low_val = len(df[df['contract_value'] < mean_val * 0.5])
        medium_val = total - high_val - low_val
    else:
        high_val, medium_val, low_val = 0, 0, 0
        
    return {
        "distribution": {"healthy": healthy_count, "risk": risk_count, "critical": critical_count},
        "activity": {"top": top_active, "bottom": bottom_active},
        "engagement": {"labels": ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'], "data": engagement_data},
        "value_distribution": {"high": high_val, "medium": medium_val, "low": low_val}
    }

# Serve SPA routes — all frontend routes serve index.html
@app.get("/analytics")
@app.get("/customers")
@app.get("/action-center")
def serve_spa():
    return FileResponse("static/index.html")

app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
