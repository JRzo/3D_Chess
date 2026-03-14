import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Login }    from './pages/Login';
import { Home }     from './pages/Home';
import { GamePage } from './pages/GamePage';
import { BotSelect } from './pages/BotSelect';
import { Profile }  from './pages/Profile';
import { Settings } from './pages/Settings';
import { Puzzles }  from './pages/Puzzles';
import { Gauntlet } from './pages/Gauntlet';

const Loading = () => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#1a1a1a', color:'#b58863', fontSize:'3rem' }}>
    ♟
  </div>
);

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  return user ? children : <Navigate to="/" replace />;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  return (
    <Routes>
      <Route path="/"                element={user ? <Navigate to="/home" replace /> : <Login />} />
      <Route path="/home"            element={<Protected><Home /></Protected>} />
      <Route path="/bots"            element={<Protected><BotSelect /></Protected>} />
      <Route path="/game/:id"        element={<Protected><GamePage /></Protected>} />
      <Route path="/profile/:id"     element={<Protected><Profile /></Protected>} />
      <Route path="/settings"        element={<Protected><Settings /></Protected>} />
      <Route path="/puzzles"         element={<Protected><Puzzles /></Protected>} />
      <Route path="/gauntlet"        element={<Protected><Gauntlet /></Protected>} />
      <Route path="*"                element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
