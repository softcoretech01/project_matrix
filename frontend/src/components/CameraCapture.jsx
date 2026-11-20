import React, { useEffect, useRef, useState } from 'react';
import { Modal, toast } from './ui';

// Reusable camera modal supporting PHOTO capture and short, low-bitrate VIDEO recording.
// onCapture receives { kind: 'photo', dataUrl } or { kind: 'video', blob }.
const MAX_SECONDS = 10;                 // short clips to keep storage small
const VIDEO_BITS = 250000;              // ~250 kbps low bitrate
const AUDIO_BITS = 32000;

export default function CameraCapture({ onCapture, onClose, allowVideo = true }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const [mode, setMode] = useState('photo');       // photo | video
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [shot, setShot] = useState(null);          // photo dataUrl
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [recordedUrl, setRecordedUrl] = useState(null);
  const [recordedBlob, setRecordedBlob] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!window.isSecureContext || !(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
          throw new Error('insecure');
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 15 } },
          audio: allowVideo,       // only need audio when video recording is enabled
        });
        if (!active) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play().catch(() => {}); }
        setReady(true);
      } catch (e) {
        if (!window.isSecureContext || !(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
          setError('Camera needs a secure (HTTPS) connection. Open the app over https:// — an http:// address by IP is blocked by the browser.');
        } else {
          setError('Camera access was denied or is unavailable. Please allow camera permission in your browser.');
        }
      }
    })();
    return () => {
      active = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (recorderRef.current && recorderRef.current.state === 'recording') recorderRef.current.stop();
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    };
  }, []); // eslint-disable-line

  // ---- Photo ----
  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    setShot(canvas.toDataURL('image/jpeg', 0.8));
  };

  // ---- Video ----
  const startRecording = () => {
    const stream = streamRef.current;
    if (!stream) return;
    chunksRef.current = [];
    let rec;
    const opts = { videoBitsPerSecond: VIDEO_BITS, audioBitsPerSecond: AUDIO_BITS };
    try { rec = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8,opus', ...opts }); }
    catch { try { rec = new MediaRecorder(stream, opts); } catch { rec = new MediaRecorder(stream); } }
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunksRef.current.push(e.data); };
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      setRecordedBlob(blob);
      setRecordedUrl(URL.createObjectURL(blob));
    };
    rec.start();
    recorderRef.current = rec;
    setRecording(true);
    setElapsed(0);
    timerRef.current = setInterval(() => {
      setElapsed((s) => {
        if (s + 1 >= MAX_SECONDS) stopRecording();
        return s + 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (recorderRef.current && recorderRef.current.state === 'recording') recorderRef.current.stop();
    setRecording(false);
  };

  const reset = () => {
    setShot(null);
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedUrl(null); setRecordedBlob(null); setElapsed(0);
  };

  const stopStream = () => { if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop()); };

  const confirm = () => {
    if (mode === 'photo' && shot) { onCapture({ kind: 'photo', dataUrl: shot }); stopStream(); onClose(); }
    else if (mode === 'video' && recordedBlob) { onCapture({ kind: 'video', blob: recordedBlob }); stopStream(); onClose(); }
  };

  const hasResult = (mode === 'photo' && shot) || (mode === 'video' && recordedUrl);

  let footer;
  if (hasResult) {
    footer = (
      <>
        <button className="btn btn-secondary" onClick={reset}><i className="ph ph-arrow-counter-clockwise"></i> {mode === 'photo' ? 'Retake' : 'Re-record'}</button>
        <button className="btn btn-primary" onClick={confirm}><i className="ph ph-check"></i> Use {mode === 'photo' ? 'Photo' : 'Video'}</button>
      </>
    );
  } else if (mode === 'photo') {
    footer = (<><button className="btn btn-secondary" onClick={onClose}>Cancel</button>
      <button className="btn btn-primary" onClick={capturePhoto} disabled={!ready}><i className="ph ph-camera"></i> Capture</button></>);
  } else {
    footer = (<><button className="btn btn-secondary" onClick={onClose}>Cancel</button>
      {recording
        ? <button className="btn btn-danger" onClick={stopRecording}><i className="ph ph-stop"></i> Stop ({MAX_SECONDS - elapsed}s)</button>
        : <button className="btn btn-primary" onClick={startRecording} disabled={!ready}><i className="ph-fill ph-record"></i> Record</button>}
    </>);
  }

  return (
    <Modal title={mode === 'photo' ? 'Capture Photo' : 'Record Video'} onClose={onClose} size="md" footer={footer}>
      {allowVideo && !hasResult && !recording && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, justifyContent: 'center' }}>
          <button className={`btn btn-sm ${mode === 'photo' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { reset(); setMode('photo'); }}>
            <i className="ph ph-camera"></i> Photo
          </button>
          <button className={`btn btn-sm ${mode === 'video' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { reset(); setMode('video'); }}>
            <i className="ph ph-video-camera"></i> Video
          </button>
        </div>
      )}

      {error ? (
        <div className="text-danger" style={{ textAlign: 'center', padding: 20 }}>
          <i className="ph ph-camera-slash" style={{ fontSize: '2.5rem' }}></i>
          <p style={{ marginTop: 10 }}>{error}</p>
        </div>
      ) : (
        <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#000', minHeight: 260 }}>
          {shot ? (
            <img src={shot} alt="capture" style={{ width: '100%', display: 'block' }} />
          ) : recordedUrl ? (
            <video src={recordedUrl} controls style={{ width: '100%', display: 'block' }} />
          ) : (
            <video ref={videoRef} playsInline muted style={{ width: '100%', display: 'block' }} />
          )}
          {recording && (
            <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(0,0,0,.6)', color: '#fff', padding: '4px 10px', borderRadius: 20, fontSize: '0.8rem' }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#ef4444', animation: 'pulse 1s infinite' }}></span>
              REC {elapsed}s / {MAX_SECONDS}s
            </div>
          )}
        </div>
      )}
      {mode === 'video' && !hasResult && (
        <p className="text-muted" style={{ fontSize: '0.78rem', textAlign: 'center', marginTop: 8 }}>
          Low-resolution clip, max {MAX_SECONDS}s — kept small for storage.
        </p>
      )}
    </Modal>
  );
}
