def assert_required_columns(df, columns):
    missing = [c for c in columns if c not in df.columns]
    if missing:
        raise ValueError(f'Colonnes manquantes: {missing}')
