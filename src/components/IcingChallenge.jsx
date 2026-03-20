// src/components/IcingChallenge.jsx
import { useState, useEffect, useRef } from 'react';

const COUNTDOWN_SECONDS = 60;

// Compress image to keep Firebase write small (~50KB max)
function compressImage(dataUrl, maxWidth = 320, quality = 0.6) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height, 1);
      canvas.width  = Math.round(img.width  * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl); // fallback to original
    img.src = dataUrl;
  });
}

export default function IcingChallenge({
  isHost,
  playerId,
  playerName,
  roomCode,
  onPostSelfie,
  onAdjudicate,   // async () => { penalizes loser, returns { loserName } | null }
  onDismiss,
}) {
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const [phase,       setPhase]       = useState('countdown'); // countdown | camera | preview | submitted | done
  const [penalized,   setPenalized]   = useState(null);
  const [stream,      setStream]      = useState(null);
  const [capturedUrl, setCapturedUrl] = useState(null);

  const videoRef   = useRef(null);
  const canvasRef  = useRef(null);
  const timerRef   = useRef(null);

  // ── Countdown ─────────────────────────────────────────────────────────────
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { clearInterval(timerRef.current); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  // ── Host adjudicates when timer expires ───────────────────────────────────
  // We add a 3-second grace period so late Firebase writes (selfie submissions)
  // can arrive before we read the submissions list.
  useEffect(() => {
    if (secondsLeft > 0 || !isHost) return;

    const GRACE_MS = 3000;
    const timer = setTimeout(async () => {
      // Read submissions fresh from Firebase — not from stale roomData prop
      const result = await onAdjudicate();
      if (result) setPenalized(result.loserName);
      setPhase('done');
    }, GRACE_MS);

    return () => clearTimeout(timer);
  }, [secondsLeft, isHost, onAdjudicate]);

  // ── Camera helpers ─────────────────────────────────────────────────────────
  const openCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
      setPhase('camera');
    } catch {
      // Camera denied — allow manual mark
      onPostSelfie(null);
      setPhase('submitted');
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
  };

  useEffect(() => {
    if (stream && videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  useEffect(() => () => stopCamera(), []); // cleanup on unmount

  const snapPhoto = () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width  = video.videoWidth  || 320;
    canvas.height = video.videoHeight || 240;
    canvas.getContext('2d').drawImage(video, 0, 0);
    setCapturedUrl(canvas.toDataURL('image/jpeg', 0.8));
    stopCamera();
    setPhase('preview');
  };

  const submitSelfie = async () => {
    setPhase('submitted');
    try {
      const compressed = await compressImage(capturedUrl);
      onPostSelfie(compressed);
    } catch {
      onPostSelfie(capturedUrl);
    }
  };

  // Colors
  const urgentColor = secondsLeft <= 10 ? '#ff4444' : secondsLeft <= 20 ? '#ffd700' : '#00b894';
  const pct = (secondsLeft / COUNTDOWN_SECONDS) * 100;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 300,
      background: 'rgba(0,0,0,0.94)',
      borderBottom: `3px solid ${urgentColor}`,
      boxShadow: `0 4px 30px ${urgentColor}44`,
      transition: 'border-color 0.3s',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px 8px' }}>
        <span style={{ fontSize: 26 }}>🧊</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 900, fontSize: 15, color: '#fff' }}>ICING! Selfie Challenge!</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Last to post a selfie loses a marked square</div>
        </div>
        <div style={{
          fontSize: 26, fontWeight: 900, color: urgentColor, minWidth: 44, textAlign: 'center',
          animation: secondsLeft <= 10 ? 'pulse 0.5s infinite' : 'none',
          transition: 'color 0.3s',
        }}>
          {secondsLeft}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: 'var(--surface2)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`, background: urgentColor,
          transition: 'width 1s linear, background 0.3s',
        }} />
      </div>

      {/* Content */}
      <div style={{ padding: '10px 16px 14px' }}>

        {/* COUNTDOWN — show camera button */}
        {phase === 'countdown' && (
          <button onClick={openCamera} style={{
            width: '100%', padding: 12,
            background: `linear-gradient(135deg, ${urgentColor}, ${urgentColor}99)`,
            border: 'none', borderRadius: 10, cursor: 'pointer',
            color: '#fff', fontWeight: 900, fontSize: 15,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            📸 Take Selfie Now!
          </button>
        )}

        {/* LIVE CAMERA */}
        {phase === 'camera' && (
          <>
            <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', marginBottom: 8 }}>
              <video ref={videoRef} autoPlay playsInline muted
                style={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block' }} />
              <div style={{
                position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.7)',
                borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700, color: urgentColor,
              }}>⏱ {secondsLeft}s</div>
            </div>
            <button onClick={snapPhoto} style={{
              width: '100%', padding: 12, background: urgentColor,
              border: 'none', borderRadius: 10, cursor: 'pointer',
              color: '#fff', fontWeight: 900, fontSize: 16,
            }}>📸 SNAP!</button>
          </>
        )}

        {/* PREVIEW */}
        {phase === 'preview' && capturedUrl && (
          <>
            <div style={{ borderRadius: 10, overflow: 'hidden', marginBottom: 8, maxHeight: 200 }}>
              <img src={capturedUrl} alt="preview"
                style={{ width: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setCapturedUrl(null); openCamera(); }}
                className="btn btn-secondary" style={{ flex: 1 }}>Retake</button>
              <button onClick={submitSelfie}
                style={{ flex: 2, padding: 10, background: urgentColor, border: 'none',
                  borderRadius: 10, cursor: 'pointer', color: '#fff', fontWeight: 900, fontSize: 14 }}>
                📤 Post Selfie!
              </button>
            </div>
          </>
        )}

        {/* SUBMITTED */}
        {phase === 'submitted' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#00b894', fontWeight: 700, fontSize: 14 }}>✅ Selfie posted! You're safe.</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
              Waiting for others… {secondsLeft}s left
            </div>
          </div>
        )}

        {/* DONE */}
        {phase === 'done' && (
          <div style={{ textAlign: 'center' }}>
            {penalized ? (
              <>
                <div style={{ color: '#ff4444', fontWeight: 900, fontSize: 14, marginBottom: 4 }}>
                  ❄️ {penalized} was last — loses a square!
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
                  A marked square has been removed from their card.
                </div>
              </>
            ) : (
              <div style={{ color: '#00b894', fontWeight: 700, marginBottom: 10 }}>
                Everyone posted in time! 🎉
              </div>
            )}
            <button onClick={onDismiss} className="btn btn-secondary btn-sm">Dismiss</button>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
