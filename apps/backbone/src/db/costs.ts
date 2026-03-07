import { db } from "./index.js";

export interface TrackCostParams {
  agentId: string;
  operation: "heartbeat" | "conversation" | "cron";
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
}

const upsertStmt = db.prepare(`
  INSERT INTO cost_daily (date, agent_id, operation, tokens_in, tokens_out, cost_usd, calls)
  VALUES (date('now'), @agentId, @operation, @tokensIn, @tokensOut, @costUsd, 1)
  ON CONFLICT(date, agent_id, operation) DO UPDATE SET
    tokens_in  = tokens_in  + @tokensIn,
    tokens_out = tokens_out + @tokensOut,
    cost_usd   = cost_usd   + @costUsd,
    calls      = calls      + 1
`);

export function trackCost(params: TrackCostParams): void {
  upsertStmt.run({
    agentId: params.agentId,
    operation: params.operation,
    tokensIn: params.tokensIn,
    tokensOut: params.tokensOut,
    costUsd: params.costUsd,
  });
}
