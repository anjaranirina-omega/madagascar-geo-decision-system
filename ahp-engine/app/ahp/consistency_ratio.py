import numpy as np
RI = {1: 0.0, 2: 0.0, 3: 0.58, 4: 0.90, 5: 1.12, 6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49}

def consistency_ratio(matrix: list[list[float]], weights: dict[str, float]) -> float:
    arr = np.array(matrix, dtype=float)
    w = np.array(list(weights.values()))
    n = len(w)
    if n <= 2: return 0.0
    lambda_max = ((arr @ w) / w).mean()
    ci = (lambda_max - n) / (n - 1)
    ri = RI.get(n, 1.49)
    return float(ci / ri) if ri else 0.0
