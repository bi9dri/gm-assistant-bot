import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import type { ContractRouterClient } from '@orpc/contract';
import type { contract } from '../../../backend/src/orpc/router';

const link = new RPCLink({
  url: typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:3000/rpc'
    : 'https://gm-assistant-bot-backend.workers.dev/rpc',
});

export const api: ContractRouterClient<typeof contract> = createORPCClient(link);
