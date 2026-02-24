

# Plano: Recarregar Dados Somente Quando o Usuario Pedir

## Situacao Atual

O hook `useCampaignsQuery` tem um `refetchInterval: 60 * 1000` que faz o sistema buscar dados no banco **a cada 1 minuto automaticamente**, mesmo que o usuario esteja parado na pagina. Isso gera requisicoes desnecessarias ao banco.

Os outros hooks nao tem refresh automatico, mas alguns tem `staleTime` curto (1-2 min), o que faz com que ao navegar entre paginas, os dados sejam buscados novamente rapidamente.

## Mudancas Propostas

### 1. Remover refresh automatico do `useCampaignsQuery`

Remover a linha `refetchInterval: 60 * 1000` para que os dados so sejam buscados novamente quando:
- O usuario recarrega a pagina manualmente (F5)
- O cache expira e o usuario navega para a pagina

### 2. Aumentar staleTime para evitar recargas desnecessarias

Padronizar todos os hooks com `staleTime: 10 * 60 * 1000` (10 minutos) para que os dados fiquem em cache por mais tempo e so sejam rebuscados quando realmente necessario.

| Hook | staleTime atual | staleTime novo |
|---|---|---|
| `useCampaignsQuery` | 5 min | 10 min |
| `useCampaignGroupsQuery` | 2 min | 10 min |
| `useCampaignDetailsQuery` | 2 min | 10 min |
| `useInsertionOrdersQuery` | 5 min | 10 min |
| `useReportEvents` | 5 min | 10 min |
| `useSingleCampaignQuery` | 1 min | 10 min |

### 3. Manter `refetchOnMount: false` em todos

Isso garante que ao navegar entre paginas, se o cache ainda for valido (dentro do staleTime de 10 min), os dados nao sao buscados novamente.

## Arquivos Modificados

1. `src/hooks/queries/useCampaignsQuery.tsx` -- Remover `refetchInterval`, aumentar `staleTime` para 10 min
2. `src/hooks/queries/useCampaignGroupsQuery.tsx` -- Aumentar `staleTime` para 10 min
3. `src/hooks/queries/useCampaignDetailsQuery.tsx` -- Aumentar `staleTime` para 10 min
4. `src/hooks/queries/useSingleCampaignQuery.tsx` -- Aumentar `staleTime` para 10 min
5. `src/hooks/queries/useInsertionOrdersQuery.tsx` -- Aumentar `staleTime` para 10 min (ja esta em 5, subir para 10)
6. `src/hooks/useReportEvents.tsx` -- Aumentar `staleTime` para 10 min (ja esta em 5, subir para 10)

## Resultado

- Dados so recarregam quando o usuario faz F5 ou apos 10 minutos de cache expirado
- Zero requisicoes automaticas em background
- Navegacao entre paginas usa cache sem rebuscar
- Menos carga no banco de dados

