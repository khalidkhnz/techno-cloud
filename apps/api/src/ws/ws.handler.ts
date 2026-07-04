/**
 * WebSocket Lambda handler for live log streaming (API Gateway WebSocket API). Clients connect,
 * then send `{ action: "subscribe", deploymentId }`. A log pusher (or the deploy job) posts log
 * lines to subscribed connections via `postToConnection`. On disconnect the row is removed.
 * The UI polls as a fallback when the socket is unavailable.
 */

import type { APIGatewayProxyWebsocketHandlerV2 } from "aws-lambda";
import { deleteConnection, putConnection } from "@techno-deployer/aws";

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  const { connectionId, routeKey } = event.requestContext;

  if (routeKey === "$connect") {
    // deploymentId comes via a query param on connect or a subsequent subscribe.
    const deploymentId = (event as { queryStringParameters?: Record<string, string> })
      .queryStringParameters?.deploymentId;
    if (deploymentId) await putConnection(connectionId, deploymentId);
    return { statusCode: 200, body: "connected" };
  }

  if (routeKey === "$disconnect") {
    const body = safeParse(event.body);
    if (body?.deploymentId) await deleteConnection(body.deploymentId, connectionId);
    return { statusCode: 200, body: "disconnected" };
  }

  // "subscribe" route
  const body = safeParse(event.body);
  if (body?.deploymentId) await putConnection(connectionId, body.deploymentId);
  return { statusCode: 200, body: "subscribed" };
};

function safeParse(body: string | undefined): { deploymentId?: string } | null {
  if (!body) return null;
  try {
    return JSON.parse(body) as { deploymentId?: string };
  } catch {
    return null;
  }
}
