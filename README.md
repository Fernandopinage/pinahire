# PinaHire

**Encontre vagas que combinam com seu perfil.**

PinaHire é uma extensão para Google Chrome que analisa vagas de emprego e calcula automaticamente o nível de compatibilidade com seu perfil profissional.

## Características

- **100% Local** - Sem backend, sem banco de dados, sem APIs externas
- **Determinístico** - Algoritmos tradicionais, sem IA ou machine learning
- **Privacidade** - Todos os dados ficam no seu navegador
- **Rápido** - Análise instantânea da vaga

## Funcionalidades

- 📊 **Score de Compatibilidade** - Percentage de match com a vaga
- ⚠️ **Alertas de Perfil** - Identifica quando seu nível está abaixo do solicitado
- 📋 **Histórico** - Armazena vagas analisadas
- 📈 **Dashboard** - Estatísticas gerais
- 💾 **Exportação** - Backup do perfil em JSON

## Stack

- TypeScript
- React
- Vite
- CRXJS (Chrome Extension Plugin)
- Manifest V3

## Instalação

### Pré-requisitos

- Node.js 18+
- npm ou yarn

### Desenvolvimento

```bash
# Instalar dependências
npm install

# Iniciar em modo desenvolvimento
npm run dev
```

### Build

```bash
# Gerar build de produção
npm run build
```

### Instalar no Chrome

1. Abra `chrome://extensions`
2. Ative **Developer Mode**
3. Clique em **Load unpacked**
4. Selecione a pasta `dist` gerada pelo build
5. A extensão PinaHire estará disponível

## Uso

1. Cadastre seu perfil nas configurações da extensão
2. Acesse uma vaga de emprego (LinkedIn ou outro site)
3. Clique no botão **🎯 Analisar com PinaHire**
4. Veja o score de compatibilidade e os detalhes

## Estrutura

```
PinaHire/
├── src/
│   ├── analyzer/       # Motor de cálculo de score
│   ├── background/     # Service Worker
│   ├── content/        # Script de injeção nas páginas
│   ├── parser/         # Parser de descrições de vaga
│   ├── popup/          # Interface rápida
│   ├── options/        # Página de configurações
│   ├── rules/          # Regras e aliases de skills
│   ├── storage/        # Camada de armazenamento
│   └── types/          # Definições TypeScript
├── public/
│   ├── icons/          # Ícones da extensão
│   └── manifest.json   # Manifest V3
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Licença

MIT
