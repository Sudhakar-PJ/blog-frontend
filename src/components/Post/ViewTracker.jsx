import React, { useEffect, useRef } from 'react';
import api from '../../api/axios';

const ViewTracker = ({ children, postId }) => {
  const elementRef = useRef(null);
  const timerRef = useRef(null);
  const viewedRef = useRef(false); // Prevent multiple reports for same mount

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !viewedRef.current) {
          // Start 3 second timer
          timerRef.current = setTimeout(async () => {
            try {
              await api.post(`/interactions/post/${postId}/view`);
              viewedRef.current = true;
              console.log(`Post ${postId} marked as seen`);
            } catch (err) {
              console.error('Failed to report view', err);
            }
          }, 3000);
        } else {
          // Cancel timer if post leaves screen before 3 seconds
          if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
          }
        }
      },
      { threshold: 0.6 } // Needs to be 60% visible
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      if (elementRef.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        observer.unobserve(elementRef.current);
      }
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [postId]);

  return <div ref={elementRef}>{children}</div>;
};

export default ViewTracker;
