import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import SetupProfile from './pages/SetupProfile';
import Profile from './pages/Profile';
import Explore from './pages/Explore';
import Notifications from './pages/Notifications';
import TweetDetail from './pages/TweetDetail';
import Search from './pages/Search';
import Settings from './pages/Settings';
import Messages from './pages/Messages';
import ChatWindow from './pages/ChatWindow';
import GroupChatWindow from './pages/GroupChatWindow';
import NewGroup from './pages/NewGroup';
import GroupSettings from './pages/GroupSettings';
import { Toaster } from 'sonner';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  if (profile && !profile.isSetupComplete && location.pathname !== '/setup') {
    return <Navigate to="/setup" replace />;
  }

  if (profile && profile.isSetupComplete && location.pathname === '/setup') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

function AppRoutes() {
  const { user, profile } = useAuth();
  
  return (
    <Routes>
      <Route path="/login" element={user && profile?.isSetupComplete ? <Navigate to="/" /> : <Login />} />
      <Route path="/signup" element={user && profile?.isSetupComplete ? <Navigate to="/" /> : <Signup />} />
      <Route path="/setup" element={
        <ProtectedRoute>
          <SetupProfile />
        </ProtectedRoute>
      } />
      
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Home />} />
        <Route path="explore" element={<Explore />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="profile/:id" element={<Profile />} />
        <Route path="tweet/:id" element={<TweetDetail />} />
        <Route path="search" element={<Search />} />
        <Route path="settings" element={<Settings />} />
        <Route path="messages" element={<Messages />} />
        <Route path="messages/c/:id" element={<ChatWindow />} />
        <Route path="messages/g/:id" element={<GroupChatWindow />} />
        <Route path="messages/new-group" element={<NewGroup />} />
        <Route path="messages/g/:id/settings" element={<GroupSettings />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster theme="dark" position="bottom-center" />
      </BrowserRouter>
    </AuthProvider>
  );
}
