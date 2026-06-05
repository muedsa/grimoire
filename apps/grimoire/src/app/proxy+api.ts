import { ProxyReqBody } from "@/utils/http-proxy";

export async function POST(request: Request) {
  const reqBody = (await request.json()) as ProxyReqBody;
  return await fetch(reqBody.url, reqBody.options);
}
