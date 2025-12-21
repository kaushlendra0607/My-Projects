import React, { useState } from 'react'
import api from '../config/api.js';
import { toast } from "react-toastify";
import { Helmet } from "react-helmet";
import './login.css';

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
    <section className='login'>
      <Helmet>
        <title>{currentState === "Login" ? "Login" : "Sign Up"}</title>
        <meta
          name="description"
          content={currentState === "Login"
            ? "Login to your account to manage events, track attendance, and view your history."
            : "Join the best Event Management Platform. Create an account to start participating in college events."}
        />
      </Helmet>
      <form onSubmit={onSubmitHandler} className='login-form'>

        <h2 className='login-head'>{currentState}</h2>

        {/* --- Fields for Sign Up Only --- */}
        {currentState === "Sign Up" && (
          <>
            <input type="text" placeholder='Full Name' required
              value={fullName} onChange={(e) => setFullName(e.target.value)}
              className='login-input' />

            <input type="text" placeholder='User Name' required
              value={userName} onChange={(e) => setUserName(e.target.value)}
              className='login-input' />

            <input type="number" placeholder='Batch Year' required
              value={batch} onChange={(e) => setBatch(e.target.value)}
              className='login-input' />

            <label className="profile-label">Profile Picture</label>
            {/* 🛑 FIX: No 'value' attribute here! */}
            <input type="file" required
              onChange={(e) => setAvatar(e.target.files[0])}
              className='login-input' />
          </>
        )}

        {/* --- Common Fields --- */}
        <input type="email" placeholder='Email' required
          value={email} onChange={(e) => setEmail(e.target.value)}
          className='login-input' autoComplete='username' />

        <input type="password" placeholder='Password' required
          value={password} onChange={(e) => setPassword(e.target.value)}
          className='login-input' autoComplete={ currentState === "Login" ? "current-password" : "new-password" } />

        <button type='submit' disabled={isLoading} className='submit'>
          {isLoading ? "Processing..." : (currentState === "Sign Up" ? "Create Account" : "Login")}
        </button>

        {/* --- Toggle Switch --- */}
        <p className='options' onClick={() => setCurrentState(currentState === "Login" ? "Sign Up" : "Login")}>
          {currentState === "Login"
            ? "New here? Create an account"
            : "Already have an account? Login here"}
        </p>

      </form>
      <img src="https://i.pinimg.com/736x/f2/32/6f/f2326fb1bb41b112b7bca9f358eebae1.jpg"
       alt="Event Image" className='event-img' />
    </section>
  )
}

export default LoginPage;