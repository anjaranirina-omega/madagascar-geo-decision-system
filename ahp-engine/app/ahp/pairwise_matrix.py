def validate_pairwise_matrix(matrix):
    n = len(matrix)
    return all(len(row) == n for row in matrix)
