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
  const [session, setSession] = useState(null);     // active session (admin or worker)
  const [remoteStream, setRemoteStream] = useState(null);
  const [localStream, setLocalStream] = useState(null);

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
    setSess(null);
  }, [send]);

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
      stream = await navigator.mediaDevices.getUserMedia(VIDEO_CONSTRAINTS);
    } catch {
      toast.error('Camera/microphone permission denied.');
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
  }, [incoming, flushIce, newPeer, send, teardown]);

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
    incoming, session, remoteStream, localStream,
    requestView, acceptIncoming, rejectIncoming, endSession,
    isAdmin: user && (user.role === 'Admin' || user.role === 'Master'),
  };
  return <LiveCtx.Provider value={value}>{children}</LiveCtx.Provider>;
}
