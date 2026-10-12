# WebRTC calls

The video room uses a direct mesh with one `RTCPeerConnection` per remote participant. Audio rooms omit audience-to-audience edges. Speaker edges stay present while a speaker mutes. The existing room limits are four video participants and ten audio participants.

`web/src/lib/webrtc-mesh.ts` owns peer connections, SDP/ICE queues, retry timers and video adaptation. The smaller `use-webrtc.ts` hook owns local devices, screen audio mixing, playback and speaking indicators. Each call keeps a stable outgoing stream ID so replacing a microphone or camera does not repeatedly change SDP stream associations.

Only the lower peer ID sends the initial offer. The answerer uses the transceivers created from that offer, which avoids duplicate audio/video m-lines. Later simultaneous changes use perfect negotiation. This follows the [WebRTC negotiation specification](https://www.w3.org/TR/webrtc/#perfect-negotiation-example) and [JSEP remote-description processing](https://www.rfc-editor.org/rfc/rfc9429.html#section-5.10).

## Reconnects and multiple devices

Multiple tabs and devices may join with the same account. Each connection is a separate mesh peer and roster entry. Opening another tab does not kick or replace an existing device. The existing room capacity still applies to connected peers.

Internal peer IDs distinguish connections and survive Socket.IO transport reconnects. The server reserves a disconnected peer for 12 seconds, then removes only that peer. Rejoining with the same peer ID cancels its departure timer and replaces its previous transport. Leaving a tab removes that tab's peer; the account remains present while its other connections remain.

Signaling targets an individual peer, allowing connections between devices using the same account. SDP and ICE messages include connection IDs to reject stale messages. Negotiation and track updates are serialized per peer, ICE retries are bounded, and healthy media connections survive signaling reconnects. `room:sync` supplies an authoritative roster to media hooks that mount after joining.

Both connection managers use function factories and closures: `createWebRTCMesh` and `createRoomConnections`. There are no custom classes in the WebRTC implementation.

## Video quality and duration

Every four seconds, the mesh reads selected candidate-pair bandwidth, round-trip time, RTP loss and encoder limitations. It reserves upload bandwidth for audio and divides the remaining budget among outgoing video copies. Each peer can independently send 180p, 360p, 540p, 720p or 1080p with corresponding bitrate and frame-rate limits. Congestion lowers quality immediately; upgrades require three good samples. An extremely low budget pauses outgoing video. Without bandwidth statistics, conservative defaults and browser network hints apply alongside the browser's congestion control.

Camera capture follows the highest outgoing resolution needed. Screen sharing uses sender scaling and a lower frame rate without changing display-capture constraints. Calls show a client-only elapsed timer after joining, preserve it through signaling reconnects and freeze it when the call ends. No duration is persisted or sent to the server.

## Validation

```sh
npm --prefix web run lint
npm --prefix server run lint
npm --prefix web run build
npm --prefix server run build
```

The frontend can also build with `npm --prefix web run build -- --webpack` where Turbopack's helper processes cannot bind a local port. Browser media, device permissions and Wi-Fi/mobile network transitions should be checked on target browsers.

## Deploying

Deploy web and server together: the signaling, roster and leave payloads changed. Clients with cached older bundles must reload.

Calls currently use public STUN servers.
