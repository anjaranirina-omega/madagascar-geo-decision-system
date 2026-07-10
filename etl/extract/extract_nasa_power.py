import requests

def fetch_nasa_power(lat: float, lon: float, start: str, end: str) -> dict:
    url = 'https://power.larc.nasa.gov/api/temporal/daily/point'
    params = {'parameters': 'PRECTOTCORR,T2M,RH2M,WS2M', 'community': 'AG', 'longitude': lon, 'latitude': lat, 'start': start, 'end': end, 'format': 'JSON'}
    return requests.get(url, params=params, timeout=60).json()
