import React, { useState } from 'react'
import api from '../config/api.js';
import { toast } from "react-toastify";
import { Helmet } from "react-helmet";

const LoginPage = ({ setToken }) => {
  // Toggle State: "Login" or "Sign Up"
  const [currentState, setCurrentState] = useState("Login");
  const [isLoading, setIsLoading] = useState(false);

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [userName, setUserName] = useState('');
  const [batch, setBatch] = useState('');
  const [avatar, setAvatar] = useState(false); // Stores the File object

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (currentState === "Sign Up") {
        // -----------------------------
        // 1. REGISTER LOGIC (FormData)
        // -----------------------------
        const formData = new FormData();
        formData.append("fullName", fullName);
        formData.append("userName", userName);
        formData.append("email", email);
        formData.append("password", password);
        formData.append("batch", batch);

        // Only append avatar if user selected one
        if (avatar) {
          formData.append("avatar", avatar);
        }

        const response = await api.post('/api/users/register', formData, {
          headers: { "Content-Type": "multipart/form-data" } // Optional, axios sets it auto, but good for clarity
        });

        if (response.data.data) { // Standardize API response check
          toast.success("Registration Successful!");
          setCurrentState("Login"); // Switch to login after success
        }
        console.log(response);

      } else {
        // -----------------------------
        // 2. LOGIN LOGIC (JSON)
        // -----------------------------
        const response = await api.post("/api/users/login", { email, password });

        if (response.data.data) {
          setToken(response.data.data.accessToken); // Store the Access Token
          toast.success("Logged in successfully!");
        }
        console.log(response);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className='login-container'>
      <Helmet>
        <title>{currentState === "Login" ? "Login" : "Sign Up"}</title>
        <meta
          name="description"
          content={currentState === "Login"
            ? "Login to your account to manage events, track attendance, and view your history."
            : "Join the best Event Management Platform. Create an account to start participating in college events."}
        />
      </Helmet>
      <form onSubmit={onSubmitHandler} className='flex flex-col gap-4 w-[300px] m-auto mt-10'>

        <div className='flex justify-between items-center mb-4'>
          <h2 className='text-2xl font-bold'>{currentState}</h2>
        </div>

        {/* --- Fields for Sign Up Only --- */}
        {currentState === "Sign Up" && (
          <>
            <input type="text" placeholder='Full Name' required
              value={fullName} onChange={(e) => setFullName(e.target.value)}
              className='border p-2 rounded' />

            <input type="text" placeholder='User Name' required
              value={userName} onChange={(e) => setUserName(e.target.value)}
              className='border p-2 rounded' />

            <input type="number" placeholder='Batch Year' required
              value={batch} onChange={(e) => setBatch(e.target.value)}
              className='border p-2 rounded' />

            <label className="text-sm text-gray-600">Profile Picture</label>
            {/* 🛑 FIX: No 'value' attribute here! */}
            <input type="file" required
              onChange={(e) => setAvatar(e.target.files[0])}
              className='border p-2 rounded' />
          </>
        )}

        {/* --- Common Fields --- */}
        <input type="email" placeholder='Email' required
          value={email} onChange={(e) => setEmail(e.target.value)}
          className='border p-2 rounded' autoComplete='username' />

        <input type="password" placeholder='Password' required
          value={password} onChange={(e) => setPassword(e.target.value)}
          className='border p-2 rounded' autoComplete={ currentState === "Login" ? "current-password" : "new-password" } />

        <button type='submit' disabled={isLoading} className='bg-black text-white p-2 rounded'>
          {isLoading ? "Processing..." : (currentState === "Sign Up" ? "Create Account" : "Login")}
        </button>

        {/* --- Toggle Switch --- */}
        <p className='text-sm mt-2 cursor-pointer text-blue-600' onClick={() => setCurrentState(currentState === "Login" ? "Sign Up" : "Login")}>
          {currentState === "Login"
            ? "New here? Create an account"
            : "Already have an account? Login here"}
        </p>

      </form>
    </section>
  )
}

export default LoginPage;