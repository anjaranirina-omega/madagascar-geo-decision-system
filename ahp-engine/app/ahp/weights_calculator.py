import numpy as np

def calculate_weights(matrix: list[list[float]]) -> dict[str, float]:
    arr = np.array(matrix, dtype=float)
    col_sum = arr.sum(axis=0)
    normalized = arr / col_sum
    weights = normalized.mean(axis=1)
    return {f'criterion_{i+1}': float(w) for i, w in enumerate(weights)}
