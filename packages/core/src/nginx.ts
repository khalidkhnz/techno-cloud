/**
 * Nginx reverse-proxy config generator — the single source of truth shared by the EC2 deploy
 * program (baked into user-data / pushed via SSM) and the create-flow preview, so what the user
 * sees is exactly what gets written to /etc/nginx/conf.d/<app>.conf.
 */

export interface NginxOptions {
  /** Upstream app/container port on the instance. */
  port: number;
  /** server_name for existing multi-app hosts; omit for a dedicated new instance (default_server). */
  serverName?: string;
}

export function nginxServerBlock(o: NginxOptions): string {
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
