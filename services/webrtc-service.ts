export interface WebRTCConfig {
  iceServers: RTCIceServer[]
  iceTransportPolicy?: RTCIceTransportPolicy
  iceCandidatePoolSize?: number
  turnServerRotation?: boolean
  maxBitrate?: number
  videoConstraints?: MediaTrackConstraints
  audioConstraints?: MediaTrackConstraints
}

export interface PeerConnectionData {
  id: string
  hostId: string
  connection: RTCPeerConnection
  localStream?: MediaStream
  remoteStream?: MediaStream
  dataChannel?: RTCDataChannel
  isInitiator: boolean
  connectionState: RTCPeerConnectionState
  iceConnectionState: RTCIceConnectionState
  candidateStats?: {
    host: number
    srflx: number
    relay: number
    prflx: number
  }
  selectedCandidatePair?: {
    local: {
      type: string
      protocol: string
      address: string
      port: number
    }
    remote: {
      type: string
      protocol: string
      address: string
      port: number
    }
    stats: {
      bytesSent: number
      bytesReceived: number
      totalRoundTripTime: number
      currentRoundTripTime: number
    }
  }
  qualityTierState?: QualityTierState
}

interface BitrateLadderTier {
  label: "HD" | "SD" | "Low Data" | "Data Saver"
  maxBitrate: number
  maxFramerate: number
  scaleResolutionDownBy: number
}

interface AdaptiveQualityState {
  hostId: string
  tierIndex: number
  consecutiveBadSamples: number
  consecutiveGoodSamples: number
  lastSample?: NetworkQualitySample
  samplingTimer?: ReturnType<typeof setInterval>
  previousOutboundBytes?: number
  previousOutboundTimestampMs?: number
  previousFramesEncoded?: number
  previousFramesDropped?: number
}

interface NetworkQualitySample {
  roundTripTimeMs: number
  packetLossRate: number
  outboundBitrateKbps: number
  frameDropRate: number
}

export interface QualityTierState {
  hostId: string
  tierLabel: BitrateLadderTier["label"]
  modeLabel: string
  tierIndex: number
  maxBitrate: number
  maxFramerate: number
  scaleResolutionDownBy: number
  sample?: NetworkQualitySample
}

export class WebRTCService {
  private static instance: WebRTCService
  private readonly maxReconnectAttempts = 5
  private readonly reconnectBaseDelayMs = 1000
  private readonly reconnectMaxDelayMs = 15000
  private readonly reconnectJitterRatio = 0.3
  private readonly disconnectedRecoveryDelayMs = 2000
  private readonly restartValidationWindowMs = 6000
  private peerConnections: Map<string, PeerConnectionData> = new Map()
  private localStream: MediaStream | null = null
  private config: WebRTCConfig
  private connectionListeners: ((connections: PeerConnectionData[]) => void)[] = []
  private streamListeners: ((hostId: string, stream: MediaStream | null) => void)[] = []
  private dataChannelListeners: ((hostId: string, data: any) => void)[] = []
  private qualityTierListeners: ((state: QualityTierState) => void)[] = []
  private adaptiveQualityStates: Map<string, AdaptiveQualityState> = new Map()

  private readonly bitrateLadder: BitrateLadderTier[] = [
    { label: "HD", maxBitrate: 2_500_000, maxFramerate: 30, scaleResolutionDownBy: 1 },
    { label: "SD", maxBitrate: 1_500_000, maxFramerate: 24, scaleResolutionDownBy: 1.25 },
    { label: "Low Data", maxBitrate: 900_000, maxFramerate: 20, scaleResolutionDownBy: 1.5 },
    { label: "Data Saver", maxBitrate: 500_000, maxFramerate: 15, scaleResolutionDownBy: 2 },
  ]
  private readonly sampleIntervalMs = 5000
  private readonly downshiftAfterBadIntervals = 3
  private readonly upshiftAfterGoodIntervals = 4

