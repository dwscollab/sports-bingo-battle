// src/components/CameraVerifyModal.jsx
import { useEffect, useState } from 'react';
import { useCamera } from '../hooks/useCamera.js';

export default function CameraVerifyModal({ square, sport, location, onVerified, onClose }) {
  const {
    videoRef, canvasRef,
    permission, capturedImage, verifyStatus, verifyResult,
    requestCamera, stopCamera, capturePhoto, verifyPhoto, resetCapture,
    isCameraSupported,
  } = useCamera();

  const [step, setStep] = useState('intro'); // intro | camera | preview | verifying | result

  useEffect(() => () => stopCamera(), [stopCamera]);

  const handleOpenCamera = async () => {
    const ok = await requestCamera('environment');
    if (ok) setStep('camera');
  };

  const handleCapture = () => { capturePhoto(); setStep('preview'); };

  const handleVerify = async () => {
    setStep('verifying');
    const result = await verifyPhoto({ squareText: square.text, sport, location });
    setStep('result');
    if (result?.verified) setTimeout(() => onVerified(), 1800);
  };

  const handleRetry = () => { resetCapture(); setStep('intro'); };

  return (
    <div className="overlay" style={{ zIndex: 200 }}>
      <div className="modal" style={{ border: '2px solid var(--gold)', maxWidth: 380 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 28 }}>📷</span>
          <div>
            <div className="modal-title" style={{ color: 'var(--gold)', marginBottom: 2 }}>Camera Verify</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Prove it for fair play!</div>
          </div>
        </div>

        <div style={{
          background: 'var(--surface2)', border: '1.5px solid var(--gold)',
          borderRadius: 10, padding: '10px 14px', marginBottom: 16,
          fontSize: 14, fontWeight: 700, color: 'var(--gold)', textAlign: 'center',
        }}>
          "{square.text}"
        </div>

        {step === 'intro' && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.7 }}>
              This square needs photo proof!<br />Take a photo — AI referee verifies it.
            </p>
            {!isCameraSupported && <p style={{ color: 'var(--accent)', fontSize: 12, marginBottom: 12 }}>⚠️ Camera not available</p>}
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
              {isCameraSupported
                ? <button className="btn btn-gold" onClick={handleOpenCamera}>📷 Open Camera</button>
                : <button className="btn btn-secondary" onClick={onVerified}>Mark Anyway</button>
              }
            </div>
          </div>
        )}

        {step === 'camera' && (
          <div>
            <div style={{ width: '100%', aspectRatio: '4/3', borderRadius: 10, overflow: 'hidden', background: '#000', marginBottom: 12, position: 'relative' }}>
              <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', inset: 0, border: '2px solid var(--gold)', borderRadius: 10, pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.7)', padding: '4px 12px', borderRadius: 20, fontSize: 11, color: '#fff', whiteSpace: 'nowrap' }}>
                Frame: "{square.text}"
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => { stopCamera(); setStep('intro'); }}>← Back</button>
              <button className="btn btn-gold" onClick={handleCapture} style={{ fontSize: 18 }}>📸 Snap</button>
            </div>
          </div>
        )}

        {step === 'preview' && capturedImage && (
          <div>
            <div style={{ width: '100%', aspectRatio: '4/3', borderRadius: 10, overflow: 'hidden', background: '#000', marginBottom: 12 }}>
              <img src={capturedImage.dataUrl} alt="Captured" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, textAlign: 'center' }}>Happy? Send to the AI referee.</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={handleRetry}>Retake</button>
              <button className="btn btn-primary" onClick={handleVerify}>🏁 Verify It</button>
            </div>
          </div>
        )}

        {step === 'verifying' && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }} className="pulse">⚖️</div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>AI Referee reviewing…</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Checking photo vs "{square.text}"</div>
          </div>
        )}

        {step === 'result' && verifyResult && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>{verifyResult.verified ? '✅' : '❌'}</div>
            <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 8, color: verifyResult.verified ? 'var(--green)' : 'var(--accent)' }}>
              {verifyResult.verified ? 'VERIFIED!' : 'Not Verified'}
            </div>
            <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--text-muted)', marginBottom: 14, fontStyle: 'italic' }}>
              "{verifyResult.reason}"
            </div>
            {verifyResult.confidence !== undefined && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 14 }}>
                Confidence: {Math.round((verifyResult.confidence || 0) * 100)}%
              </div>
            )}
            {verifyResult.verified
              ? <div style={{ color: 'var(--green)', fontWeight: 600 }}>Square marked! 🎉</div>
              : <div className="modal-actions">
                  <button className="btn btn-secondary" onClick={onClose}>Close</button>
                  <button className="btn btn-primary" onClick={handleRetry}>Try Again</button>
                </div>
            }
          </div>
        )}

        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    </div>
  );
}
