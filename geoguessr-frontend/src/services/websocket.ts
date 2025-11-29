import type { WSEvent, WSClientMessage } from '../types';

const WS_BASE_URL = 'ws://localhost:8000';

export type WSEventHandler = (event: WSEvent) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private eventHandlers: WSEventHandler[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private lobbyCode: string | null = null;
  private token: string | null = null;

  public connect(lobbyCode: string, token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.lobbyCode = lobbyCode;
      this.token = token;

      const wsUrl = `${WS_BASE_URL}/ws/${lobbyCode}?token=${token}`;

      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connected to lobby:', lobbyCode);
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data: WSEvent = JSON.parse(event.data);
            console.log('WebSocket message received:', data);

            // Ignore null or invalid messages
            if (!data || typeof data !== 'object' || !data.type) {
              console.warn('Received invalid WebSocket message:', data);
              return;
            }

            this.eventHandlers.forEach((handler) => handler(data));
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason);
          this.handleReconnect();
        };
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        reject(error);
      }
    });
  }

  private handleReconnect(): void {
    if (
      this.reconnectAttempts < this.maxReconnectAttempts &&
      this.lobbyCode &&
      this.token
    ) {
      this.reconnectAttempts++;
      console.log(
        `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
      );

      setTimeout(() => {
        if (this.lobbyCode && this.token) {
          this.connect(this.lobbyCode, this.token).catch((error) => {
            console.error('Reconnection failed:', error);
          });
        }
      }, this.reconnectDelay);
    } else {
      console.log('Max reconnection attempts reached or no lobby/token available');
    }
  }

  public disconnect(): void {
    if (this.ws) {
      this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
      this.ws.close();
      this.ws = null;
      this.lobbyCode = null;
      this.token = null;
    }
  }

  public send(message: WSClientMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      console.log('WebSocket message sent:', message);
    } else {
      console.error('WebSocket is not connected. Cannot send message:', message);
    }
  }

  public onEvent(handler: WSEventHandler): () => void {
    this.eventHandlers.push(handler);
    // Return unsubscribe function
    return () => {
      this.eventHandlers = this.eventHandlers.filter((h) => h !== handler);
    };
  }

  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  // Convenience methods for sending specific messages

  public startGame(): void {
    this.send({ type: 'game_start' });
  }

  public submitGuess(lat: number, lon: number): void {
    this.send({
      type: 'submit_guess',
      lat,
      lon,
    });
  }

  public startRound(): void {
    this.send({ type: 'round_start' });
  }

  public endRound(): void {
    this.send({ type: 'round_end' });
  }

  public endGame(): void {
    this.send({ type: 'game_end' });
  }

  public playerJoined(): void {
    this.send({ type: 'player_joined' });
  }

  public playerLeft(): void {
    this.send({ type: 'player_left' });
  }

  public sendMessage(message: string): void {
    this.send({
      type: 'broadcast',
      message
    });
  }

  public reconnect(): void {
    this.send({ type: 'player_reconnect' });
  }
}

// Export singleton instance
export const wsService = new WebSocketService();
