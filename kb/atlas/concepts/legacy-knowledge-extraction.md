---
title: "Extração de Conhecimento de Sistemas Legados para Reconstrução via IA"
aliases: [legacy extraction, knowledge extraction, modernização via IA]
tags: [metodologia, ia, legacy, extração, reconstrução]
sources:
  - ArchAgent (arxiv 2601.13007)
  - Code-Survey (arxiv 2410.01837)
  - CodexGraph (arxiv 2408.03910)
  - Google FSE 2024 (arxiv 2504.09691)
  - Retrieval-Augmented Code Generation Survey (arxiv 2510.04905)
  - Anthropic Code Modernization Playbook
  - When Code Crosses Borders (arxiv 2509.06504)
created: 2026-04-24
updated: 2026-04-24
---

## O Problema

Quando queremos usar uma IA para projetar um sistema novo a partir de um sistema legado existente, enfrentamos um problema de fidelidade: **a IA precisa entender o que existe hoje para poder projetar algo melhor amanhã**. Se o conhecimento extraído do sistema legado for impreciso, incompleto ou distorcido, a IA futura vai trabalhar sobre uma base falsa — e o sistema resultante vai repetir erros que poderiam ter sido evitados, ou ignorar decisões que valiam a pena preservar.

O objetivo não é documentar o sistema. É construir um **espelho fiel** do sistema atual — um registro que, quando lido por uma IA sem acesso ao código original, permita a ela entender o sistema como se o tivesse visto diretamente.

---

## O Princípio Central

A pesquisa converge em uma regra que não tem exceção:

> **LLMs não extraem fatos. LLMs interpretam fatos que foram extraídos mecanicamente.**

Esta distinção é a diferença entre um sistema de extração confiável e um sistema que alucina.

Quando um LLM lê código-fonte e produz um documento descrevendo o que o sistema faz, ele está derivando fatos — e pode inventar. Estudos mostram que **20% das extrações puramente por LLM contêm informações fictícias**: packages que não existem, relações entre módulos que não existem, comportamentos que não estão implementados. Mais grave: 43% dessas alucinações se repetem de forma consistente em múltiplas tentativas, dando aparência de confiabilidade ao que é fabricado.

A separação correta é:

```
Análise Estática → Fatos verificáveis (código é a fonte, não o LLM)
        ↓
LLM → Organiza, interpreta e dá narrativa a esses fatos
```

O LLM nunca deriva. Ele recebe fatos já extraídos e os torna compreensíveis.

---

## Estado da Arte

### ArchAgent — Recuperação de Arquitetura com Fidelidade

*(arxiv 2601.13007, 2026)*

O padrão ArchAgent é o mais relevante para o problema de fidelidade. Ele combina três camadas:

1. **Análise estática**: extrai fatos concretos do código (símbolos, dependências, imports, exports, estrutura de módulos). Nenhum LLM participa desta etapa.
2. **Raciocínio baseado em grafo**: modela as dependências estruturais como um grafo de conhecimento. As relações são derivadas do código, não inferidas por LLM.
3. **Síntese semântica por LLM**: o LLM lê o grafo estruturado e produz descrição arquitetural em linguagem natural.

A chave é que o LLM trabalha sobre estrutura já verificada, não sobre código bruto. Ele não pode alucinar fatos porque os fatos já foram fixados pela análise estática.

### CodexGraph — Grafos de Conhecimento para Código

*(arxiv 2408.03910, 2024)*

CodexGraph representa o codebase como um grafo de conhecimento com nós e arestas tipadas:

- **Nós**: MODULE, CLASS, FUNCTION, VARIABLE, ROUTE, SCHEMA
- **Arestas**: CONTAINS, INHERITS, CALLS, IMPORTS, EXPORTS, USES

Este grafo é construído por análise estática — não por LLM. O LLM consulta o grafo ao invés de ler código bruto, o que reduz dramaticamente o risco de alucinação porque o LLM está respondendo perguntas sobre estrutura, não derivando estrutura.

### Code-Survey — Análise Sistemática de Codebases

*(arxiv 2410.01837, 2024)*

O padrão Code-Survey trata análise de codebase como investigação científica, não como geração de código. A contribuição central é o **framing**: ao invés de "peça ao LLM para entender o código", a metodologia é "extraia dados estruturados do código e peça ao LLM para analisar os dados".

Isso elimina a circularidade em que o LLM tanto extrai quanto interpreta os mesmos fatos.

### RAG para Código — Redução de Alucinação

*(arxiv 2510.04905, 2024)*

Retrieval-Augmented Generation aplicado a código demonstra redução de **73-86% na taxa de alucinação** quando implementado corretamente. O mecanismo: ao invés de o LLM gerar a partir de memória, ele recupera snippets relevantes do codebase e gera a partir deles.

Para extração de conhecimento, o princípio equivalente é: o LLM sempre trabalha com o código na janela de contexto, nunca de memória. Cada claim no documento gerado pode ser rastreado a um trecho específico do código.

### Google FSE 2024 — Migração em Escala

*(arxiv 2504.09691, 2024)*

O pipeline do Google para migração de código em escala industrial confirma o princípio: **análise de dependências é feita por ferramentas determinísticas**, não por LLM. O LLM só entra para gerar o código de transformação, com as dependências já mapeadas mecanicamente.

---

## As Principais Armadilhas

