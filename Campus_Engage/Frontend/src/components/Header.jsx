import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { NavLink } from 'react-router-dom';
import api from '../config/api.js';
import { toast } from 'react-toastify';
import styles from './header.module.css';

const Header = ({ theme, toggleTheme }) => {

  const { user, logout } = useAuth();
  const logOutHandler = async () => {
    try {
      // 1. Attempt to tell server "Delete this session"
      // We await it, but we don't depend on it being perfect.
      await api.post('/api/users/logout');

    } catch (error) {
      // Optional: Log it for debugging, but don't stop the user.
      console.error("Logout API failed, forcing local logout", error);
    } finally {
      // 2. THE GOLDEN RULE: Force Local Cleanup ALWAYS
      // This runs whether the API succeeded (200) or Failed (500/Network Error)

      logout(); // 👈 This function from Context handles everything (Token + Redirect)

      toast.success("Logged Out");
    }
  }

  return (
    <header className={styles.header}>
      {/* 1. LOGO SECTION */}
      <NavLink to="/" className={styles.logoLink}>
        <img
          className={styles.logo}
          src={
            theme === "dark" ?
              'https://www.onlinelogomaker.com/blog/wp-content/uploads/2017/10/nightclub-logo.jpg' :
              'https://tse3.mm.bing.net/th/id/OIP.Sd57IDQ4o6x0corOjwJw6wHaEL?cb=ucfimg2&ucfimg=1&w=674&h=381&rs=1&pid=ImgDetMain&o=7&rm=3'
          }
          alt="Logo"
        />
      </NavLink>

      {/* 2. NAVIGATION SECTION */}
      <div className={styles.navContainer}>

        {/* Theme Toggle */}
        <button onClick={toggleTheme} className={styles.themeBtn}>
          {theme === "dark" ? "☀️" : "🌙"}
        </button>

        <nav>
          <ul className={styles.navList}>

            {/* Standard Link */}
            <li>
              <NavLink
                to={'/events'}
                className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link}
              >
                Events
              </NavLink>
            </li>

            {/* 🚀 DROPDOWN MENU (Chief/Admin Only) */}
            {(user?.role === "CHIEF" || user?.role === "ADMIN") &&
              <li className={styles.dropdownParent}>
                <span className={styles.link}>Admin Tools ▾</span>

                {/* The Dropdown Content */}
                <ul className={styles.dropdownMenu}>
                  <li><NavLink to={'/events'} className={styles.dropdownLink}>Manage Events</NavLink></li>
                  <li><NavLink to={'/create-event'} className={styles.dropdownLink}>Create Event</NavLink></li>
                  <li><NavLink to={'/users'} className={styles.dropdownLink}>Manage Users</NavLink></li>
                </ul>
              </li>
            }

            <li>
              <NavLink to={'/registrations'} className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link}>Registrations</NavLink>
            </li>

            <li>
              <NavLink to={'/history'} className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link}>History</NavLink>
            </li>
          </ul>
        </nav>

        {/* 3. USER ACTIONS */}
        <div className={styles.userActions}>
          <NavLink to={'/profile'} className={styles.avatarLink}>
            <img
              src={user?.avatar || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
              alt="Profile"
              className={styles.avatar}
            />
          </NavLink>

          <button onClick={logOutHandler} className={styles.logoutBtn}>Log Out</button>
        </div>

      </div>
    </header>
  )
}

export default Header;
