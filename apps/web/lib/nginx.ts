/**
 * Client-side Nginx config generator for the EC2 preview. Mirrors packages/core `nginxServerBlock`
 * (kept in sync) so the create-flow preview matches exactly what gets written to the instance.
 */
export function generateNginxConfig(o: { port: number; serverName?: string }): string {
  const listen = o.serverName ? "    listen 80;" : "    listen 80 default_server;";
  const name = o.serverName ? `    server_name ${o.serverName};` : undefined;
  return [
    "server {",
    listen,
    name,
    "    location / {",
    `        proxy_pass http://127.0.0.1:${o.port};`,
    "        proxy_set_header Host $host;",
    "        proxy_set_header X-Real-IP $remote_addr;",
    "        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;",
    "        proxy_set_header X-Forwarded-Proto $scheme;",
    "    }",
    "}",
  ]
    .filter((l): l is string => l !== undefined)
    .join("\n");
}
