# Migration 0004 - Add informed_consent column
$jsonPath = "C:\Users\ASUS\Documents\NAYLA_KULIAH\SEM 4\PSI\ProjectAkhir\KidneyBuddy_App\backend\src\db\migrations\meta\_journal.json"
$j = Get-Content $jsonPath | ConvertFrom-Json
$entry = [PSCustomObject]@{idx=4; version="7"; when=1782490000000; tag="0004_add_informed_consent"; breakpoints=$true}
$j.entries += $entry
$j | ConvertTo-Json -Depth 10 | Set-Content $jsonPath -Encoding UTF8
Write-Host "Journal updated"

# Apply SQL to database
$result = docker exec -i kidneybuddy-db psql -U kidneybuddy -d kidneybuddy -c "ALTER TABLE users ADD COLUMN IF NOT EXISTS informed_consent boolean NOT NULL DEFAULT false;" -c "INSERT INTO drizzle.__drizzle_migrations (id, hash, created_at) VALUES (4, '0004_add_informed_consent', 1782490000000) ON CONFLICT (id) DO NOTHING;" 2>&1
Write-Host $result
Write-Host "Migration applied"