  private constructor() {
    this.config = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        {
          urls: [
            "turn:global.turn.twilio.com:3478?transport=udp",
            "turn:global.turn.twilio.com:3478?transport=tcp",
            "turn:global.turn.twilio.com:443?transport=tcp",
          ],
          username: "example_username", // Will be replaced with dynamic credentials
          credential: "example_password", // Will be replaced with dynamic credentials
          credentialType: "password",
        },
        {
          urls: ["turns:global.turn.twilio.com:443?transport=tcp"],
          username: "example_username", // Will be replaced with dynamic credentials
          credential: "example_password", // Will be replaced with dynamic credentials
          credentialType: "password",
        },
      ],
      iceTransportPolicy: "all", // Can be set to "relay" to force TURN usage
      iceCandidatePoolSize: 10,
      turnServerRotation: true,
      maxBitrate: 2500000, // 2.5 Mbps
      videoConstraints: {
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
        frameRate: { ideal: 30, max: 60 },
      },
      audioConstraints: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000,
      },
    }
  }

  public static getInstance(): WebRTCService {
    if (!WebRTCService.instance) {
      WebRTCService.instance = new WebRTCService()
    }
    return WebRTCService.instance
  }

  // Initialize local media stream
  public async initializeLocalStream(videoEnabled = true, audioEnabled = true): Promise<MediaStream> {
    try {
      const constraints: MediaStreamConstraints = {
        video: videoEnabled ? this.config.videoConstraints : false,
        audio: audioEnabled ? this.config.audioConstraints : false,
      }

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints)

      // Notify listeners about local stream
      this.notifyStreamListeners("local", this.localStream)

      return this.localStream
    } catch (error) {
      console.error("Failed to initialize local stream:", error)
      throw new Error(`Failed to access camera/microphone: ${error}`)
    }
  }

  // Create peer connection for a host
  public async createPeerConnection(hostId: string, isInitiator = false): Promise<PeerConnectionData> {
    const existing = this.getPeerConnectionByHostId(hostId)
    if (existing) {
      this.disposePeerConnection(existing)
      this.peerConnections.delete(existing.id)
    }

    const connectionId = `${hostId}-${Date.now()}`

    const peerConnection = new RTCPeerConnection({
      iceServers: this.config.iceServers,
      iceTransportPolicy: this.config.iceTransportPolicy || "all",
      iceCandidatePoolSize: this.config.iceCandidatePoolSize || 10,
    })

    const peerData: PeerConnectionData = {
      id: connectionId,
      hostId,
      connection: peerConnection,
      localStream: this.localStream || undefined,
      isInitiator,
      connectionState: peerConnection.connectionState,
      iceConnectionState: peerConnection.iceConnectionState,
    }

    // Add local stream tracks to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, this.localStream!)
      })
    }

    // Set up event handlers
    this.setupPeerConnectionHandlers(peerData)

    // Create data channel for the initiator
    if (isInitiator) {
      peerData.dataChannel = peerConnection.createDataChannel("hostData", {
        ordered: true,
      })
      this.setupDataChannelHandlers(peerData.dataChannel, hostId)
    }

    this.peerConnections.set(connectionId, peerData)
    this.initializeAdaptiveQuality(hostId)
    this.notifyConnectionListeners()

    return peerData
  }

  // Set up peer connection event handlers
  private setupPeerConnectionHandlers(peerData: PeerConnectionData) {
    const { connection, hostId } = peerData

    // Handle remote stream
    connection.ontrack = (event) => {
      console.log("Received remote track from", hostId)
      peerData.remoteStream = event.streams[0]
      this.notifyStreamListeners(hostId, event.streams[0])
    }

    // Handle ICE candidates with monitoring
    this.monitorIceCandidates(peerData)

    // Handle connection state changes
    connection.onconnectionstatechange = () => {
      peerData.connectionState = connection.connectionState
      console.log(`Connection state changed for ${hostId}:`, connection.connectionState)

      if (connection.connectionState === "connected") {
        // Update selected candidate pair when connected
        this.updateSelectedCandidatePair(hostId)
        this.startQualitySampling(hostId)
      }

      if (connection.connectionState === "failed" || connection.connectionState === "disconnected") {
        this.stopQualitySampling(hostId)
        this.handleConnectionFailure(peerData.id)
      }

      this.notifyConnectionListeners()
    }

    // Handle ICE connection state changes
    connection.oniceconnectionstatechange = () => {
      peerData.iceConnectionState = connection.iceConnectionState
      console.log(`ICE connection state changed for ${hostId}:`, connection.iceConnectionState)

      if (connection.iceConnectionState === "disconnected" || connection.iceConnectionState === "failed") {
        this.scheduleRecovery(peerData.id, connection.iceConnectionState)
      }

      if (connection.iceConnectionState === "connected" || connection.iceConnectionState === "completed") {
        this.markRecoverySuccess(hostId)
      }

      this.notifyConnectionListeners()
    }

    // Handle data channel for non-initiators
    connection.ondatachannel = (event) => {
      const dataChannel = event.channel
      peerData.dataChannel = dataChannel
      this.setupDataChannelHandlers(dataChannel, hostId)
    }
  }

  // Set up data channel handlers
  private setupDataChannelHandlers(dataChannel: RTCDataChannel, hostId: string) {
    dataChannel.onopen = () => {
      console.log(`Data channel opened with ${hostId}`)
    }

    dataChannel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        this.notifyDataChannelListeners(hostId, data)
      } catch (error) {
        console.error("Failed to parse data channel message:", error)
      }
    }

    dataChannel.onerror = (error) => {
      console.error(`Data channel error with ${hostId}:`, error)
    }

    dataChannel.onclose = () => {
      console.log(`Data channel closed with ${hostId}`)
    }
  }

  // Create and send offer
  public async createOffer(hostId: string): Promise<RTCSessionDescriptionInit> {
    const peerData = this.getPeerConnectionByHostId(hostId)
    if (!peerData) {
      throw new Error(`No peer connection found for host ${hostId}`)
    }

    try {
      const offer = await peerData.connection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      })

      await peerData.connection.setLocalDescription(offer)

      // In a real app, send this offer to the remote peer via signaling server
      this.sendSignalingMessage(hostId, {
        type: "offer",
        sdp: offer,
      })

      return offer
    } catch (error) {
      console.error("Failed to create offer:", error)
      throw error
    }
  }

  // Create and send answer
  public async createAnswer(hostId: string, offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    const peerData = this.getPeerConnectionByHostId(hostId)
    if (!peerData) {
      throw new Error(`No peer connection found for host ${hostId}`)
    }

    try {
      await peerData.connection.setRemoteDescription(offer)

      const answer = await peerData.connection.createAnswer()
      await peerData.connection.setLocalDescription(answer)

      // In a real app, send this answer to the remote peer via signaling server
      this.sendSignalingMessage(hostId, {
        type: "answer",
        sdp: answer,
      })

      return answer
    } catch (error) {
      console.error("Failed to create answer:", error)
      throw error
    }
  }

  // Handle received answer
  public async handleAnswer(hostId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const peerData = this.getPeerConnectionByHostId(hostId)
    if (!peerData) {
      throw new Error(`No peer connection found for host ${hostId}`)
    }

    try {
      await peerData.connection.setRemoteDescription(answer)
    } catch (error) {
      console.error("Failed to handle answer:", error)
      throw error
    }
  }

  // Handle received ICE candidate
  public async handleIceCandidate(hostId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const peerData = this.getPeerConnectionByHostId(hostId)
    if (!peerData) {
      console.warn(`No peer connection found for host ${hostId}`)
      return
    }

    try {
      await peerData.connection.addIceCandidate(candidate)
    } catch (error) {
      console.error("Failed to add ICE candidate:", error)
    }
  }

  // Send data via data channel
  public sendData(hostId: string, data: any): void {
    const peerData = this.getPeerConnectionByHostId(hostId)
    if (!peerData?.dataChannel || peerData.dataChannel.readyState !== "open") {
      console.warn(`Data channel not available for host ${hostId}`)
      return
    }

    try {
      peerData.dataChannel.send(JSON.stringify(data))
    } catch (error) {
      console.error("Failed to send data:", error)
    }
  }

  // Toggle local video
  public toggleVideo(enabled: boolean): void {
    if (!this.localStream) return

    const videoTracks = this.localStream.getVideoTracks()
    videoTracks.forEach((track) => {
      track.enabled = enabled
    })

    // Notify all peer connections about the change
    this.peerConnections.forEach((peerData) => {
      this.sendData(peerData.hostId, {
        type: "video-toggle",
        enabled,
      })
    })
  }

  // Toggle local audio
  public toggleAudio(enabled: boolean): void {
    if (!this.localStream) return

    const audioTracks = this.localStream.getAudioTracks()
    audioTracks.forEach((track) => {
      track.enabled = enabled
    })

    // Notify all peer connections about the change
    this.peerConnections.forEach((peerData) => {
      this.sendData(peerData.hostId, {
        type: "audio-toggle",
        enabled,
      })
    })
  }

  // Replace video track (for screen sharing)
  public async replaceVideoTrack(newTrack: MediaStreamTrack): Promise<void> {
    if (!this.localStream) return

    const oldVideoTrack = this.localStream.getVideoTracks()[0]
    if (oldVideoTrack) {
      this.localStream.removeTrack(oldVideoTrack)
      oldVideoTrack.stop()
    }

    this.localStream.addTrack(newTrack)

    // Update all peer connections
    for (const peerData of this.peerConnections.values()) {
      const sender = peerData.connection.getSenders().find((s) => s.track?.kind === "video")

      if (sender) {
        await sender.replaceTrack(newTrack)
      }
    }
  }

  // Start screen sharing
  public async startScreenShare(): Promise<MediaStream> {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          frameRate: { ideal: 30, max: 30 },
        },
        audio: true,
      })

      const videoTrack = screenStream.getVideoTracks()[0]
      if (videoTrack) {
        await this.replaceVideoTrack(videoTrack)

        // Handle screen share end
        videoTrack.onended = () => {
          this.stopScreenShare()
        }
      }

      return screenStream
    } catch (error) {
      console.error("Failed to start screen share:", error)
      throw error
    }
  }

  // Stop screen sharing
  public async stopScreenShare(): Promise<void> {
    try {
      // Get camera stream again
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: this.config.videoConstraints,
        audio: false, // Don't replace audio
      })

      const videoTrack = cameraStream.getVideoTracks()[0]
      if (videoTrack) {
        await this.replaceVideoTrack(videoTrack)
      }
    } catch (error) {
      console.error("Failed to stop screen share:", error)
    }
  }

  // Get connection statistics
  public async getConnectionStats(hostId: string): Promise<RTCStatsReport | null> {
    const peerData = this.getPeerConnectionByHostId(hostId)
    if (!peerData) return null

    try {
      return await peerData.connection.getStats()
    } catch (error) {
      console.error("Failed to get connection stats:", error)
      return null
    }
  }

  // Close peer connection
  public closePeerConnection(hostId: string): void {
    const peerData = this.getPeerConnectionByHostId(hostId)
    if (!peerData) return

    this.clearReconnectState(hostId)
    this.disposePeerConnection(peerData)

    // Remove from map
    this.peerConnections.delete(peerData.id)
    this.stopQualitySampling(hostId)
    this.adaptiveQualityStates.delete(hostId)
    this.notifyConnectionListeners()
  }

  // Close all resources for a single peer
  private disposePeerConnection(peerData: PeerConnectionData): void {
    const { connection, dataChannel } = peerData

    // Close data channel
    if (dataChannel) {
      dataChannel.close()
    }

    // Close peer connection
    connection.ontrack = null
    connection.onicecandidate = null
    connection.oniceconnectionstatechange = null
    connection.onconnectionstatechange = null
    connection.ondatachannel = null
    connection.close()
  }

  // Close all connections
  public closeAllConnections(): void {
    this.peerConnections.forEach((peerData) => {
      this.closePeerConnection(peerData.hostId)
    })

    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop())
      this.localStream = null
    }

    this.adaptiveQualityStates.forEach((state) => {
      if (state.samplingTimer) {
        clearInterval(state.samplingTimer)
      }
    })
    this.adaptiveQualityStates.clear()
  }

  // Get peer connection by host ID
  private getPeerConnectionByHostId(hostId: string): PeerConnectionData | undefined {
    return Array.from(this.peerConnections.values()).find((peerData) => peerData.hostId === hostId)
  }

  // Schedule timed connection recovery for ICE/connection failures
  private scheduleRecovery(connectionId: string, reason: "disconnected" | "failed"): void {
    const peerData = this.peerConnections.get(connectionId)
    if (!peerData) return

    const state = this.getReconnectState(peerData.hostId)
    state.pendingReason = reason

    if (state.inProgress) {
      return
    }

    if (state.timer) {
      clearTimeout(state.timer)
      state.timer = null
    }

    const delay = reason === "disconnected" ? this.disconnectedRecoveryDelayMs : 0
    state.timer = setTimeout(() => {
      this.attemptRecovery(peerData.hostId)
    }, delay)
  }

  private async attemptRecovery(hostId: string): Promise<void> {
    const peerData = this.getPeerConnectionByHostId(hostId)
    if (!peerData) {
      return
    }

    const state = this.getReconnectState(hostId)
    if (state.inProgress) return

    if (state.attempts >= this.maxReconnectAttempts) {
      this.emitReconnectStatus(hostId, "failed", "Unable to recover connection. Please reconnect.")
      return
    }

    state.inProgress = true
    state.recovering = true
    state.attempts += 1

    const retryDelay = this.getReconnectDelayMs(state.attempts)
    this.emitReconnectStatus(
      hostId,
      "reconnecting",
      `Reconnecting… (attempt ${state.attempts}/${this.maxReconnectAttempts})`,
    )

    state.timer = setTimeout(async () => {
      try {
        const restarted = await this.tryIceRestart(peerData)

        if (restarted) {
          this.armRestartValidation(hostId)
        } else {
          await this.rebuildPeerConnection(peerData)
          this.armRestartValidation(hostId)
        }
      } catch (error) {
        console.error(`Recovery attempt failed for host ${hostId}:`, error)
        state.inProgress = false
        this.scheduleRecovery(peerData.id, "failed")
      }
    }, retryDelay)
  }

  private async tryIceRestart(peerData: PeerConnectionData): Promise<boolean> {
    try {
      if (peerData.connection.signalingState === "closed") {
        return false
      }

      const restartOffer = await peerData.connection.createOffer({
        iceRestart: true,
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      })

      await peerData.connection.setLocalDescription(restartOffer)
      this.sendSignalingMessage(peerData.hostId, {
        type: "offer",
        sdp: restartOffer,
      })

      return true
    } catch (error) {
      console.warn(`ICE restart failed for host ${peerData.hostId}, rebuilding connection`, error)
      return false
    }
  }

  private async rebuildPeerConnection(peerData: PeerConnectionData): Promise<void> {
    const metadata = {
      id: peerData.id,
      hostId: peerData.hostId,
      isInitiator: peerData.isInitiator,
      remoteStream: peerData.remoteStream,
      candidateStats: peerData.candidateStats,
      selectedCandidatePair: peerData.selectedCandidatePair,
    }

    this.disposePeerConnection(peerData)

    const rebuilt = new RTCPeerConnection({
      iceServers: this.config.iceServers,
      iceTransportPolicy: this.config.iceTransportPolicy || "all",
      iceCandidatePoolSize: this.config.iceCandidatePoolSize || 10,
    })

    peerData.connection = rebuilt
    peerData.localStream = peerData.localStream || this.localStream || undefined
    peerData.remoteStream = metadata.remoteStream
    peerData.candidateStats = metadata.candidateStats
    peerData.selectedCandidatePair = metadata.selectedCandidatePair
    peerData.connectionState = rebuilt.connectionState
    peerData.iceConnectionState = rebuilt.iceConnectionState

    if (peerData.localStream) {
      peerData.localStream.getTracks().forEach((track) => {
        rebuilt.addTrack(track, peerData.localStream!)
      })
    }

    if (metadata.isInitiator) {
      peerData.dataChannel = rebuilt.createDataChannel("hostData", {
        ordered: true,
      })
      this.setupDataChannelHandlers(peerData.dataChannel, metadata.hostId)
    } else {
      peerData.dataChannel = undefined
    }

    this.setupPeerConnectionHandlers(peerData)
    this.peerConnections.set(metadata.id, peerData)
    this.notifyConnectionListeners()

    if (metadata.isInitiator) {
      const offer = await rebuilt.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      })

      await rebuilt.setLocalDescription(offer)
      this.sendSignalingMessage(metadata.hostId, {
        type: "offer",
        sdp: offer,
      })
    }
  }

  private armRestartValidation(hostId: string): void {
    const state = this.getReconnectState(hostId)
    if (state.validationTimer) {
      clearTimeout(state.validationTimer)
    }

    state.validationTimer = setTimeout(() => {
      const peerData = this.getPeerConnectionByHostId(hostId)
      if (!peerData) {
        return
      }

      if (!["connected", "completed"].includes(peerData.iceConnectionState)) {
        state.inProgress = false
        this.scheduleRecovery(peerData.id, "failed")
      }
    }, this.restartValidationWindowMs)

    state.inProgress = false
  }

  private markRecoverySuccess(hostId: string): void {
    const state = this.reconnectState.get(hostId)
    if (!state) return

    if (state.timer) {
      clearTimeout(state.timer)
    }
    if (state.validationTimer) {
      clearTimeout(state.validationTimer)
    }

    const wasRecovering = state.recovering
    this.reconnectState.delete(hostId)

    if (wasRecovering) {
      this.emitReconnectStatus(hostId, "recovered", "Recovered")
    }
  }

  private clearReconnectState(hostId: string): void {
    const state = this.reconnectState.get(hostId)
    if (!state) return

    if (state.timer) {
      clearTimeout(state.timer)
    }
    if (state.validationTimer) {
      clearTimeout(state.validationTimer)
    }

    this.reconnectState.delete(hostId)
  }

  private getReconnectState(hostId: string) {
    const current = this.reconnectState.get(hostId)
    if (current) {
      return current
    }

    const created = {
      attempts: 0,
      timer: null,
      validationTimer: null,
      inProgress: false,
      recovering: false,
      pendingReason: null,
    }
    this.reconnectState.set(hostId, created)
    return created
  }

  private getReconnectDelayMs(attempt: number): number {
    const baseDelay = Math.min(this.reconnectBaseDelayMs * Math.pow(2, attempt - 1), this.reconnectMaxDelayMs)
    const jitter = baseDelay * this.reconnectJitterRatio
    const offset = (Math.random() * 2 - 1) * jitter
    return Math.max(0, Math.floor(baseDelay + offset))
  }

  // Simulate signaling server (in a real app, this would be WebSocket/Socket.IO)
  private sendSignalingMessage(hostId: string, message: any): void {
    console.log(`Sending signaling message to ${hostId}:`, message)

    // In a real implementation, you would send this via WebSocket to a signaling server
    // The signaling server would then relay it to the target host

    // For demo purposes, we'll simulate this with a timeout
    setTimeout(() => {
      this.handleSignalingMessage(hostId, message)
    }, 100)
  }

  // Handle incoming signaling message (simulated)
  private handleSignalingMessage(fromHostId: string, message: any): void {
    console.log(`Received signaling message from ${fromHostId}:`, message)

    switch (message.type) {
      case "offer":
        this.createAnswer(fromHostId, message.sdp)
        break
      case "answer":
        this.handleAnswer(fromHostId, message.sdp)
        break
      case "ice-candidate":
        this.handleIceCandidate(fromHostId, message.candidate)
        break
    }
  }

  // Event listeners
  public onConnectionChange(callback: (connections: PeerConnectionData[]) => void): () => void {
    this.connectionListeners.push(callback)
    return () => {
      this.connectionListeners = this.connectionListeners.filter((cb) => cb !== callback)
    }
  }

  public onStreamChange(callback: (hostId: string, stream: MediaStream | null) => void): () => void {
    this.streamListeners.push(callback)
    return () => {
      this.streamListeners = this.streamListeners.filter((cb) => cb !== callback)
    }
  }

  public onDataChannelMessage(callback: (hostId: string, data: any) => void): () => void {
    this.dataChannelListeners.push(callback)
    return () => {
      this.dataChannelListeners = this.dataChannelListeners.filter((cb) => cb !== callback)
    }
  }

  public onQualityTierChange(callback: (state: QualityTierState) => void): () => void {
    this.qualityTierListeners.push(callback)
    return () => {
      this.qualityTierListeners = this.qualityTierListeners.filter((cb) => cb !== callback)
    }
  }

  // Notify listeners
  private notifyConnectionListeners(): void {
    const connections = Array.from(this.peerConnections.values())
    this.connectionListeners.forEach((listener) => listener(connections))
  }

  private notifyStreamListeners(hostId: string, stream: MediaStream | null): void {
    this.streamListeners.forEach((listener) => listener(hostId, stream))
  }

  private notifyDataChannelListeners(hostId: string, data: any): void {
    this.dataChannelListeners.forEach((listener) => listener(hostId, data))
  }

  private emitReconnectStatus(
    hostId: string,
    status: "reconnecting" | "recovered" | "failed",
    message: string,
  ): void {
    this.reconnectStatusListeners.forEach((listener) => listener(hostId, status, message))
  }

  // Get current connections
  public getConnections(): PeerConnectionData[] {
    return Array.from(this.peerConnections.values())
  }

  // Get local stream
  public getLocalStream(): MediaStream | null {
    return this.localStream
  }

  // Get remote stream for a host
  public getRemoteStream(hostId: string): MediaStream | null {
    const peerData = this.getPeerConnectionByHostId(hostId)
    return peerData?.remoteStream || null
  }

  public getQualityTierState(hostId: string): QualityTierState | null {
    return this.buildQualityTierState(hostId)
  }

  public getAllQualityTierStates(): QualityTierState[] {
    return Array.from(this.adaptiveQualityStates.values())
      .map((state) => this.buildQualityTierState(state.hostId))
      .filter((state): state is QualityTierState => Boolean(state))
  }

  // Add a method to update ICE servers
  public updateIceServers(iceServers: RTCIceServer[]): void {
    // Ensure we keep at least one STUN server
    const hasStun = iceServers.some((server) => {
      const urls = Array.isArray(server.urls) ? server.urls : [server.urls]
      return urls.some((url) => url.startsWith("stun:"))
    })

    if (!hasStun) {
      iceServers.unshift({ urls: "stun:stun.l.google.com:19302" })
    }

    this.config.iceServers = iceServers
    console.log("ICE servers updated:", this.config.iceServers)

    // Close and recreate any active connections to use new servers
    if (this.peerConnections.size > 0) {
      console.log("Updating ICE servers for active connections")
      // Store current connections to recreate them
      const activeConnections = Array.from(this.peerConnections.values()).map((conn) => ({
        hostId: conn.hostId,
        isInitiator: conn.isInitiator,
      }))

      // Close all connections
      this.closeAllConnections()

      // Recreate connections with new servers
      for (const conn of activeConnections) {
        this.createPeerConnection(conn.hostId, conn.isInitiator)
      }
    }
  }

  // Add a method to update ICE servers with fresh credentials
  public async updateTurnCredentials(username: string, credential: string): Promise<void> {
    // Update all TURN server entries with the new credentials
    this.config.iceServers = this.config.iceServers.map((server) => {
      if (
        server.urls &&
        ((typeof server.urls === "string" && server.urls.startsWith("turn")) ||
          (Array.isArray(server.urls) && server.urls.some((url) => url.startsWith("turn"))))
      ) {
        return {
          ...server,
          username,
          credential,
          credentialType: "password",
        }
      }
      return server
    })

    // Close and recreate any active connections to use new credentials
    if (this.peerConnections.size > 0) {
      console.log("Updating TURN credentials for active connections")
      // Store current connections to recreate them
      const activeConnections = Array.from(this.peerConnections.values()).map((conn) => ({
        hostId: conn.hostId,
        isInitiator: conn.isInitiator,
      }))

      // Close all connections
      this.closeAllConnections()

      // Recreate connections with new credentials
      for (const conn of activeConnections) {
        await this.createPeerConnection(conn.hostId, conn.isInitiator)
      }
    }
  }

  // Add a method to force TURN usage
  public forceTurnServer(force: boolean): void {
    this.config.iceTransportPolicy = force ? "relay" : "all"
    console.log(`TURN server usage ${force ? "forced" : "automatic"}`)
  }

  // Add a method to monitor ICE candidate types
  private monitorIceCandidates(peerData: PeerConnectionData): void {
    const { connection, hostId } = peerData

    connection.onicecandidate = (event) => {
      if (event.candidate) {
        // Log candidate type for monitoring
        const candidateType = event.candidate.type // 'host', 'srflx' (STUN), or 'relay' (TURN)
        console.log(`ICE candidate for ${hostId}: ${candidateType}`, event.candidate)

        // Track candidate types for analytics
        if (!peerData.candidateStats) {
          peerData.candidateStats = { host: 0, srflx: 0, relay: 0, prflx: 0 }
        }

        if (candidateType) {
          peerData.candidateStats[candidateType]++
        }

        // In a real app, send this candidate to the remote peer via signaling server
        this.sendSignalingMessage(hostId, {
          type: "ice-candidate",
          candidate: event.candidate,
        })
      }
    }
  }

  // Add a method to get TURN server usage statistics
  public getTurnServerUsage(): { hostId: string; usingTurn: boolean; candidateStats: any }[] {
    return Array.from(this.peerConnections.values()).map((peerData) => {
      const usingTurn =
        peerData.selectedCandidatePair?.remote?.type === "relay" ||
        peerData.selectedCandidatePair?.local?.type === "relay"

      return {
        hostId: peerData.hostId,
        usingTurn,
        candidateStats: peerData.candidateStats || { host: 0, srflx: 0, relay: 0, prflx: 0 },
      }
    })
  }

  // Add a method to get the selected candidate pair
  public async updateSelectedCandidatePair(hostId: string): Promise<void> {
    const peerData = this.getPeerConnectionByHostId(hostId)
    if (!peerData) return

    try {
      const stats = await peerData.connection.getStats()
      stats.forEach((report) => {
        if (report.type === "candidate-pair" && report.selected) {
          // Find local candidate
          stats.forEach((localReport) => {
            if (localReport.id === report.localCandidateId) {
              // Find remote candidate
              stats.forEach((remoteReport) => {
                if (remoteReport.id === report.remoteCandidateId) {
                  peerData.selectedCandidatePair = {
                    local: {
                      type: localReport.candidateType,
                      protocol: localReport.protocol,
                      address: localReport.address,
                      port: remoteReport.port,
                    },
                    remote: {
                      type: remoteReport.candidateType,
                      protocol: remoteReport.protocol,
                      address: remoteReport.address,
                      port: remoteReport.port,
                    },
                    stats: {
                      bytesSent: report.bytesSent,
                      bytesReceived: report.bytesReceived,
                      totalRoundTripTime: report.totalRoundTripTime,
                      currentRoundTripTime: report.currentRoundTripTime,
                    },
                  }
                }
              })
            }
          })
        }
      })
    } catch (error) {
      console.error("Failed to get selected candidate pair:", error)
    }
  }

  private initializeAdaptiveQuality(hostId: string): void {
    if (this.adaptiveQualityStates.has(hostId)) return

    this.adaptiveQualityStates.set(hostId, {
      hostId,
      tierIndex: 0,
      consecutiveBadSamples: 0,
      consecutiveGoodSamples: 0,
    })

    this.applyQualityTier(hostId, 0)
  }

  private startQualitySampling(hostId: string): void {
    const state = this.adaptiveQualityStates.get(hostId)
    if (!state) return

    if (state.samplingTimer) {
      clearInterval(state.samplingTimer)
    }

    state.samplingTimer = setInterval(() => {
      this.sampleNetworkQuality(hostId)
    }, this.sampleIntervalMs)

    this.sampleNetworkQuality(hostId)
  }

  private stopQualitySampling(hostId: string): void {
    const state = this.adaptiveQualityStates.get(hostId)
    if (!state?.samplingTimer) return

    clearInterval(state.samplingTimer)
    state.samplingTimer = undefined
  }

  private async sampleNetworkQuality(hostId: string): Promise<void> {
    const peerData = this.getPeerConnectionByHostId(hostId)
    const state = this.adaptiveQualityStates.get(hostId)
    if (!peerData || !state || peerData.connection.connectionState !== "connected") {
      return
    }

    const sample = await this.readNetworkQualitySample(peerData)
    if (!sample) return

    state.lastSample = sample
    this.evaluateTierAdjustments(hostId, sample)
    const tierState = this.buildQualityTierState(hostId)
    if (tierState) {
      peerData.qualityTierState = tierState
      this.notifyQualityTierListeners(tierState)
    }
  }

  private async readNetworkQualitySample(peerData: PeerConnectionData): Promise<NetworkQualitySample | null> {
    const state = this.adaptiveQualityStates.get(peerData.hostId)
    if (!state) return null

    try {
      const stats = await peerData.connection.getStats()

      let roundTripTimeMs = 0
      let packetsSent = 0
      let packetsLost = 0
      let framesEncoded = 0
      let framesDropped = 0
      let outboundBitrateKbps = 0

      stats.forEach((report) => {
        if (report.type === "candidate-pair" && (report as any).state === "succeeded") {
          roundTripTimeMs = ((report as any).currentRoundTripTime || 0) * 1000
        }

        if (report.type === "outbound-rtp" && (report as any).kind === "video") {
          packetsSent = (report as any).packetsSent || 0
          packetsLost = (report as any).packetsLost || 0
          const totalFramesEncoded = (report as any).framesEncoded || 0
          const totalFramesDropped = (report as any).framesDropped || 0
          const timestampMs = report.timestamp || 0
          const bytesSent = (report as any).bytesSent || 0

          if (
            state.previousOutboundTimestampMs &&
            state.previousOutboundTimestampMs > 0 &&
            timestampMs > state.previousOutboundTimestampMs &&
            typeof state.previousOutboundBytes === "number" &&
            bytesSent >= state.previousOutboundBytes
          ) {
            outboundBitrateKbps =
              ((bytesSent - state.previousOutboundBytes) * 8) /
              ((timestampMs - state.previousOutboundTimestampMs) / 1000) /
              1000
          }

          if (typeof state.previousFramesEncoded === "number" && typeof state.previousFramesDropped === "number") {
            framesEncoded = Math.max(0, totalFramesEncoded - state.previousFramesEncoded)
            framesDropped = Math.max(0, totalFramesDropped - state.previousFramesDropped)
          } else {
            framesEncoded = totalFramesEncoded
            framesDropped = totalFramesDropped
          }

          state.previousOutboundBytes = bytesSent
          state.previousOutboundTimestampMs = timestampMs
          state.previousFramesEncoded = totalFramesEncoded
          state.previousFramesDropped = totalFramesDropped
        }
      })

      const totalPackets = packetsSent + packetsLost
      const packetLossRate = totalPackets > 0 ? packetsLost / totalPackets : 0
      const totalFrames = framesEncoded + framesDropped
      const frameDropRate = totalFrames > 0 ? framesDropped / totalFrames : 0

      return {
        roundTripTimeMs,
        packetLossRate,
        outboundBitrateKbps,
        frameDropRate,
      }
    } catch (error) {
      console.error(`Failed network quality sampling for ${peerData.hostId}:`, error)
      return null
    }
  }

  private evaluateTierAdjustments(hostId: string, sample: NetworkQualitySample): void {
    const state = this.adaptiveQualityStates.get(hostId)
    if (!state) return

    const currentTier = this.bitrateLadder[state.tierIndex]
    const isBadSample =
      sample.roundTripTimeMs > 300 ||
      sample.packetLossRate > 0.05 ||
      sample.outboundBitrateKbps < (currentTier.maxBitrate / 1000) * 0.65 ||
      sample.frameDropRate > 0.08

    if (isBadSample) {
      state.consecutiveBadSamples += 1
      state.consecutiveGoodSamples = 0
    } else {
      state.consecutiveGoodSamples += 1
      state.consecutiveBadSamples = 0
    }

    if (state.consecutiveBadSamples >= this.downshiftAfterBadIntervals && state.tierIndex < this.bitrateLadder.length - 1) {
      this.applyQualityTier(hostId, state.tierIndex + 1)
      state.consecutiveBadSamples = 0
      state.consecutiveGoodSamples = 0
      return
    }

    const canUpshift = state.tierIndex > 0
    const recoveryIsStable =
      sample.roundTripTimeMs < 180 &&
      sample.packetLossRate < 0.02 &&
      sample.frameDropRate < 0.03 &&
      sample.outboundBitrateKbps > (this.bitrateLadder[state.tierIndex - 1].maxBitrate / 1000) * 0.8

    if (canUpshift && recoveryIsStable && state.consecutiveGoodSamples >= this.upshiftAfterGoodIntervals) {
      this.applyQualityTier(hostId, state.tierIndex - 1)
      state.consecutiveGoodSamples = 0
      state.consecutiveBadSamples = 0
    }
  }

  private async applyQualityTier(hostId: string, tierIndex: number): Promise<void> {
    const peerData = this.getPeerConnectionByHostId(hostId)
    const state = this.adaptiveQualityStates.get(hostId)
    if (!peerData || !state) return

    const tier = this.bitrateLadder[tierIndex]
    if (!tier) return

    const videoSenders = peerData.connection.getSenders().filter((sender) => sender.track?.kind === "video")

    for (const sender of videoSenders) {
      const params = sender.getParameters()
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}]
      }

      params.encodings = params.encodings.map((encoding) => ({
        ...encoding,
        maxBitrate: tier.maxBitrate,
        maxFramerate: tier.maxFramerate,
        scaleResolutionDownBy: tier.scaleResolutionDownBy,
      }))

      try {
        await sender.setParameters(params)
      } catch (error) {
        console.error(`Failed to apply quality tier for ${hostId}:`, error)
      }
    }

    state.tierIndex = tierIndex
    const tierState = this.buildQualityTierState(hostId)
    if (tierState) {
      peerData.qualityTierState = tierState
      this.notifyQualityTierListeners(tierState)
    }
  }

  private buildQualityTierState(hostId: string): QualityTierState | null {
    const state = this.adaptiveQualityStates.get(hostId)
    if (!state) return null

    const tier = this.bitrateLadder[state.tierIndex]
    if (!tier) return null

    return {
      hostId,
      tierLabel: tier.label,
      modeLabel: `Auto: ${tier.label}`,
      tierIndex: state.tierIndex,
      maxBitrate: tier.maxBitrate,
      maxFramerate: tier.maxFramerate,
      scaleResolutionDownBy: tier.scaleResolutionDownBy,
      sample: state.lastSample,
    }
  }

  private notifyQualityTierListeners(state: QualityTierState): void {
    this.qualityTierListeners.forEach((listener) => listener(state))
  }
}
