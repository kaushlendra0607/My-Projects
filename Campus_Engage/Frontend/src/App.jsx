import { useEffect, useState } from 'react'
import { ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css'; // Important: Import the CSS for toasts
import './App.css'
import LoginPage from './pages/LoginPage.jsx';
import Header from './components/Header.jsx';
import { useAuth } from './context/AuthContext.jsx';

function App() {
  // 1. Optimization: Use a function inside useState
  // This ensures we only read from localStorage ONCE (on first load), not on every render.
  // const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const { user, loading } = useAuth();

  const [theme, setTheme] = useState(() => {
    // 1. Check Local Storage first (User has manually set a preference before)
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) return savedTheme;

    // 2. Check System Preference (The "First Time" visit logic)
    // window.matchMedia returns true if the query matches
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }

    // 3. Default Fallback
    return "light";
  });
  useEffect(() => {
    if (theme === "dark") {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);
  const toggleTheme = () => {
    setTheme((prev) => prev === "dark" ? "light" : "dark");
  }

  // useEffect(() => {
  //   // 2. Sync Logic: Update LocalStorage whenever token changes
  //   if (token) {
  //     localStorage.setItem('token', token);
  //   } else {
  //     localStorage.removeItem('token'); // Clear it if user logs out
  //   }
  // }, [token]);

  if (loading) return <div>Please Wait...</div>

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored" /* This makes them solid colors by default! */
      />

      {/* 3. Conditional Rendering: Show Dashboard if logged in, otherwise Login */}
      {user ? (
        <div>
          <Header toggleTheme={toggleTheme} theme={theme} />
          <main className='flex flex-col items-center justify-center min-h-screen'>
          </main>
        </div>
      ) : (
        <LoginPage toggleTheme={toggleTheme} theme={theme} />
      )}
    </>
  );
}

export default App;