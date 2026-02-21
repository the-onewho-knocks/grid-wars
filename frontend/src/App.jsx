// src/App.jsx
import { useGameStore } from './store/useGameStore';
import { useWebSocket } from './hooks/useWebSocket';
import { useTiles } from './hooks/useTiles';
import { useLeaderboard } from './hooks/useLeaderboard';

import Header from './components/Header';
import LeftPanel from './components/LeftPanel';
import TileGrid from './components/TileGrid';
import RightPanel from './components/RightPanel';
import RegisterModal from './components/RegisterModal';
import Notifications from './components/Notifications';

export default function App() {
  const player = useGameStore((s) => s.player);

  // Initialize hooks (order matters — WS needs player from store)
  useWebSocket();
  const { capture } = useTiles();
  useLeaderboard();

  return (
    <div className="no-select" style={styles.root}>
      <Header />

      <div style={styles.body}>
        <LeftPanel />
        <TileGrid onCapture={capture} />
        <RightPanel />
      </div>

      {/* Overlays */}
      <Notifications />
      {!player && <RegisterModal />}
    </div>
  );
}

const styles = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    overflow: 'hidden',
    background: 'var(--bg-void)',
  },
  body: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
};
