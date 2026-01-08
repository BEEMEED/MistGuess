import React, { useState } from 'react';
import { MistbornButton } from '../ui/MistbornButton';
import '../../styles/ProfileOverlay.css';

interface TelegramLinkOverlayProps {
  linkCode: string;
  onClose: () => void;
}

export const TelegramLinkOverlay: React.FC<TelegramLinkOverlayProps> = ({
  linkCode,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(linkCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const botUrl = 'https://t.me/mistGuess_Bot'; // Замени на имя своего бота

  return (
    <div className="profile-overlay">
      <div className="profile-overlay__backdrop" onClick={onClose} />
      <div className="profile-overlay__content telegram-link-overlay">
        <h2 className="profile-overlay__title">Link Telegram Account</h2>

        <div className="profile-overlay__body">
          <p className="telegram-link-overlay__instruction">
            Follow these steps to link your Telegram account:
          </p>

          <ol className="telegram-link-overlay__steps">
            <li>
              Copy the code below:
              <div className="telegram-link-overlay__code-container">
                <code className="telegram-link-overlay__code">{linkCode}</code>
                <button
                  className="telegram-link-overlay__copy-btn"
                  onClick={handleCopy}
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </li>
            <li>
              Open the <a href={botUrl} target="_blank" rel="noopener noreferrer" className="telegram-link-overlay__bot-link">MistGuess Bot</a> in Telegram
            </li>
            <li>
              Send the command: <code className="telegram-link-overlay__command">/link {linkCode}</code>
            </li>
            <li>
              Wait for confirmation from the bot
            </li>
          </ol>

          <p className="profile-overlay__hint">
            This code is valid for this session only. Close this window after linking.
          </p>
        </div>

        <div className="profile-overlay__actions">
          <MistbornButton onClick={onClose}>
            Close
          </MistbornButton>
        </div>
      </div>
    </div>
  );
};
