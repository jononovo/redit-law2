#!/bin/bash
set -e

echo "=== Phase 1: Product Categories (5,638 rows) ==="
psql "$1" -f scripts/prod-seed-phase1.sql
echo "Phase 1 done."

echo ""
echo "=== Phase 2: Category Keywords (1,286 rows) ==="
psql "$1" -f scripts/prod-seed-phase2.sql
echo "Phase 2 done."

echo ""
echo "=== Phase 3: Brand Categories (181 rows) ==="
psql "$1" -f scripts/prod-seed-phase3.sql
echo "Phase 3 done."

echo ""
echo "=== Phase 4: Product Listings (6,774 rows) ==="
psql "$1" -f scripts/prod-seed-phase4.sql
echo "Phase 4 done."

echo ""
echo "=== All phases complete ==="
