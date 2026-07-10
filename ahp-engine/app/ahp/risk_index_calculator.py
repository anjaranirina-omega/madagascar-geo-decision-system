def risk_index(weights: dict[str, float], values: dict[str, float]) -> float:
    return sum(weights.get(k, 0) * values.get(k, 0) for k in weights) * 100
