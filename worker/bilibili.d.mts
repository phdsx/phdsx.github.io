export declare const VIDEO_API_PREFIX: string;
export declare function videoApiResponse(request: Request, fetcher?: typeof fetch, env?: { BILIBILI_SESSION_SECRET?: string }): Promise<Response>;
