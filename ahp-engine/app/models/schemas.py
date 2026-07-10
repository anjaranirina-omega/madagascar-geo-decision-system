from pydantic import BaseModel

class AhpRequest(BaseModel):
    criteria: list[str]
    matrix: list[list[float]]
    normalized_values: dict[str, float] = {}

class AhpResponse(BaseModel):
    weights: dict[str, float]
    consistency_ratio: float
    risk_index: float
    alert_level: str
