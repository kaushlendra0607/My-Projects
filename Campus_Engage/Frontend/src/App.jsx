import { useEffect, useState } from 'react'
import { ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css'; // 👈 Important: Import the CSS for toasts
import './App.css'
import LoginPage from './pages/LoginPage';

function App() {
  // 1. Optimization: Use a function inside useState
  // This ensures we only read from localStorage ONCE (on first load), not on every render.
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');

  useEffect(() => {
    // 2. Sync Logic: Update LocalStorage whenever token changes
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token'); // Clear it if user logs out
    }
  }, [token]);

  return (
    <>
      <ToastContainer />

      {/* 3. Conditional Rendering: Show Dashboard if logged in, otherwise Login */}
      {token ? (
        <main className='flex flex-col items-center justify-center min-h-screen'>
           {/* Placeholder for your future Dashboard/Event Components */}
           <h1 className='text-3xl font-bold mb-4'>Welcome Back! 🚀</h1>
           <p className='text-gray-600 mb-6'>You are securely logged in.</p>

           {/* Logout Button */}
           <button 
             onClick={() => setToken("")} 
             className='bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700 transition'
           >
             Logout
           </button>
        </main>
      ) : (
        <LoginPage setToken={setToken} />
      )}
    </>
  );
}

export default App;