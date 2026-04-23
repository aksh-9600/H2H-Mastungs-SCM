import sqlite3
import pandas as pd
import numpy as np
from faker import Faker
from sklearn.ensemble import RandomForestClassifier
import json
import random

fake = Faker()

def generate_data(num_customers=200):
    data = []
    
    for _ in range(num_customers):
        support_tickets = np.random.randint(0, 15)
        outages_experienced = np.random.randint(0, 5)
        login_frequency_days_per_month = np.random.randint(1, 30)
        usage_hours = np.random.uniform(5.0, 150.0)
        contract_value = np.random.uniform(1000, 50000)
        
        # Calculate a combined "risk logic" just for the fake data generation so the model learns it
        risk_score_fake = (support_tickets * 2) + (outages_experienced * 10) - (login_frequency_days_per_month * 1) - (usage_hours * 0.1)
        prob_churn = 1 / (1 + np.exp(-(risk_score_fake - 5) / 10))
        churn_status = 1 if np.random.random() < prob_churn else 0
        
        sentiment_history = [int(np.clip(100 - (support_tickets*5) + np.random.normal(0, 10), 0, 100)) for _ in range(6)]
        
        data.append({
            'customer_name': fake.company(),
            'support_tickets': support_tickets,
            'outages_experienced': outages_experienced,
            'login_frequency_days_per_month': login_frequency_days_per_month,
            'usage_hours': round(usage_hours, 2),
            'contract_value': round(contract_value, 2),
            'sentiment_history': json.dumps(sentiment_history),
            'churn_status': churn_status,
            'last_login_date': fake.date_between(start_date='-30d', end_date='today').isoformat(),
            'device_health_status': random.choice(['Optimal', 'Warning', 'Critical', 'Normal'])
        })
        
    return pd.DataFrame(data)

def main():
    print("Generating raw customer data...")
    df = generate_data(200)
    
    # Train Scikit-learn model
    print("Training predictive churn model...")
    features = ['support_tickets', 'outages_experienced', 'login_frequency_days_per_month', 'usage_hours', 'contract_value']
    X = df[features]
    y = df['churn_status']
    
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X, y)
    
    # Predict probabilities (health score = 100 - churn_prob * 100)
    probs = model.predict_proba(X)[:, 1]
    df['health_score'] = 100 - (probs * 100).astype(int)
    
    print("Calculating feature importance...")
    healthy_means = X[y == 0].mean()
    bad_directions = {
        'support_tickets': 1, # High is bad
        'outages_experienced': 1, # High is bad
        'login_frequency_days_per_month': -1, # Low is bad
        'usage_hours': -1, # Low is bad
        'contract_value': 0
    }
    
    feature_labels = {
        'support_tickets': 'High volume of support tickets',
        'outages_experienced': 'Frequent outages experienced',
        'login_frequency_days_per_month': 'Low login frequency',
        'usage_hours': 'Low usage hours',
        'contract_value': 'Contract value'
    }
    
    top_reasons = []
    action_cards = []
    
    for i, row in df.iterrows():
        deviations = {}
        for feat in ['support_tickets', 'outages_experienced', 'login_frequency_days_per_month', 'usage_hours']:
            diff = (row[feat] - healthy_means[feat]) / (X[feat].std() + 1e-9)
            badness = diff * bad_directions[feat]
            if badness > 0:
                deviations[feat] = badness
                
        sorted_devs = sorted(deviations.items(), key=lambda item: item[1], reverse=True)
        top_2 = [feature_labels[f[0]] for f in sorted_devs[:2]]
        
        name = row['customer_name']
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
        
    df['top_risk_factors'] = top_reasons
    df['action_card'] = action_cards
    
    print("Saving to SQLite database insight_flow.db...")
    conn = sqlite3.connect('insight_flow.db')
    df.to_sql('customers', conn, if_exists='replace', index=False)
    conn.close()
    
    print("Database generation complete!")

if __name__ == '__main__':
    main()
