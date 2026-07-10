#!/usr/bin/env bash
set -euo pipefail
docker exec geodecisionnel-postgis pg_dump -U geodecisionnel geodecisionnel > backup_$(date +%Y%m%d_%H%M%S).sql
