// src/components/Notifications.jsx
import { useGameStore } from '../store/useGameStore';

const VARIANT_STYLES = {
  success: { borderColor: 'var(--green)', iconColor: 'var(--green)', icon: '✓' },
  error:   { borderColor: 'var(--red)',   iconColor: 'var(--red)',   icon: '✕' },
  warn:    { borderColor: 'var(--yellow)', iconColor: 'var(--yellow)', icon: '⚠' },
  info:    { borderColor: 'var(--cyan)',  iconColor: 'var(--cyan)',  icon: 'ℹ' },
};

export default function Notifications() {
  const notifications = useGameStore((s) => s.notifications);
  const removeNotif = useGameStore((s) => s.removeNotif);

  return (
    <div style={styles.container}>
      {notifications.map((n) => {
        const v = VARIANT_STYLES[n.variant] || VARIANT_STYLES.info;
        return (
          <div
            key={n.id}
            style={{
              ...styles.notif,
              borderLeft: `3px solid ${v.borderColor}`,
              animation: 'notifIn 0.3s cubic-bezier(0.16,1,0.3,1)',
            }}
            onClick={() => removeNotif(n.id)}
          >
            <span style={{ color: v.iconColor, marginRight: 8, fontSize: 13 }}>{v.icon}</span>
            <span style={styles.notifText}>{n.text}</span>
          </div>
        );
      })}
    </div>
  );
}

const styles = {
  container: {
    position: 'fixed',
    top: 64,
    right: 220,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    zIndex: 500,
    pointerEvents: 'none',
    maxWidth: 280,
  },
  notif: {
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-med)',
    padding: '10px 14px',
    display: 'flex',
    alignItems: 'center',
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    cursor: 'pointer',
    pointerEvents: 'all',
  },
  notifText: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    color: 'var(--text-bright)',
    letterSpacing: 0.5,
    lineHeight: 1.4,
  },
};
