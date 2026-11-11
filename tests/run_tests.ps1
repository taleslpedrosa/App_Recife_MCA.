# Script de Execução Automatizada da Suíte de Testes da Aplicação
# Projeto: Recife: Museu a Céu Aberto

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "RECIFE: MUSEU A CÉU ABERTO - SUÍTE DE TESTES AUTOMATIZADOS" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$totalTestes = 0
$totalPassou = 0
$totalFalhou = 0

function Assert-Test($nome, $condicao) {
    $global:totalTestes++
    if ($condicao) {
        Write-Host "  [OK] $nome" -ForegroundColor Green
        $global:totalPassou++
    } else {
        Write-Host "  [FALHA] $nome" -ForegroundColor Red
        $global:totalFalhou++
    }
}

# 1. Carrega scripts do projeto para verificação
$schema = Get-Content "js/schema.js" -Raw
$store = Get-Content "js/store.js" -Raw
$i18n = Get-Content "js/i18n.js" -Raw
$dados = Get-Content "js/dados.js" -Raw
$routes = Get-Content "js/routes.js" -Raw
$sheets = Get-Content "js/sheets.js" -Raw
$ui = Get-Content "js/ui.js" -Raw
$app = Get-Content "js/app.js" -Raw
$index = Get-Content "index.html" -Raw

Write-Host "`n--- 1. TESTES UNITÁRIOS DE INTEGRIDADE & SCHEMA ---" -ForegroundColor Yellow

Assert-Test "Schema Validator: BoundingBoxRecife configurada corretamente" (
    $schema -match "minLat:\s*-8\.50" -and $schema -match "maxLng:\s*-34\.70"
)

Assert-Test "Schema Validator: Função validarESanitizarPoi declarada" (
    $schema -match "function\s+validarESanitizarPoi"
)

Assert-Test "Schema Validator: Sanitização estrita contra tags HTML e caracteres de controle" (
    $schema -match "replace\(/\<\[\^\>\]\*\>/g"
)

Assert-Test "Store Reativo: Classe AppStore e instância singleton declaradas" (
    $store -match "class\s+AppStore" -and $store -match "const\s+store\s*=\s*new\s+AppStore"
)

Assert-Test "Store Reativo: Métodos subscribe, emit, setPois e toggleVisitado presentes" (
    $store -match "subscribe\(" -and $store -match "emit\(" -and $store -match "setPois\(" -and $store -match "toggleVisitado\("
)

Write-Host "`n--- 2. TESTES DE INTERNACIONALIZAÇÃO (I18N) ---" -ForegroundColor Yellow

Assert-Test "i18n: Dicionários completos em pt, en e es" (
    $i18n -match "pt:\s*\{" -and $i18n -match "en:\s*\{" -and $i18n -match "es:\s*\{"
)

Assert-Test "i18n: Manager com métodos t() e aplicarTraducoes()" (
    $i18n -match "class\s+I18nManager" -and $i18n -match "t\(chave\)" -and $i18n -match "aplicarTraducoes\(\)"
)

Write-Host "`n--- 3. TESTES DE GAMIFICAÇÃO & PASSAPORTE CULTURAL ---" -ForegroundColor Yellow

Assert-Test "Passaporte: Funções de carimbo e contagem presentes no ui.js" (
    $ui -match "function\s+alternarCarimboPassaporte" -and
    $ui -match "function\s+atualizarInterfacePassaporte" -and
    $ui -match "function\s+exibirCertificado"
)

Assert-Test "Gamificação: Modal de Certificado de Conclusão presente no index.html" (
    $index -match "id=['`"]modal-certificado['`"]" -and
    $index -match "id=['`"]cert-roteiro-nome['`"]"
)

Assert-Test "Gamificação: Detecção de proximidade GPS menor que 75m ativa badge no routes.js" (
    $routes -match "distMeters\s*<=\s*75" -and
    $routes -match "badgeProximidade\.classList\.remove\('hidden'\)"
)

Write-Host "`n--- 4. TESTES DE CURADORIA COLABORATIVA ---" -ForegroundColor Yellow

Assert-Test "Curadoria: Modal com campos estruturados no index.html" (
    $index -match "id=['`"]modal-colaborar['`"]" -and
    $index -match "id=['`"]colaborar-nome['`"]" -and
    $index -match "id=['`"]colaborar-tipo['`"]"
)

Assert-Test "Curadoria: Função de envio de colaboração estruturada implementada" (
    $ui -match "function\s+confirmarEnvioColaboracao"
)

Write-Host "`n--- 5. TESTES DE AUTENTICAÇÃO, TELEMETRIA & DASHBOARD ---" -ForegroundColor Yellow

$telemetry = Get-Content "js/telemetry.js" -Raw
$sync = Get-Content "js/sync.js" -Raw

Assert-Test "Telemetria: Classe TelemetryEngine com registro de cliques e Dwell Time" (
    $telemetry -match "class\s+TelemetryEngine" -and
    $telemetry -match "registrarVisualizacaoPoi" -and
    $telemetry -match "iniciarDwellTime" -and
    $telemetry -match "finalizarDwellTime"
)

Assert-Test "Autenticação & Perfil: SyncManager com detecção de Morador vs. Turista" (
    $sync -match "class\s+SyncManager" -and
    $sync -match "autenticar\(" -and
    $sync -match "isMorador\(" -and
    $sync -match "isTurista\("
)

Assert-Test "Interface: Modais de Auth, Onboarding e Dashboard da Curadoria no HTML" (
    $index -match "id=['`"]modal-auth['`"]" -and
    $index -match "id=['`"]modal-onboarding['`"]" -and
    $index -match "id=['`"]modal-dashboard-curadoria['`"]" -and
    $index -match "id=['`"]dash-ranking-acessos['`"]" -and
    $index -match "id=['`"]dash-ranking-dwell['`"]"
)

Assert-Test "Dashboard: Funções de renderização analítica e filtro transversal Morador vs Turista" (
    $ui -match "function\s+abrirDashboardCuradoria" -and
    $ui -match "function\s+renderizarGraficosDashboard" -and
    $ui -match "function\s+filtrarDashboard"
)

Write-Host "`n--- 6. TESTES DE DEPENDÊNCIAS & PRECACHE PWA ---" -ForegroundColor Yellow

$sw = Get-Content "sw.js" -Raw
Assert-Test "PWA: Versão de cache atualizada para museu-recife-v9" (
    $sw -match "museu-recife-v9"
)

Assert-Test "PWA: Novos módulos (telemetry.js, sync.js) incluídos no ASSETS_ESTRUTURAIS" (
    $sw -match "telemetry\.js" -and $sw -match "sync\.js"
)

Assert-Test "HTML: Todos os módulos na ordem correta antes de app.js" (
    $index -match "schema\.js[\s\S]*telemetry\.js[\s\S]*sync\.js[\s\S]*store\.js[\s\S]*i18n\.js[\s\S]*dados\.js[\s\S]*map\.js[\s\S]*routes\.js[\s\S]*ui\.js[\s\S]*sheets\.js[\s\S]*app\.js"
)

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "RESULTADO: $totalPassou de $totalTestes TESTES APROVADOS! (Falhas: $totalFalhou)" -ForegroundColor $(if ($totalFalhou -eq 0) { "Green" } else { "Red" })
Write-Host "==========================================================" -ForegroundColor Cyan

if ($totalFalhou -eq 0) {
    exit 0
} else {
    exit 1
}
