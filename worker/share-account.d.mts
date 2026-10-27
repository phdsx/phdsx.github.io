export declare const SHARE_API_PATH: '/tools/media/share-account/api/resolve';

export interface ShareChainResult {
  chain: Array<{ url: string; status: number | null }>;
  complete: boolean;
  message: string;
}

export declare function resolveShareChain(input: string, fetcher?: typeof fetch): Promise<ShareChainResult>;
export declare function shareAccountResponse(request: Request, fetcher?: typeof fetch): Promise<Response>;
