import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { SocketContext } from './SocketContext';
export const SocketProvider = ({ children }) => {
  const { user, loading } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    let newSocket;
    
    // Only establish a socket connection if the user is authenticated, 
    // fully loaded, and email is verified.
    if (user && !loading && user.is_email_verified) {
      newSocket = io('http://localhost:5000', {
        withCredentials: true,
        transports: ['polling', 'websocket']
      });
      
      newSocket.on('connect_error', (err) => {
        console.warn('Global socket connection error:', err.message);
        if (err.message === 'xhr poll error') {
          console.error('Check if the backend server is running and CORS is configured.');
        }
      });

      newSocket.on('connect', () => {
        setSocket(newSocket);
      });
    }

    return () => {
      if (newSocket) {
        newSocket.disconnect();
        setSocket(null);
      }
    };
  }, [user, loading]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};
