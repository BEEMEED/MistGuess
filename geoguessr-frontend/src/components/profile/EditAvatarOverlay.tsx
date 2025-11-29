import React, { useState, useRef } from 'react';
import { MistbornButton } from '../ui/MistbornButton';
import { Avatar } from '../ui/Avatar';
import '../../styles/ProfileOverlay.css';

interface EditAvatarOverlayProps {
  currentAvatar?: string;
  onSave: (file: File) => Promise<void>;
  onClose: () => void;
}

export const EditAvatarOverlay: React.FC<EditAvatarOverlayProps> = ({
  currentAvatar,
  onSave,
  onClose,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setSelectedFile(file);
    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!selectedFile) {
      setError('Please select a file');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onSave(selectedFile);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to upload avatar');
    } finally {
      setIsLoading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="profile-overlay">
      <div className="profile-overlay__backdrop" onClick={onClose} />
      <div className="profile-overlay__content">
        <h2 className="profile-overlay__title">Change Avatar</h2>

        <div className="profile-overlay__body">
          <div className="avatar-preview">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Preview"
                className="avatar-preview__image"
              />
            ) : (
              <Avatar src={currentAvatar} size="large" />
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          <MistbornButton onClick={triggerFileInput} disabled={isLoading}>
            Choose File
          </MistbornButton>

          {selectedFile && (
            <p className="profile-overlay__filename">{selectedFile.name}</p>
          )}

          {error && <p className="profile-overlay__error">{error}</p>}

          <p className="profile-overlay__hint">
            Max file size: 5MB. Supported formats: JPG, PNG, GIF
          </p>
        </div>

        <div className="profile-overlay__actions">
          <MistbornButton onClick={onClose} disabled={isLoading}>
            Cancel
          </MistbornButton>
          <MistbornButton
            onClick={handleSave}
            disabled={isLoading || !selectedFile}
          >
            {isLoading ? 'Uploading...' : 'Save'}
          </MistbornButton>
        </div>
      </div>
    </div>
  );
};
