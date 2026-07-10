def classify_alert_level(score: float) -> str:
    if score <= 30: return 'FAIBLE'
    if score <= 60: return 'MOYEN'
    if score <= 80: return 'ELEVE'
    return 'CRITIQUE'
