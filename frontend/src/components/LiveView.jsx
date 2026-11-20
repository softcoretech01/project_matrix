// Global live-view UI: worker consent prompt + "LIVE" banner, and admin viewer.
// Rendered once in the app shell; driven entirely by useLive().
import React, { useEffect, useRef } from 'react';
import { Modal } from './ui';
import { useLive } from './useLiveSignaling';

// <video> that binds a MediaStream to srcObject.
function StreamVideo({ stream, muted, style }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && stream) { ref.current.srcObject = stream; ref.current.play?.().catch(() => {}); }
  }, [stream]);
  return <video ref={ref} autoPlay playsInline muted={muted} style={style} />;
}

export default function LiveView() {
  const live = useLive();
  if (!live) return null;
  const { incoming, session, remoteStream, localStream, acceptIncoming, rejectIncoming, endSession } = live;

  return (
    <>
      {/* ---- Worker: incoming request consent prompt ---- */}
      {incoming && (
        <Modal title="Live view request" onClose={rejectIncoming} size="sm"
          footer={<>
            <button className="btn btn-secondary" onClick={rejectIncoming}>Deny</button>
            <button className="btn btn-primary" onClick={acceptIncoming}><i className="ph ph-video-camera"></i> Allow</button>
          </>}>
          <div style={{ textAlign: 'center', padding: '6px 4px' }}>
            <i className="ph ph-video-camera" style={{ fontSize: '2.4rem', color: '#059669' }}></i>
            <p style={{ margin: '12px 0 4px', fontWeight: 600 }}>{incoming.fromName} wants to view your camera &amp; microphone.</p>
            <p className="text-secondary" style={{ fontSize: '0.85rem' }}>
              Your live video and audio will be shared until you press Stop. Nothing is recorded.
            </p>
          </div>
        </Modal>
      )}

      {/* ---- Worker: persistent LIVE banner while streaming ---- */}
      {session?.role === 'worker' && (
        <div style={{
          position: 'fixed', right: 18, bottom: 18, zIndex: 4000, width: 230,
          background: '#0f172a', color: '#fff', borderRadius: 12, overflow: 'hidden',
          boxShadow: '0 10px 30px rgba(0,0,0,.35)', border: '1px solid rgba(255,255,255,.1)',
        }}>
          <div style={{ position: 'relative', background: '#000' }}>
            <StreamVideo stream={localStream} muted style={{ width: '100%', display: 'block', maxHeight: 150, objectFit: 'cover' }} />
            <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(0,0,0,.55)', padding: '3px 9px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#ef4444', animation: 'pulse 1s infinite' }}></span>
              LIVE
            </div>
          </div>
          <div style={{ padding: '8px 10px' }}>
            <div style={{ fontSize: '0.78rem', lineHeight: 1.3 }}>
              <strong>{session.peerName}</strong> is viewing your camera &amp; mic.
            </div>
            <button className="btn btn-sm btn-danger" style={{ width: '100%', marginTop: 8 }} onClick={endSession}>
              <i className="ph ph-stop"></i> Stop sharing
            </button>
          </div>
        </div>
      )}

      {/* ---- Admin: live viewer ---- */}
      {session?.role === 'admin' && (
        <Modal title={`Live view — ${session.peerName}`} onClose={endSession} size="lg"
          footer={<button className="btn btn-danger" onClick={endSession}><i className="ph ph-phone-x"></i> End</button>}>
          <div style={{ position: 'relative', background: '#000', borderRadius: 10, overflow: 'hidden', minHeight: 320 }}>
            {remoteStream
              ? <StreamVideo stream={remoteStream} muted={false} style={{ width: '100%', display: 'block', maxHeight: 460, objectFit: 'contain' }} />
              : (
                <div style={{ color: '#fff', textAlign: 'center', padding: '80px 20px' }}>
                  <i className="ph ph-circle-notch" style={{ fontSize: '2rem', display: 'inline-block', animation: 'spin 1s linear infinite' }}></i>
                  <p style={{ marginTop: 12 }}>
                    {session.status === 'requesting' ? `Waiting for ${session.peerName} to allow…` : 'Connecting…'}
                  </p>
                </div>
              )}
            {remoteStream && (
              <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(0,0,0,.55)', color: '#fff', padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700 }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#ef4444', animation: 'pulse 1s infinite' }}></span>
                LIVE
              </div>
            )}
          </div>
          <p className="text-secondary" style={{ fontSize: '0.78rem', marginTop: 8 }}>
            {session.peerName} has allowed this live view and can stop it at any time.
          </p>
        </Modal>
      )}
    </>
  );
}
