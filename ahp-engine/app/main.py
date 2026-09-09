from fastapi import FastAPI
from app.models.schemas import AhpRequest, AhpResponse
from app.ahp.weights_calculator import calculate_weights
from app.ahp.consistency_ratio import consistency_ratio
from app.criteria.climatic_criteria import CLIMATIC_CRITERIA
from app.criteria.geographic_criteria import GEOGRAPHIC_CRITERIA
from app.criteria.socio_economic_criteria import SOCIO_ECONOMIC_CRITERIA

app = FastAPI(title='AHP Engine - Géodécisionnel Madagascar')

@app.get('/health')
def health():
    return {'service': 'ahp-engine', 'status': 'ok'}

@app.get('/criteria')
def get_criteria():
    return {
        'climatic': CLIMATIC_CRITERIA,
        'geographic': GEOGRAPHIC_CRITERIA,
        'socio_economic': SOCIO_ECONOMIC_CRITERIA,
    }

@app.post('/ahp/calculate', response_model=AhpResponse)
def calculate(request: AhpRequest):
    raw_weights = calculate_weights(request.matrix)
    
    # Mapper les noms des critères s'ils sont fournis
    weights = {}
    for i, (k, v) in enumerate(raw_weights.items()):
        name = request.criteria[i] if i < len(request.criteria) else k
        weights[name] = v
        
    cr = consistency_ratio(request.matrix, weights)
    
    # Score de risque pondéré
    score = 0.0
    if request.normalized_values:
        score = sum(v * float(request.normalized_values.get(k, 0.0)) for k, v in weights.items()) * 100.0
    else:
        score = 50.0  # Valeur par défaut d'étalonnage
        
    level = 'FAIBLE' if score <= 30 else 'MOYEN' if score <= 60 else 'ELEVE' if score <= 80 else 'CRITIQUE'
    
    return AhpResponse(
        weights=weights,
        consistency_ratio=round(cr, 4),
        risk_index=round(score, 2),
        alert_level=level
    )
