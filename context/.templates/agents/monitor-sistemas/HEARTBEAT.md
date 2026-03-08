# Heartbeat Instructions

## Procedimento

A cada ciclo de heartbeat, execute as seguintes verificacoes:

1. **Servicos ativos** — verifique se os servicos configurados estao respondendo (HTTP health check, ping, etc.)
2. **Uso de recursos** — verifique CPU, memoria e disco nos servidores monitorados
3. **Logs de erro** — analise os logs recentes em busca de erros criticos ou padroes anomalos
4. **Filas e jobs** — verifique se ha filas acumuladas ou jobs travados

## Classificacao de alertas

- **CRITICO**: servico fora do ar, disco > 95%, erro de conexao ao banco de dados
- **AVISO**: latencia elevada, disco > 80%, taxa de erro acima do normal
- **INFORMATIVO**: deploy recente, reinicio de servico, manutencao programada

## Decisao

- Se todos os sistemas estao operacionais e sem anomalias → responda apenas `HEARTBEAT_OK`
- Se houver algum alerta, descreva claramente: servico afetado, severidade, metricas observadas e acao recomendada
- Priorize alertas criticos no topo da resposta

## Formato do alerta

```
[CRITICO] Servico X esta fora do ar desde HH:MM
- Ultimo check: HH:MM
- Impacto: descricao do impacto
- Acao recomendada: reiniciar o servico / contatar equipe de infra
```

Do not infer or repeat old tasks from prior context.
