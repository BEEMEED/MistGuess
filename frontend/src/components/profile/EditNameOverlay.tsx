import React, { useState } from 'react';
import { MistbornButton } from '../ui/MistbornButton';
import { MistbornInput } from '../ui/MistbornInput';
import '../../styles/ProfileOverlay.css';

interface EditNameOverlayProps {
  currentName: string;
  onSave: (newName: string) => Promise<void>;
  onClose: () => void;
}

export const EditNameOverlay: React.FC<EditNameOverlayProps> = ({
  currentName,
  onSave,
  onClose,
}) => {
  const [newName, setNewName] = useState(currentName);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (newName.length < 4 || newName.length > 16) {
      setError('Name must be between 4 and 16 characters');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onSave(newName);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update name');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="profile-overlay">
      <div className="profile-overlay__backdrop" onClick={onClose} />
      <div className="profile-overlay__content">
        <h2 className="profile-overlay__title">Edit Name</h2>

        <div className="profile-overlay__body">
          <MistbornInput
            type="text"
            placeholder="Enter new name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            disabled={isLoading}
          />

          {error && <p className="profile-overlay__error">{error}</p>}

          <p className="profile-overlay__hint">
            Name must be 4-16 characters long
          </p>
        </div>

        <div className="profile-overlay__actions">
          <MistbornButton onClick={onClose} disabled={isLoading}>
            Cancel
          </MistbornButton>
          <MistbornButton onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save'}
          </MistbornButton>
        </div>
      </div>
    </div>
  );
};
