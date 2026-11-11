// Test Runner Customizado - Engenharia de Software
// Executável no Node.js ou Navegador

class TestRunner {
    constructor() {
        this.totalSuites = 0;
        this.totalPassou = 0;
        this.totalFalhou = 0;
        this.suiteAtual = '';
        this.inicioMs = Date.now();
    }

    suite(nome, fn) {
        this.totalSuites++;
        this.suiteAtual = nome;
        console.log(`\n📦 [SUITE] ${nome}`);
        try {
            fn();
        } catch (err) {
            this.totalFalhou++;
            console.error(`  ❌ ERRO CRÍTICO NA SUITE '${nome}':`, err);
        }
    }

    isEqual(obtido, esperado, mensagem) {
        if (obtido === esperado) {
            this.totalPassou++;
            console.log(`  ✅ PASSOU: ${mensagem}`);
        } else {
            this.totalFalhou++;
            console.error(`  ❌ FALHOU: ${mensagem}`);
            console.error(`     Esperado: ${JSON.stringify(esperado)}`);
            console.error(`     Obtido:   ${JSON.stringify(obtido)}`);
        }
    }

    isTrue(condicao, mensagem) {
        if (condicao === true) {
            this.totalPassou++;
            console.log(`  ✅ PASSOU: ${mensagem}`);
        } else {
            this.totalFalhou++;
            console.error(`  ❌ FALHOU: ${mensagem} (Esperado true, obtido ${condicao})`);
        }
    }

    isFalse(condicao, mensagem) {
        if (condicao === false) {
            this.totalPassou++;
            console.log(`  ✅ PASSOU: ${mensagem}`);
        } else {
            this.totalFalhou++;
            console.error(`  ❌ FALHOU: ${mensagem} (Esperado false, obtido ${condicao})`);
        }
    }

    imprimirRelatorioFinal() {
        const duracao = Date.now() - this.inicioMs;
        console.log('\n======================================================');
        console.log('RELATÓRIO FINAL DA SUÍTE DE TESTES');
        console.log('======================================================');
        console.log(`Total de Suítes Executadas: ${this.totalSuites}`);
        console.log(`Total de Testes Aprovados:  ${this.totalPassou} ✅`);
        console.log(`Total de Falhas:            ${this.totalFalhou} ${this.totalFalhou === 0 ? '🎉' : '❌'}`);
        console.log(`Tempo Total de Execução:    ${duracao}ms`);
        console.log('======================================================\n');

        return this.totalFalhou === 0;
    }
}

// Se executado no ambiente global
if (typeof window !== 'undefined') {
    window.TestRunner = TestRunner;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TestRunner;
}
