import pandas as pd

def clean_observations(df: pd.DataFrame) -> pd.DataFrame:
    return df.drop_duplicates().replace({-999: None})
