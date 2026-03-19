// src/hooks/useCamera.js
import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Provides camera stream access, photo capture, and Claude vision verification.
 */
export function useCamera() {
  const [stream, setStream] = useState(null);
  const [permission, setPermission] = useState('prompt'); // 'prompt' | 'granted' | 'denied'
  const [capturedImage, setCapturedImage] = useState(null); // { base64, mediaType, dataUrl }
  const [verifyStatus, setVerifyStatus] = useState('idle'); // 'idle' | 'verifying' | 'verified' | 'rejected' | 'error'
  const [verifyResult, setVerifyResult] = useState(null); // { verified, confidence, reason }
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Request camera access
  const requestCamera = useCallback(async (facingMode = 'environment') => {
    try {
      const constraints = {
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };
      const s = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(s);
      setPermission('granted');
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
      return true;
    } catch (err) {
      console.error('Camera access denied:', err);
      setPermission('denied');
      return false;
    }
  }, []);

  // Attach stream to video element when both are available
  useEffect(() => {
    if (stream && videoRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Stop the camera stream
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  // Capture a frame from the video as base64
  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;

    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    const base64  = dataUrl.split(',')[1];
    const captured = { base64, mediaType: 'image/jpeg', dataUrl };
    setCapturedImage(captured);
    stopCamera();
    return captured;
  }, [stopCamera]);

  // Send photo to Claude for verification
  const verifyPhoto = useCallback(async ({ squareText, sport, location, imageData }) => {
    const img = imageData || capturedImage;
    if (!img) return null;

    setVerifyStatus('verifying');
    setVerifyResult(null);

    try {
      const response = await fetch('/api/verify-camera', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: img.base64,
          mediaType: img.mediaType,
          squareText,
          sport,
          location,
        }),
        signal: AbortSignal.timeout(20_000),
      });

      if (!response.ok) throw new Error(`Server ${response.status}`);
      const result = await response.json();
      if (result.error) throw new Error(result.error);

      setVerifyResult(result);
      setVerifyStatus(result.verified ? 'verified' : 'rejected');
      return result;
    } catch (err) {
      console.error('Camera verify error:', err);
      setVerifyStatus('error');
      setVerifyResult({ verified: false, confidence: 0, reason: 'Verification service unavailable' });
      return null;
    }
  }, [capturedImage]);

  const resetCapture = useCallback(() => {
    setCapturedImage(null);
    setVerifyStatus('idle');
    setVerifyResult(null);
  }, []);

  return {
    videoRef,
    canvasRef,
    stream,
    permission,
    capturedImage,
    verifyStatus,
    verifyResult,
    requestCamera,
    stopCamera,
    capturePhoto,
    verifyPhoto,
    resetCapture,
    isCameraSupported: !!(navigator.mediaDevices?.getUserMedia),
  };
}
