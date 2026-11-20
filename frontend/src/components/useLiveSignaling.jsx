// Live camera/mic signaling + WebRTC, shared across the whole app.
// One-way stream: WORKER is the sender (offerer), ADMIN is the receiver (answerer).
// A worker must accept each request, so nothing starts without consent.
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, getToken, API_BASE_URL } from '../services/api';
import { toast } from './ui';

const LiveCtx = createContext(null);
export const useLive = () => useContext(LiveCtx);

function wsBase() {
  let origin;
  if (/^https?:\/\//.test(API_BASE_URL)) origin = API_BASE_URL.replace(/\/api\/?$/, '');
  else origin = window.location.origin;
  return origin.replace(/^http/, 'ws'); // http->ws, https->wss
}

const VIDEO_CONSTRAINTS = {
  video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 20 } },
  audio: true,
};

// Camera/mic only work in a secure context (HTTPS or localhost). On plain http://
// browsers hide navigator.mediaDevices entirely, so explain that rather than "denied".
function cameraUnavailable() {
  return !window.isSecureContext || !(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}
function cameraErrorMessage(e) {
  if (cameraUnavailable())
    return 'Camera needs a secure (HTTPS) connection. Open the app over https:// — http:// by IP is blocked by the browser.';
  if (e && (e.name === 'NotAllowedError' || e.name === 'SecurityError'))
    return 'Camera/microphone was blocked. Allow it in the browser’s site permissions and try again.';
  if (e && e.name === 'NotFoundError') return 'No camera/microphone found on this device.';
  return 'Could not access the camera/microphone.';
}

export function LiveSignalingProvider({ children }) {
  const { user } = useAuth();
  const wsRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const iceServersRef = useRef([{ urls: 'stun:stun.l.google.com:19302' }]);
  const sessionRef = useRef(null);          // { role, peerId, peerName, sessionId }
  const pendingIce = useRef([]);            // ICE candidates arriving before remoteDescription
  const reconnectRef = useRef(null);

  const [incoming, setIncoming] = useState(null);   // worker: { from, fromName, sessionId }
  const [captureReq, setCaptureReq] = useState(null); // worker: { from, fromName, mode, sessionId }
  const [capturing, setCapturing] = useState(false); // worker: a capture is in progress
  const [captureTick, setCaptureTick] = useState(0);  // admin: bumps when a capture lands
  const [session, setSession] = useState(null);     // active session (admin or worker)
  const [remoteStream, setRemoteStream] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [micOn, setMicOn] = useState(true);         // worker: is the shared mic live?

  const setSess = (s) => { sessionRef.current = s; setSession(s); };

  const send = useCallback((obj) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
  }, []);

  const teardown = useCallback((notifyPeer) => {
    const s = sessionRef.current;
    if (notifyPeer && s?.peerId) send({ type: 'end', to: s.peerId, sessionId: s.sessionId });
    if (pcRef.current) { try { pcRef.current.close(); } catch { /* noop */ } pcRef.current = null; }
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach((t) => t.stop()); localStreamRef.current = null; }
    pendingIce.current = [];
    setLocalStream(null);
    setRemoteStream(null);
    setMicOn(true);
    setSess(null);
  }, [send]);

  // Worker: mute/unmute the shared microphone (toggles the audio track locally; no renegotiation).
  const toggleMic = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const tracks = stream.getAudioTracks();
    if (!tracks.length) return;
    const next = !tracks[0].enabled;
    tracks.forEach((t) => { t.enabled = next; });
    setMicOn(next);
  }, []);

  const flushIce = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription) return;
    const q = pendingIce.current; pendingIce.current = [];
    for (const c of q) { try { await pc.addIceCandidate(c); } catch { /* noop */ } }
  }, []);

  const newPeer = useCallback((peerId) => {
    const pc = new RTCPeerConnection({ iceServers: iceServersRef.current });
    pc.onicecandidate = (e) => { if (e.candidate) send({ type: 'ice', to: peerId, candidate: e.candidate }); };
    pc.ontrack = (e) => setRemoteStream(e.streams[0]);
    pc.onconnectionstatechange = () => {
      if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) {
        // give 'disconnected' a moment; only tear down on terminal states
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') teardown(false);
      }
    };
    pcRef.current = pc;
    return pc;
  }, [send, teardown]);

  // ---- Admin: request to view a worker ----
  const requestView = useCallback((worker) => {
    if (!worker?.id) return;
    const sessionId = Math.random().toString(36).slice(2) + Date.now().toString(36);
    setSess({ role: 'admin', peerId: worker.id, peerName: worker.name, sessionId, status: 'requesting' });
    setRemoteStream(null);
    send({ type: 'request', to: worker.id, sessionId });
  }, [send]);

  // ---- Worker: accept the incoming request (grants camera + mic) ----
  const acceptIncoming = useCallback(async () => {
    const req = incoming;
    if (!req) return;
    let stream;
    try {
      if (cameraUnavailable()) throw new Error('insecure');
      stream = await navigator.mediaDevices.getUserMedia(VIDEO_CONSTRAINTS);
    } catch (e) {
      toast.error(cameraErrorMessage(e));
      send({ type: 'reject', to: req.from, sessionId: req.sessionId });
      setIncoming(null);
      return;
    }
    localStreamRef.current = stream;
    setLocalStream(stream);
    setSess({ role: 'worker', peerId: req.from, peerName: req.fromName, sessionId: req.sessionId, status: 'live' });
    setIncoming(null);

    const pc = newPeer(req.from);
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    send({ type: 'accept', to: req.from, sessionId: req.sessionId });
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    send({ type: 'offer', to: req.from, sessionId: req.sessionId, sdp: pc.localDescription });
  }, [incoming, newPeer, send]);

  const rejectIncoming = useCallback(() => {
    if (incoming) send({ type: 'reject', to: incoming.from, sessionId: incoming.sessionId });
    setIncoming(null);
  }, [incoming, send]);

  // ---- Admin: ask a worker to capture a photo/short video from their camera ----
  const requestCapture = useCallback((worker, mode = 'photo') => {
    if (!worker?.id) return;
    const sessionId = Math.random().toString(36).slice(2) + Date.now().toString(36);
    send({ type: 'capture', to: worker.id, mode, sessionId });
    toast.success(`Requested a ${mode} from ${worker.name}. It appears here once they allow it.`);
  }, [send]);

  // ---- Worker: accept a capture request -> take it with their camera and upload ----
  const CAPTURE_VIDEO_SECONDS = 6;
  const acceptCapture = useCallback(async () => {
    const req = captureReq;
    if (!req) return;
    setCaptureReq(null);
    setCapturing(true);
    let stream;
    try {
      if (cameraUnavailable()) throw new Error('insecure');
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
        audio: req.mode === 'video',
      });
    } catch (e) {
      toast.error(cameraErrorMessage(e));
      send({ type: 'capture-done', to: req.from, sessionId: req.sessionId, status: 'denied' });
      setCapturing(false);
      return;
    }
    try {
      if (req.mode === 'video') {
        const chunks = [];
        let rec;
        try { rec = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8,opus', videoBitsPerSecond: 300000, audioBitsPerSecond: 32000 }); }
        catch { rec = new MediaRecorder(stream); }
        rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
        const done = new Promise((res) => { rec.onstop = res; });
        rec.start();
        await new Promise((r) => setTimeout(r, CAPTURE_VIDEO_SECONDS * 1000));
        if (rec.state === 'recording') rec.stop();
        await done;
        const blob = new Blob(chunks, { type: 'video/webm' });
        const fd = new FormData();
        fd.append('file', new File([blob], `remote_${Date.now()}.webm`, { type: 'video/webm' }));
        fd.append('activityType', 'remote-video');
        await api.upload('/camera/video', fd);
      } else {
        const video = document.createElement('video');
        video.srcObject = stream; video.muted = true; video.playsInline = true;
        await video.play().catch(() => {});
        await new Promise((r) => setTimeout(r, 600)); // let exposure settle
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640; canvas.height = video.videoHeight || 480;
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        await api.post('/camera', { image: canvas.toDataURL('image/jpeg', 0.8), activityType: 'remote-capture' });
      }
      toast.success(`Shared a ${req.mode} with ${req.fromName}.`);
      send({ type: 'capture-done', to: req.from, sessionId: req.sessionId, status: 'done', mode: req.mode });
    } catch (e) {
      toast.error('Could not share the capture.');
      send({ type: 'capture-done', to: req.from, sessionId: req.sessionId, status: 'error' });
    } finally {
      stream.getTracks().forEach((t) => t.stop());
      setCapturing(false);
    }
  }, [captureReq, send]);

  const rejectCapture = useCallback(() => {
    if (captureReq) send({ type: 'capture-done', to: captureReq.from, sessionId: captureReq.sessionId, status: 'denied' });
    setCaptureReq(null);
  }, [captureReq, send]);

  const endSession = useCallback(() => teardown(true), [teardown]);

  // ---- WebSocket message handling ----
  const onMessage = useCallback(async (msg) => {
    const s = sessionRef.current;
    switch (msg.type) {
      case 'incoming':
        // Worker receives a request. Ignore if already busy.
        if (!sessionRef.current && !incoming) setIncoming({ from: msg.from, fromName: msg.fromName, sessionId: msg.sessionId });
        else send({ type: 'reject', to: msg.from, sessionId: msg.sessionId });
        break;
      case 'capture':
        // Worker: admin asked to capture a photo/video. Ignore if busy.
        if (!sessionRef.current && !incoming && !captureReq)
          setCaptureReq({ from: msg.from, fromName: msg.fromName, mode: msg.mode || 'photo', sessionId: msg.sessionId });
        else send({ type: 'capture-done', to: msg.from, sessionId: msg.sessionId, status: 'denied' });
        break;
      case 'capture-done':
        // Admin: the worker finished (or declined) a capture.
        if (msg.status === 'done') { toast.success('New capture added to the logs.'); setCaptureTick((t) => t + 1); }
        else if (msg.status === 'denied') toast.error('The employee declined the capture.');
        else toast.error('The capture did not complete.');
        break;
      case 'unavailable':
        if (s?.role === 'admin') { toast.error(`${s.peerName} is offline.`); setSess(null); }
        break;
      case 'reject':
        if (s?.role === 'admin') { toast.error(`${s.peerName} declined.`); teardown(false); }
        break;
      case 'accept':
        // Admin: worker accepted -> prepare to receive the offer.
        if (s?.role === 'admin') { setSess({ ...s, status: 'connecting' }); newPeer(s.peerId); }
        break;
      case 'offer': {
        // Admin receives the worker's offer -> answer it.
        const pc = pcRef.current;
        if (!pc) return;
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        await flushIce();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        send({ type: 'answer', to: msg.from, sessionId: s?.sessionId, sdp: pc.localDescription });
        setSess((prev) => (prev ? { ...prev, status: 'live' } : prev));
        break;
      }
      case 'answer': {
        // Worker receives admin's answer.
        const pc = pcRef.current;
        if (pc) { await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp)); await flushIce(); }
        break;
      }
      case 'ice': {
        const pc = pcRef.current;
        if (!pc) return;
        if (pc.remoteDescription) { try { await pc.addIceCandidate(msg.candidate); } catch { /* noop */ } }
        else pendingIce.current.push(msg.candidate);
        break;
      }
      case 'end':
        teardown(false);
        if (incoming && incoming.sessionId === msg.sessionId) setIncoming(null);
        break;
      case 'error':
        if (s?.role === 'admin') { toast.error('Live view could not start.'); setSess(null); }
        break;
      default: break;
    }
  }, [incoming, captureReq, flushIce, newPeer, send, teardown]);

  // keep latest handler without reopening the socket
  const handlerRef = useRef(onMessage);
  useEffect(() => { handlerRef.current = onMessage; }, [onMessage]);

  // ---- Connect the WebSocket while logged in ----
  useEffect(() => {
    if (!user) return undefined;
    let closedByUs = false;

    api.get('/live/config').then((c) => { if (c?.iceServers?.length) iceServersRef.current = c.iceServers; }).catch(() => {});

    const connect = () => {
      const token = getToken();
      if (!token) return;
      const ws = new WebSocket(`${wsBase()}/api/live/ws?token=${encodeURIComponent(token)}`);
      wsRef.current = ws;
      ws.onmessage = (e) => { try { handlerRef.current(JSON.parse(e.data)); } catch { /* noop */ } };
      ws.onclose = () => {
        if (closedByUs) return;
        reconnectRef.current = setTimeout(connect, 3000); // simple backoff
      };
    };
    connect();

    return () => {
      closedByUs = true;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      teardown(true);
      if (wsRef.current) { try { wsRef.current.close(); } catch { /* noop */ } wsRef.current = null; }
    };
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const value = {
    incoming, session, remoteStream, localStream, micOn,
    captureReq, capturing, captureTick,
    requestView, acceptIncoming, rejectIncoming, endSession, toggleMic,
    requestCapture, acceptCapture, rejectCapture,
    isAdmin: user && (user.role === 'Admin' || user.role === 'Master'),
  };
  return <LiveCtx.Provider value={value}>{children}</LiveCtx.Provider>;
}
