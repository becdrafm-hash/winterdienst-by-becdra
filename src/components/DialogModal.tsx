import type { ReactNode } from 'react';

interface DialogModalProps {
  visible: boolean;
  titel: string;
  text: string;
  darkMode: boolean;
  bgCard: string;
  textApp: string;
  textSub: string;
  borderCard: string;
  onConfirm?: () => void;
  onSecondary?: () => void;
  onCancel?: () => void;
  confirmText?: ReactNode;
  secondaryText?: ReactNode;
  cancelText?: ReactNode;
}

export default function DialogModal({
  visible,
  titel,
  text,
  darkMode,
  bgCard,
  textApp,
  textSub,
  borderCard,
  onConfirm,
  onSecondary,
  onCancel,
  confirmText,
  secondaryText,
  cancelText
}: DialogModalProps) {
  if (!visible) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px' }}>
      <div style={{ backgroundColor: bgCard, border: '2px solid #8cc63f', color: textApp, padding: '24px', borderRadius: '16px', maxWidth: '380px', width: '100%', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: 0 }}>{titel}</h3>
        <p style={{ fontSize: '0.85rem', color: textSub, margin: 0, lineHeight: '1.4' }}>{text}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
          {onConfirm && (
            <button onClick={onConfirm} style={{ backgroundColor: '#8cc63f', color: '#111827', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 10px rgba(140, 198, 63, 0.3)' }}>
              {confirmText || 'OK'}
            </button>
          )}
          {onSecondary && (
            <button onClick={onSecondary} style={{ backgroundColor: darkMode ? '#14171a' : '#eef6e6', color: '#598f1e', border: '1px solid #8cc63f', padding: '12px', borderRadius: '10px', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer' }}>
              {secondaryText}
            </button>
          )}
          {onCancel && (
            <button onClick={onCancel} style={{ backgroundColor: darkMode ? '#14171a' : '#f3f4f6', color: textApp, border: '1px solid ' + borderCard, padding: '10px', borderRadius: '10px', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer' }}>
              {cancelText || 'Abbrechen'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
