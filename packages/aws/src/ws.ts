/**
 * WebSocket helpers for live log streaming. Connections (connectionId → deploymentId) are stored
 * in DynamoDB; messages are pushed to a connection via API Gateway Management API. The UI falls
 * back to polling when the WebSocket is unavailable. See PHASE3 §5.
 */

import {
  DeleteItemCommand,
  DynamoDBClient,
  PutItemCommand,
  QueryCommand,
} from "@aws-sdk/client-dynamodb";
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";

const region = process.env.AWS_REGION ?? "us-east-1";
const ddb = new DynamoDBClient({ region });
const table = () => process.env.WS_CONNECTIONS_TABLE ?? "td-dev-ws-connections";

export async function putConnection(connectionId: string, deploymentId: string): Promise<void> {
  await ddb.send(
    new PutItemCommand({
      TableName: table(),
      Item: {
        deploymentId: { S: deploymentId },
        connectionId: { S: connectionId },
        expiresAt: { N: String(Math.floor(Date.now() / 1000) + 3600) },
      },
    }),
  );
}

export async function deleteConnection(deploymentId: string, connectionId: string): Promise<void> {
  await ddb.send(
    new DeleteItemCommand({
      TableName: table(),
      Key: { deploymentId: { S: deploymentId }, connectionId: { S: connectionId } },
    }),
  );
}

export async function connectionsForDeployment(deploymentId: string): Promise<string[]> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: table(),
      KeyConditionExpression: "deploymentId = :d",
      ExpressionAttributeValues: { ":d": { S: deploymentId } },
    }),
  );
  return (res.Items ?? []).map((i) => i.connectionId?.S ?? "").filter(Boolean);
}

/** Push a message to a live WebSocket connection (no-op/soft-fail if gone). */
export async function postToConnection(
  endpoint: string,
  connectionId: string,
  data: unknown,
): Promise<void> {
  const client = new ApiGatewayManagementApiClient({ region, endpoint });
  try {
    await client.send(
      new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: Buffer.from(JSON.stringify(data)),
      }),
    );
  } catch {
    // connection likely closed; the reaper/TTL cleans up stale rows
  }
}
