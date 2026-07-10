from fastapi import FastAPI
from app.models.schemas import AhpRequest, AhpResponse
from app.ahp.weights_calculator import calculate_weights
from app.ahp.consistency_ratio import consistency_ratio

app = FastAPI(title='AHP Engine - Géodécisionnel Madagascar')

@app.get('/health')
def health():
    return {'service': 'ahp-engine', 'status': 'ok'}

@app.post('/ahp/calculate', response_model=AhpResponse)
def calculate(request: AhpRequest):
    weights = calculate_weights(request.matrix)
    cr = consistency_ratio(request.matrix, weights)
    score = sum(v * request.normalized_values.get(k, 0) for k, v in weights.items()) * 100
    level = 'FAIBLE' if score <= 30 else 'MOYEN' if score <= 60 else 'ELEVE' if score <= 80 else 'CRITIQUE'
    return AhpResponse(weights=weights, consistency_ratio=cr, risk_index=score, alert_level=level)
