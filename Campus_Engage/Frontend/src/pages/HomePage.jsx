import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const HomePage = () => {

  const {user, logOut} = useAuth();

  return (
    <>

    </>
  )
}

export default HomePage;
