import React, { useState, useRef, useCallback } from 'react'
import api from '../config/api.js';
import { toast } from "react-toastify";
import { Helmet } from "react-helmet";
import './login.css';
import { useAuth } from '../context/AuthContext';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../utils/crop.js';
import { useNavigate } from 'react-router-dom';

const LoginPage = ({ toggleTheme, theme }) => {
  const navigate = useNavigate();
  const { login } = useAuth();
  // Toggle State: "Login" or "Sign Up"
  const [currentState, setCurrentState] = useState("Login");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const fileInputRef = useRef(null);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const passwordInputRef = useRef(null);

  // 1. Handle File Selection
  const onFileChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file); // 👈 Save the original file here!
      setImageSrc(URL.createObjectURL(file));
    }
  };

  // 2. Capture Crop Coordinates (Standard Library function)
  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // 2. User Clicks "Save Crop" (Just saves to memory, no API call)
  const handleCropSave = async () => {
    const blob = await getCroppedImg(imageSrc, croppedAreaPixels);
    setAvatar(blob); // Save the blob for later
    setImageSrc(null); // Close cropper UI
  };

  // User Clicks "Skip Cropping" (Upload Full Image)
  const handleSkipCrop = () => {
    setAvatar(selectedFile); // 👈 Save the ORIGINAL version
    setImageSrc(null);           // Close modal
  };
  const handleCancel = () => {
    setImageSrc(null);
    setSelectedFile(null);

    // 👈 3. The Magic Line: Wipes the "No file chosen" text
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const togglePasswordHandler = () => {
    // 1. Toggle the state
    setShowPassword((prev) => !prev);

    // 2. The Magic Fix: Immediately force focus back to input
    if (passwordInputRef.current) {
      passwordInputRef.current.focus();

      // Optional Pro-Tip: Move cursor to the end of the text
      // (Sometimes switching types resets cursor to start)
      const length = passwordInputRef.current.value.length;
      passwordInputRef.current.setSelectionRange(length, length);
    }
  }

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [userName, setUserName] = useState('');
  const [batch, setBatch] = useState('');
  const [avatar, setAvatar] = useState(false); // Stores the File object
  const [imageSrc, setImageSrc] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

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
          const { accessToken, user } = response.data.data;
          login(user, accessToken);
          toast.success("Registration Successful!");
          setCurrentState("Login"); // Switch to login after success
        }
        console.log(response);

      } else {
        // -----------------------------
        // 2. LOGIN LOGIC (JSON)
        // -----------------------------
        const response = await api.post("/api/users/login", { email, password });

        if (response.data.data) { // Store the Access Token
          const { accessToken, user } = response.data.data;
          login(user, accessToken);
          toast.success("Logged in successfully!");
        }
        console.log(response);
      }
    } catch (error) {
      // 1. Log it to see the structure (Debugging)
      console.log(error.response);

      // 2. Access the message safely
      // We use optional chaining (?.) just in case the server is completely dead
      const errorMessage = error.response?.data?.message || "Something went wrong";

      toast.error(errorMessage);
    } finally {
      // 2. CRITICAL: Explicitly move away from /login
      navigate('/', { replace: true });
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
      <button onClick={toggleTheme} className='theme-toggle'>
        {theme === "dark" ? "Light Mode" : "Dark Mode"}
      </button>
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
              onChange={onFileChange}
              onClick={(e) => (e.target.value = null)}
              ref={fileInputRef}
              className='login-input' />
            {imageSrc && (
              // 1. The outer dimmer (Backdrop)
              <div className='login-cropBackdrop'>

                {/* 2. The fixed-size box for the image */}
                <div className='login-cropContainer'>
                  <Cropper
                    image={imageSrc}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={onCropComplete}
                  // Optional: visual style for the non-cropped area
                  // cropShape="round" 
                  // showGrid={false}
                  />
                </div>

                {/* 3. The Buttons placed below the box */}
                <div className='login-cropActions'>
                  {/* Optional Cancel Button */}
                  <button
                    type="button"
                    onClick={handleCancel}
                    className='login-cancelBtn'
                  >
                    Cancel
                  </button>

                  {/* Option 2: Skip (Use Full Image) */}
                  <button
                    type="button"
                    onClick={handleSkipCrop}
                    className='login-skipBtn'// Style this like a secondary button
                  >
                    Upload Original
                  </button>

                  {/* Option 3: Crop */}
                  <button
                    type="button"
                    onClick={handleCropSave}
                    className='login-confirmBtn'
                  >
                    Crop & Save
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* --- Common Fields --- */}
        <input type="email" placeholder='Email' required
          value={email} onChange={(e) => setEmail(e.target.value)}
          className='login-input' autoComplete='username' />

        <div className='pass'>
          <input type={showPassword ? "text" : "password"} placeholder='Password' required
            value={password} onChange={(e) => setPassword(e.target.value)}
            ref={passwordInputRef}
            className='login-input pass-in'
            autoComplete={currentState === "Login" ? "current-password" : "new-password"} />
          {/* 2. The Toggle Button */}
          <span
            className="password-toggle"
            onClick={togglePasswordHandler}
          >
            {showPassword ? "🙈" : "👁️"}
            {/* Replace emojis with <FaEye /> icons later */}
          </span>
        </div>

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