import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';

// Import pages
import HomePage from './pages/HomePage';
import VideoDetail from './pages/VideoDetail';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import AdminDashboard from './pages/admin/AdminDashboard';
import PostDetail from './pages/PostDetail';
import ContentDetailPage from './pages/ContentDetailPage';

// Import components
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import PrivateRoute from './components/auth/PrivateRoute';
import AdminRoute from './components/auth/AdminRoute';

// Import pages
import VideoUploadPage from './pages/VideoUploadPage';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
    },
    secondary: {
      main: '#f48fb1',
    },
  },
});

function App() {
  // Set document title
  useEffect(() => {
    document.title = 'Megatron';
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navbar />
        <main style={{ flexGrow: 1, padding: '24px' }}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/video/:id" element={<VideoDetail />} />
            <Route path="/post/:id" element={<PostDetail />} />
            <Route path="/content/:id" element={<ContentDetailPage />} />
            
            {/* Protected Routes */}
            <Route element={<PrivateRoute />}>
              <Route path="/upload-content" element={<VideoUploadPage />} />
              <Route path="/upload" element={<VideoUploadPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>

            {/* Admin Routes */}
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminDashboard />}>
                <Route index element={<AdminDashboard defaultTab="dashboard" />} />
                <Route path="dashboard" element={<AdminDashboard defaultTab="dashboard" />} />
                <Route path="users" element={<AdminDashboard defaultTab="users" />} />
                <Route path="content" element={<AdminDashboard defaultTab="content" />} />
                <Route path="reports" element={<AdminDashboard defaultTab="reports" />} />
                <Route path="settings" element={<AdminDashboard defaultTab="settings" />} />
              </Route>
            </Route>
          </Routes>
        </main>
        <Footer />
      </div>
    </ThemeProvider>
  );
}

export default App;
