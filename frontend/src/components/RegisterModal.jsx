// src/components/RegisterModal.jsx
import { useState } from 'react';
import { api } from '../utils/api';
import { useGameStore } from '../store/useGameStore';

const FACTION_COLORS = [
  { hex: '#FF2B2B', name: 'Crimson' },
  { hex: '#FF6B35', name: 'Inferno' },
  { hex: '#FFD400', name: 'Viper' },
  { hex: '#00FF5A', name: 'Specter' },
  { hex: '#00E5FF', name: 'Ghost' },
  { hex: '#2979FF', name: 'Cerulean' },
  { hex: '#AA00FF', name: 'Phantom' },
  { hex: '#FF007A', name: 'Venom' },
  { hex: '#FF9100', name: 'Blaze' },
  { hex: '#76FF03', name: 'Acid' },
  { hex: '#00E676', name: 'Recon' },
  { hex: '#40C4FF', name: 'Arctic' },
];

export default function RegisterModal() {
  const setPlayer = useGameStore((s) => s.setPlayer);
  const addLog = useGameStore((s) => s.addLog);
  const addNotif = useGameStore((s) => s.addNotif);

  const [name, setName] = useState('');
  const [color, setColor] = useState(FACTION_COLORS[0].hex);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(0); // 0 = name, 1 = color

  const handleRegister = async () => {
    if (!name.trim()) { setError('Commander needs a callsign.'); return; }
    if (name.trim().length < 2) { setError('At least 2 characters required.'); return; }
    setLoading(true);
    setError('');
    try {
      const data = await api.register(name.trim(), color);
      const player = {
        id: data.id || data.user_id || data.ID,
        name: name.trim(),
        color,
      };
      setPlayer(player);
      addLog(`Commander ${player.name} deployed to battlefield`, 'system');
      addNotif(`Welcome, ${player.name}. Claim your territory.`, 'success');
    } catch (e) {
      setError(e.message || 'Registration failed.');
    }
    setLoading(false);
  };

  const selectedFaction = FACTION_COLORS.find((c) => c.hex === color);

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Decorative corner marks */}
        <div style={{ ...styles.corner, top: 0, left: 0, borderTop: '2px solid var(--red)', borderLeft: '2px solid var(--red)' }} />
        <div style={{ ...styles.corner, top: 0, right: 0, borderTop: '2px solid var(--red)', borderRight: '2px solid var(--red)' }} />
        <div style={{ ...styles.corner, bottom: 0, left: 0, borderBottom: '2px solid var(--red)', borderLeft: '2px solid var(--red)' }} />
        <div style={{ ...styles.corner, bottom: 0, right: 0, borderBottom: '2px solid var(--red)', borderRight: '2px solid var(--red)' }} />

        <div style={styles.logoWrap}>
          <div style={styles.logo}>GRID<span style={{ color: 'var(--yellow)' }}>WAR</span></div>
          <div style={styles.tagline}>TERRITORY DOMINATION · REAL-TIME COMBAT</div>
        </div>

        <div style={styles.divider} />

        <div style={styles.sectionLabel}>01 — COMMANDER CALLSIGN</div>
        <div style={styles.inputWrap}>
          <input
            style={styles.input}
            value={name}
            maxLength={20}
            placeholder="Enter your war name..."
            onChange={(e) => { setName(e.target.value); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && (step === 0 ? setStep(1) : handleRegister())}
            autoFocus
          />
          <div style={styles.inputLength}>{name.length}/20</div>
        </div>

        <div style={{ ...styles.sectionLabel, marginTop: 20 }}>02 — FACTION COLOR</div>
        <div style={styles.colorGrid}>
          {FACTION_COLORS.map((c) => (
            <button
              key={c.hex}
              style={{
                ...styles.colorBtn,
                background: c.hex,
                boxShadow: color === c.hex ? `0 0 0 2px #fff, 0 0 16px ${c.hex}` : 'none',
                transform: color === c.hex ? 'scale(1.18)' : 'scale(1)',
              }}
              title={c.name}
              onClick={() => setColor(c.hex)}
            />
          ))}
        </div>
        <div style={styles.factionName}>
          <span style={{ background: color, display: 'inline-block', width: 10, height: 10, marginRight: 6, verticalAlign: 'middle' }} />
          {selectedFaction?.name ?? ''} Faction
        </div>

        {error && <div style={styles.error}>⚠ {error}</div>}

        <button
          style={{ ...styles.deployBtn, opacity: loading ? 0.6 : 1 }}
          onClick={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <span style={styles.spinner}>◌ DEPLOYING...</span>
          ) : (
            '▶ DEPLOY TO BATTLEFIELD'
          )}
        </button>

        <div style={styles.footer}>
          1000 tiles · Real-time multiplayer · Claim as many as you can
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(6,6,8,0.92)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    animation: 'overlayIn 0.3s ease',
  },
  modal: {
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-med)',
    padding: '36px 32px',
    width: 380,
    position: 'relative',
    animation: 'modalIn 0.35s cubic-bezier(0.16,1,0.3,1)',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  corner: {
    position: 'absolute',
    width: 14,
    height: 14,
  },
  logoWrap: {
    textAlign: 'center',
    marginBottom: 4,
  },
  logo: {
    fontFamily: 'var(--font-display)',
    fontSize: 52,
    letterSpacing: 8,
    color: 'var(--red)',
    textShadow: 'var(--glow-red)',
    lineHeight: 1,
  },
  tagline: {
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    letterSpacing: 3,
    color: 'var(--text-dim)',
    marginTop: 6,
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    background: 'linear-gradient(90deg, transparent, var(--border-bright), transparent)',
    margin: '4px 0',
  },
  sectionLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    letterSpacing: 3,
    color: 'var(--cyan)',
    textTransform: 'uppercase',
  },
  inputWrap: {
    position: 'relative',
  },
  input: {
    width: '100%',
    background: 'var(--bg-deep)',
    border: '1px solid var(--border-med)',
    borderLeft: '2px solid var(--cyan)',
    color: 'var(--text-bright)',
    fontFamily: 'var(--font-mono)',
    fontSize: 15,
    padding: '10px 44px 10px 12px',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  inputLength: {
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: 'translateY(-50%)',
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    color: 'var(--text-dim)',
  },
  colorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: 8,
  },
  colorBtn: {
    width: '100%',
    aspectRatio: '1',
    border: 'none',
    cursor: 'pointer',
    transition: 'transform 0.15s, box-shadow 0.15s',
    borderRadius: 2,
  },
  factionName: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    color: 'var(--text-med)',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  error: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    color: 'var(--red)',
    padding: '6px 10px',
    background: 'rgba(255,43,43,0.08)',
    border: '1px solid rgba(255,43,43,0.2)',
  },
  deployBtn: {
    background: 'var(--red)',
    color: '#fff',
    border: 'none',
    fontFamily: 'var(--font-display)',
    fontSize: 18,
    letterSpacing: 3,
    padding: '14px',
    width: '100%',
    cursor: 'pointer',
    transition: 'background 0.2s, box-shadow 0.2s',
    marginTop: 6,
  },
  spinner: {
    fontFamily: 'var(--font-mono)',
    fontSize: 13,
    letterSpacing: 2,
  },
  footer: {
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    color: 'var(--text-dim)',
    textAlign: 'center',
    letterSpacing: 2,
    marginTop: 4,
  },
};
