# test_endpoints.ps1 - Prueba los endpoints del modulo de grupos
# Ejecutar: .\tools\test_endpoints.ps1

$BASE = "http://localhost:3000"
$PASS_COORD = "123456"   # coordinador@sima.com
$PASS_INSTR = "123456"   # instructor@sima.com
$PASS_APR   = "1234"     # aprendiz_prueba@sima.com

Write-Host "=== TEST ENDPOINTS GRUPOS FORMATIVOS ===" -ForegroundColor Cyan

# ── 1. Login coordinador ──────────────────────────────────────────────────
Write-Host "`n[1] Login coordinador..." -ForegroundColor Yellow
$loginBody = @{ email = "coordinador@sima.com"; password = $PASS_COORD } | ConvertTo-Json
try {
    $loginResp = Invoke-RestMethod -Uri "$BASE/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    if ($loginResp.ok) {
        Write-Host "  OK - Login exitoso" -ForegroundColor Green
        $tokenCoord = $loginResp.data.token
    } else {
        Write-Host "  FALLO - $($loginResp.message)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "  ERROR - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

$headersCoord = @{ Authorization = "Bearer $tokenCoord" }

# ── 2. GET /api/grupos/areas ──────────────────────────────────────────────
Write-Host "`n[2] GET /api/grupos/areas..." -ForegroundColor Yellow
try {
    $areas = Invoke-RestMethod -Uri "$BASE/api/grupos/areas" -Headers $headersCoord
    Write-Host "  OK - $($areas.data.Count) areas encontradas" -ForegroundColor Green
    $areas.data | ForEach-Object { Write-Host "     - $($_.nombre_area)" }
} catch {
    Write-Host "  ERROR - $($_.Exception.Message)" -ForegroundColor Red
}

# ── 3. GET /api/grupos ────────────────────────────────────────────────────
Write-Host "`n[3] GET /api/grupos (coordinador)..." -ForegroundColor Yellow
try {
    $grupos = Invoke-RestMethod -Uri "$BASE/api/grupos" -Headers $headersCoord
    Write-Host "  OK - $($grupos.data.total) grupos encontrados" -ForegroundColor Green
} catch {
    Write-Host "  ERROR - $($_.Exception.Message)" -ForegroundColor Red
}

# ── 4. POST /api/grupos (crear grupo) ────────────────────────────────────
Write-Host "`n[4] POST /api/grupos (crear grupo de prueba)..." -ForegroundColor Yellow
$fichaTest = "FICHA-TEST-" + (Get-Random -Maximum 9999)
$primerArea = $areas.data[0].id_area
$createBody = @{
    numero_ficha = $fichaTest
    id_area = $primerArea
    programa = "Adecuacion y mantenimiento de computadores"
    jornada = "Manana"
    trimestres = 3
    fecha_inicio = "2025-01-01"
} | ConvertTo-Json

try {
    $created = Invoke-RestMethod -Uri "$BASE/api/grupos" -Method Post -Body $createBody -ContentType "application/json" -Headers $headersCoord
    Write-Host "  OK - Grupo creado: $($created.data.numero_ficha) (id=$($created.data.id_grupo))" -ForegroundColor Green
    $idGrupoCreado = $created.data.id_grupo
} catch {
    Write-Host "  ERROR - $($_.Exception.Message)" -ForegroundColor Red
}

# ── 5. Login instructor ───────────────────────────────────────────────────
Write-Host "`n[5] Login instructor..." -ForegroundColor Yellow
$loginInstr = @{ email = "instructor@sima.com"; password = $PASS_INSTR } | ConvertTo-Json
try {
    $instrResp = Invoke-RestMethod -Uri "$BASE/api/auth/login" -Method Post -Body $loginInstr -ContentType "application/json"
    if ($instrResp.ok) {
        Write-Host "  OK - Login instructor exitoso" -ForegroundColor Green
        $tokenInstr = $instrResp.data.token
    } else {
        Write-Host "  FALLO - $($instrResp.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "  ERROR - $($_.Exception.Message)" -ForegroundColor Red
}

# ── 6. GET /api/grupos/instructor ─────────────────────────────────────────
if ($tokenInstr) {
    $headersInstr = @{ Authorization = "Bearer $tokenInstr" }
    Write-Host "`n[6] GET /api/grupos/instructor..." -ForegroundColor Yellow
    try {
        $gruposInstr = Invoke-RestMethod -Uri "$BASE/api/grupos/instructor" -Headers $headersInstr
        Write-Host "  OK - $($gruposInstr.data.Count) grupos del instructor" -ForegroundColor Green
    } catch {
        Write-Host "  ERROR - $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n=== FIN DE PRUEBAS ===" -ForegroundColor Cyan
