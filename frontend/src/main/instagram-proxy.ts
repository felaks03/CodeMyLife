import { resolve4 } from 'dns/promises';
import { createServer, Socket } from 'net';
import type { Server } from 'net';

export class InstagramProxy {
  private server: Server | null = null;
  private port = 0;

  async start(): Promise<number> {
    if (this.server) return this.port;

    this.server = createServer((socket) => this.handleConnection(socket));
    await new Promise<void>((resolve, reject) => {
      this.server?.once('error', reject);
      this.server?.listen(0, '127.0.0.1', () => resolve());
    });

    const address = this.server.address();
    if (!address || typeof address === 'string') {
      throw new Error('No se pudo iniciar el proxy local de Instagram.');
    }
    this.port = address.port;
    return this.port;
  }

  async stop(): Promise<void> {
    const server = this.server;
    this.server = null;
    this.port = 0;
    if (!server) return;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  private handleConnection(socket: Socket): void {
    let request = Buffer.alloc(0);
    const onData = async (data: Buffer) => {
      request = Buffer.concat([request, data]);
      const headerEnd = request.indexOf('\r\n\r\n');
      if (headerEnd === -1) return;
      socket.removeListener('data', onData);

      try {
        const header = request.subarray(0, headerEnd).toString('utf8');
        const firstLine = header.split('\r\n', 1)[0];
        const match = /^CONNECT\s+([^\s:]+)(?::(\d+))?\s+HTTP\/\d\.\d$/i.exec(firstLine);
        if (!match) {
          socket.end('HTTP/1.1 405 Method Not Allowed\r\n\r\n');
          return;
        }

        const hostname = match[1].toLowerCase();
        if (!(hostname === 'instagram.com' || hostname.endsWith('.instagram.com') || hostname === 'instagram.net' || hostname.endsWith('.instagram.net') || hostname === 'cdninstagram.com' || hostname.endsWith('.cdninstagram.com') || hostname === 'facebook.com' || hostname.endsWith('.facebook.com') || hostname.endsWith('.fbcdn.net') || hostname.endsWith('.fbsbx.com'))) {
          socket.end('HTTP/1.1 403 Forbidden\r\n\r\n');
          return;
        }

        const port = Number(match[2] ?? 443);
        const addresses = await resolve4(hostname);
        const upstream = createServerSocket(addresses[0], port);
        upstream.once('error', () => {
          if (!socket.destroyed) socket.end('HTTP/1.1 502 Bad Gateway\r\n\r\n');
        });
        upstream.once('connect', () => {
          socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
          socket.pipe(upstream);
          upstream.pipe(socket);
        });
      } catch (error) {
        if (!socket.destroyed) socket.end('HTTP/1.1 502 Bad Gateway\r\n\r\n');
      }
    };
    socket.on('data', onData);
    socket.on('error', () => undefined);
  }
}

function createServerSocket(address: string, port: number): Socket {
  const socket = new Socket();
  socket.connect(port, address);
  return socket;
}
