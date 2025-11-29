import React from 'react';
import { MistbornModal } from './MistbornModal';
import { MistbornButton } from './MistbornButton';
import './ReconnectPrompt.css';

interface ActiveLobby {
  InviteCode: string;
  ingame: boolean;
  currentRound?: number;
  totalRounds?: number;
}

interface ReconnectPromptProps {
  lobbies: ActiveLobby[];
  onClose: () => void;
}

export const ReconnectPrompt: React.FC<ReconnectPromptProps> = ({ lobbies, onClose }) => {
  const handleReconnect = (lobbyCode: string) => {
    // Navigate to the lobby page with reconnect flag
    window.location.href = `/lobby/${lobbyCode}?reconnect=true`;
    onClose();
  };

  return (
    <MistbornModal
      isOpen={true}
      title="Active Lobbies"
      message="You have active lobbies. Would you like to reconnect?"
      onClose={onClose}
      type="alert"
    >
      <div className="reconnect-prompt">

        <div className="lobbies-list">
          {lobbies.map((lobby) => (
            <div key={lobby.InviteCode} className="lobby-item">
              <div className="lobby-info">
                <div className="lobby-code">{lobby.InviteCode}</div>
                <div className="lobby-status">
                  {lobby.ingame ? (
                    <span className="status-in-game">
                      In Game - Round {lobby.currentRound}/{lobby.totalRounds}
                    </span>
                  ) : (
                    <span className="status-lobby">Waiting in Lobby</span>
                  )}
                </div>
              </div>
              <MistbornButton
                variant="primary"
                onClick={() => handleReconnect(lobby.InviteCode)}
              >
                Reconnect
              </MistbornButton>
            </div>
          ))}
        </div>
      </div>
    </MistbornModal>
  );
};