### 1. Alucinação consistente

O perigo não é o LLM produzir nonsense óbvio — é produzir informação plausível e errada, de forma consistente. 43% das alucinações se repetem. Isso significa que múltiplas execuções do mesmo agente vão concordar no erro, criando falsa confiança.

**Mitigação**: separar extração (estática) de interpretação (LLM).

### 2. "Bad code" tem semântica

Anos de workarounds, patches de emergência e adaptações ad-hoc parecem código ruim a olhos externos — mas frequentemente encapsulam business logic crítica, limitações de infraestrutura, ou decisões tomadas por razões que não estão documentadas. Um LLM que lê esse código vai classificá-lo como noise e potencialmente ignorá-lo. A IA que reconstituir o sistema vai reproduzir o "problema" que o workaround resolvia.

**Mitigação**: capturar histórico de decisões (git log, commits de revert) como fonte complementar à análise estática.

### 3. Relações implícitas

Código TypeScript com inversão de dependência, injeção via configuração YAML, e rotas montadas dinamicamente tem relações que a análise estática simples não captura. O grafo resultante pode estar incompleto.

**Mitigação**: complementar análise estática com extração de configurações e schemas de runtime.

### 4. Perda de escopo

Codebases grandes explodem context windows. Um LLM que recebe código demais começa a sumarizar em vez de preservar, perdendo detalhes que eram relevantes.

**Mitigação**: segmentar por módulo, processar em chunks, usar RAG para recuperação localizada.

---

## A Metodologia Correta

Com base no estado da arte, o pipeline para extração fiel de conhecimento de sistema legado é:

### Fase 1 — Extração Estática (zero LLM)

Um script varre o codebase e extrai fatos verificáveis em formato estruturado (JSON):

- Todos os módulos e suas responsabilidades declaradas
- Todas as rotas HTTP (método, path, middleware, handler)
- Todos os schemas e tipos (Zod, TypeScript interfaces)
- Todas as dependências externas com versões
- Todas as variáveis de ambiente referenciadas
- Todas as relações de import/export entre módulos
- Estrutura de arquivos e entrypoints
- Scripts npm disponíveis
- Configurações de banco, workers, portas

Este JSON é a **fonte da verdade**. Qualquer claim no KB final deve ser rastreável a uma entrada neste JSON.

### Fase 2 — Enriquecimento por Histórico (zero LLM)

Complementar a extração estática com fatos do histórico git:

- Commits de revert (decisões que foram tomadas e abandonadas)
- Módulos que foram removidos (o que existia antes)
- Renomeações de conceitos (evolução do mental model)

Este histórico captura o "porquê" que o código atual não registra.

### Fase 3 — Organização em KB (LLM sobre fatos verificados)

Somente agora o LLM entra. Ele recebe o JSON da Fase 1 e os dados da Fase 2, e produz artigos LYT para o KB. Cada artigo cita sua fonte no JSON. O LLM não deriva nenhum fato novo — organiza e dá narrativa aos fatos já extraídos.

A instrução central para o LLM nesta fase:

> "Você está organizando fatos verificados em linguagem natural. Cada claim que você escrever deve existir no JSON de entrada. Se você não encontrar evidência para um claim no JSON, não escreva o claim — registre como gap."

### Fase 4 — Validação

Um agente separado lê os artigos produzidos e verifica se cada claim tem uma referência rastreável ao JSON de extração. Claims sem referência são flagados.

---

## O que a IA Futura Precisa Ver

Para que uma IA consiga projetar um sistema novo com base no KB, o KB precisa responder às seguintes perguntas sobre o sistema atual:

1. **O que cada módulo faz** — responsabilidade, não implementação
2. **Como os módulos se conectam** — fluxo de dados, não apenas imports
3. **Quais problemas cada decisão resolve** — o WHY, não apenas o WHAT
4. **O que foi tentado e abandonado** — para não repetir os mesmos caminhos
5. **Onde estão os limites e as fragilidades** — o que o sistema atual não faz bem
6. **Quais são os invariantes e regras não documentadas** — o que o código assume sem declarar

Os primeiros dois vêm da Fase 1 (análise estática). Os últimos quatro exigem a Fase 2 (histórico) e a Fase 3 (interpretação com contexto).

---

## Conceitos Relacionados

- [[legacy-system-modernization]]
- [[rag-para-codigo]]
- [[knowledge-graph-de-codebase]]
- [[anti-hallucinacao-em-extracao]]

## Fontes

- ArchAgent: Scalable Legacy Software Architecture Recovery with LLMs — arxiv.org/html/2601.13007v1
- Code-Survey: An LLM-Driven Methodology for Analyzing Large-Scale Codebases — arxiv.org/html/2410.01837v1
- CodexGraph: Bridging LLMs and Code Repositories via Code Graph Databases — arxiv.org/html/2408.03910v2
- Migrating Code At Scale With LLMs At Google — arxiv.org/html/2504.09691v1
- Retrieval-Augmented Code Generation: A Survey — arxiv.org/html/2510.04905v1
- When Code Crosses Borders — arxiv.org/html/2509.06504v2
- Anthropic Code Modernization Playbook — resources.anthropic.com/hubfs/Code Modernization Playbook.pdf
- The rise of vibe coding: Why architecture still matters — vfunction.com/blog/vibe-coding-architecture-ai-agents
