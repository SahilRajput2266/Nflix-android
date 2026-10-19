import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  ActivityIndicator,
  Linking,
  Alert,
  ScrollView
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as Clipboard from 'expo-clipboard';

const AD_BLOCK_USER_SCRIPT = `
  (function() {
    window.open = function() { return null; };
    window.alert = function() { return null; };
    window.confirm = function() { return true; };
    document.addEventListener('click', function(e) {
      var target = e.target;
      while (target && target.tagName) {
        if (target.tagName === 'A' && target.target === '_blank') {
          target.removeAttribute('target');
        }
        target = target.parentElement;
      }
    }, true);
  })();
  true;
`;


export default function PlayerModal({
  visible,
  item,
  stream,
  season = 1,
  episode = 1,
  onClose,
  onNextEpisode
}) {
  const [loading, setLoading] = useState(true);
  const [selectedServer, setSelectedServer] = useState('vidlink');
  const [isLandscape, setIsLandscape] = useState(false);
  const [isCloud, setIsCloud] = useState(Boolean(stream?.isCloudStream));
  const isCloudActive = Boolean(stream?.isCloudStream) || isCloud;

  useEffect(() => {
    if (visible) {
      ScreenOrientation.unlockAsync().catch(() => {});
      setIsCloud(stream?.isCloudStream || false);
    }
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, [visible, stream]);

  if (!visible || !item || !stream) return null;

  const toggleOrientation = async () => {
    try {
      if (isLandscape) {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        setIsLandscape(false);
      } else {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT);
        setIsLandscape(true);
      }
    } catch (e) {
      console.warn('Orientation toggle error:', e);
    }
  };

  const handleClose = async () => {
    try {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    } catch (e) {}
    onClose && onClose();
  };

  const handleOpenExternal = async () => {
    const playUri = stream.magnetUri || stream.url;
    if (playUri) {
      await Clipboard.setStringAsync(playUri);
    }

    Alert.alert(
      '⚡ VLC / External Player',
      'Stream link copied to clipboard! Choose an option:',
      [
        {
          text: '🎬 Launch VLC Player',
          onPress: async () => {
            const vlcIntent = Platform.OS === 'android'
              ? 'intent:#Intent;package=org.videolan.vlc;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;end'
              : 'vlc://';
            try {
              await Linking.openURL(vlcIntent);
            } catch {
              try {
                await Linking.openURL('vlc://');
              } catch {
                Alert.alert('VLC Player', 'Could not launch VLC. Please ensure VLC is installed from Play Store.');
              }
            }
          }
        },
        {
          text: '📥 Stream via 1DM / Flud',
          onPress: async () => {
            if (playUri) {
              try {
                await Linking.openURL(playUri);
              } catch {
                Alert.alert(
                  '1DM Needed',
                  '1DM can stream torrents directly into VLC. Install 1DM from Play Store?',
                  [
                    { text: 'Get 1DM', onPress: () => Linking.openURL('https://play.google.com/store/apps/details?id=idm.internet.download.manager') },
                    { text: 'Cancel', style: 'cancel' }
                  ]
                );
              }
            }
          }
        },
        {
          text: '⚡ Switch to Cloud HD',
          onPress: () => setIsCloud(true)
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const tmdbId = item.id;
  const imdbId = stream.imdbId || item.imdbId;
  const isTv = item.mediaType === 'tv';

  const getEmbedUrl = (srv) => {
    if (srv === 'vidlink') {
      return isTv
        ? `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}?primaryColor=e50914&autoplay=true`
        : `https://vidlink.pro/movie/${tmdbId}?primaryColor=e50914&autoplay=true`;
    }
    if (srv === 'superembed') {
      return isTv
        ? `https://superembed.stream/?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}`
        : `https://superembed.stream/?video_id=${tmdbId}&tmdb=1`;
    }
    if (srv === 'autoembed') {
      return isTv
        ? `https://player.autoembed.cc/embed/tv/${tmdbId}/${season}/${episode}`
        : `https://player.autoembed.cc/embed/movie/${tmdbId}`;
    }
    if (srv === 'vidsrcto') {
      return isTv
        ? `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`
        : `https://vidsrc.to/embed/movie/${tmdbId}`;
    }
    return isTv
      ? `https://multiembed.mov/?video_id=${imdbId || tmdbId}&tmdb=1&s=${season}&e=${episode}`
      : `https://multiembed.mov/?video_id=${imdbId || tmdbId}&tmdb=1`;
  };

  const currentEmbedUrl = (stream && stream.embedUrl) || getEmbedUrl(selectedServer);

  const cloudIframeHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body { width:100%; height:100%; background:#000; overflow:hidden; }
    iframe { width:100%; height:100%; border:none; display:block; }
  </style>
</head>
<body>
  <iframe
    src="${currentEmbedUrl}"
    allowfullscreen="true"
    webkitallowfullscreen="true"
    mozallowfullscreen="true"
    allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
  ></iframe>
</body>
</html>`;

  // Clean, non-overlapping HTML5 Video Player with smooth touch controls & fallback card
  const clientPlayerHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <script src="https://cdn.jsdelivr.net/npm/webtorrent@latest/webtorrent.min.js"></script>
        <style>
          * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
          body, html { margin:0; padding:0; width:100%; height:100%; background:#000; color:#fff; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; overflow:hidden; user-select:none; }
          #container { width:100%; height:100%; display:flex; justify-content:center; align-items:center; position:relative; background:#000; }
          video { width:100%; height:100%; object-fit:contain; background:#000; }
          
          /* Clean Buffering Screen (NO overlapping buttons) */
          #statusWrap { position:absolute; z-index:50; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:24px; text-align:center; pointer-events:none; }
          .spinner { width:46px; height:46px; border:4px solid rgba(255,255,255,0.15); border-top-color:#E50914; border-radius:50%; animation:spin 0.8s linear infinite; margin-bottom:14px; }
          @keyframes spin { to { transform:rotate(360deg); } }
          #mainMsg { font-size:15px; font-weight:700; color:#fff; margin-bottom:4px; letter-spacing:0.3px; }
          #subMsg { font-size:12px; color:#888; }
          
          /* HUD status at top */
          #hud { position:absolute; top:12px; left:12px; right:12px; background:rgba(18,18,18,0.85); backdrop-filter:blur(8px); padding:8px 14px; border-radius:8px; font-size:11px; display:none; justify-content:space-between; align-items:center; z-index:40; border:1px solid rgba(255,255,255,0.1); pointer-events:none; }
          .hud-item { display:flex; align-items:center; gap:6px; font-weight:600; }
          .hud-speed { color:#46d369; }
          .hud-peers { color:#00a8ff; }
          .hud-progress { color:#ff9800; }

          /* Touch Overlay & Controls - HIDDEN by default until video starts */
          #controlsOverlay { position:absolute; inset:0; z-index:30; display:none; flex-direction:column; justify-content:space-between; background:rgba(0,0,0,0.5); opacity:0; transition:opacity 0.25s ease; padding:16px; }
          #controlsOverlay.active { display:flex; opacity:1; }
          #controlsOverlay.hidden { opacity:0; pointer-events:none; }

          .ctrl-top { display:flex; justify-content:flex-end; gap:10px; }
          .pill-btn { background:rgba(30,30,30,0.85); border:1px solid #444; color:#fff; padding:6px 14px; border-radius:20px; font-size:12px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:6px; }
          .pill-btn:active { background:#E50914; border-color:#E50914; }

          .ctrl-center { display:flex; justify-content:center; align-items:center; gap:36px; }
          .center-circle-btn { width:54px; height:54px; border-radius:27px; background:rgba(25,25,25,0.75); border:1.5px solid rgba(255,255,255,0.4); color:#fff; font-size:20px; font-weight:700; display:flex; justify-content:center; align-items:center; cursor:pointer; }
          .center-circle-btn:active { transform:scale(0.92); background:#E50914; border-color:#E50914; }
          .play-main-btn { width:68px; height:68px; border-radius:34px; background:#fff; color:#000; font-size:26px; border:none; display:flex; justify-content:center; align-items:center; cursor:pointer; box-shadow:0 4px 16px rgba(0,0,0,0.5); }
          .play-main-btn:active { transform:scale(0.92); }

          .ctrl-bottom { display:flex; flex-direction:column; gap:8px; }
          .time-row { display:flex; justify-content:space-between; align-items:center; font-size:12px; font-weight:600; color:#ddd; }
          .scrubber-wrap { position:relative; width:100%; height:20px; display:flex; align-items:center; cursor:pointer; }
          .progress-bar { width:100%; height:5px; background:rgba(255,255,255,0.3); border-radius:3px; position:relative; overflow:hidden; }
          .progress-filled { height:100%; width:0%; background:#E50914; border-radius:3px; }

          /* Fallback Card when 0 peers */
          #noPeersCard { display:none; position:absolute; inset:20px; z-index:60; background:rgba(20,20,20,0.95); border:1px solid #333; border-radius:12px; flex-direction:column; align-items:center; justify-content:center; padding:20px; text-align:center; box-shadow:0 8px 30px rgba(0,0,0,0.8); }

          /* Audio Track Modal */
          #audioModal { position:absolute; bottom:70px; right:16px; background:#181818; border:1px solid #333; border-radius:10px; padding:12px; min-width:200px; max-width:260px; z-index:100; display:none; box-shadow:0 8px 24px rgba(0,0,0,0.8); }
          .modal-title { font-size:12px; font-weight:700; color:#aaa; text-transform:uppercase; margin-bottom:8px; letter-spacing:0.5px; }
          .audio-item { padding:10px 12px; border-radius:6px; font-size:13px; font-weight:600; color:#eee; cursor:pointer; display:flex; align-items:center; justify-content:space-between; margin-bottom:4px; }
          .audio-item.active { background:#E50914; color:#fff; }
        </style>
      </head>
      <body>
        <div id="container" onclick="handleTap(event)">
          <!-- Clean Center Loading Spinner (NO overlapping buttons) -->
          <div id="statusWrap">
            <div class="spinner"></div>
            <div id="mainMsg">Joining BitTorrent Swarm...</div>
            <div id="subMsg">Connecting to WebRTC & DHT peers</div>
          </div>

          <div id="hud">
            <div class="hud-item hud-speed" id="hudSpeed">⚡ 0 MB/s</div>
            <div class="hud-item hud-peers" id="hudPeers">👥 0 Peers</div>
            <div class="hud-item hud-progress" id="hudProgress">Buffering 0%</div>
          </div>

          <video id="player" playsinline preload="auto"></video>

          <!-- Fallback Card if 0 peers in 10s -->
          <div id="noPeersCard">
            <div style="font-size:30px; margin-bottom:8px;">📡</div>
            <div style="font-size:16px; font-weight:700; color:#fff; margin-bottom:6px;">UDP Torrent Swarm Detected</div>
            <div style="font-size:12px; color:#aaa; line-height:18px; margin-bottom:18px; max-width:280px;">
              Mobile browser sandbox restricts raw UDP torrent seeders. For 1-second instant playback with Hindi audio, tap below:
            </div>
            <button onclick="sendAppMessage('SWITCH_CLOUD')" style="background:#E50914; color:#fff; font-weight:700; border:none; padding:11px 20px; border-radius:24px; font-size:13px; margin-bottom:10px; cursor:pointer; display:flex; align-items:center; gap:6px;">
              ⚡ Play Instant HD (Cloud)
            </button>
            <button onclick="sendAppMessage('OPEN_EXTERNAL')" style="background:#262626; color:#ddd; font-weight:600; border:1px solid #444; padding:8px 16px; border-radius:20px; font-size:12px; cursor:pointer;">
              🎬 Open in VLC / 1DM
            </button>
          </div>

          <!-- Touch Controls Overlay (Appears ONLY when video plays) -->
          <div id="controlsOverlay">
            <div class="ctrl-top">
              <div class="pill-btn" onclick="toggleAudioModal(event)">
                🔊 <span id="audioLabel">Audio Language</span>
              </div>
              <div class="pill-btn" onclick="cycleSpeed(event)">
                ⚡ <span id="speedLabel">1.0x</span>
              </div>
            </div>

            <div class="ctrl-center">
              <div class="center-circle-btn" onclick="skipTime(-10, event)">-10s</div>
              <div class="play-main-btn" id="playBtn" onclick="togglePlay(event)">▶</div>
              <div class="center-circle-btn" onclick="skipTime(10, event)">+10s</div>
            </div>

            <div class="ctrl-bottom">
              <div class="time-row">
                <span id="currentTime">00:00</span>
                <span id="durationTime">00:00</span>
              </div>
              <div class="scrubber-wrap" onclick="seekVideo(event)">
                <div class="progress-bar">
                  <div class="progress-filled" id="progressFilled"></div>
                </div>
              </div>
            </div>

            <!-- Audio Selection Popup -->
            <div id="audioModal">
              <div class="modal-title">Select Audio Track</div>
              <div id="audioList"></div>
            </div>
          </div>
        </div>

        <script>
          var directUrl = ${JSON.stringify(stream.url || '')};
          var magnetUri = ${JSON.stringify(stream.magnetUri || '')};
          var videoElem = document.getElementById('player');
          var statusWrap = document.getElementById('statusWrap');
          var hud = document.getElementById('hud');
          var mainMsg = document.getElementById('mainMsg');
          var subMsg = document.getElementById('subMsg');
          var controlsOverlay = document.getElementById('controlsOverlay');
          var playBtn = document.getElementById('playBtn');
          var currentTimeElem = document.getElementById('currentTime');
          var durationTimeElem = document.getElementById('durationTime');
          var progressFilled = document.getElementById('progressFilled');
          var audioModal = document.getElementById('audioModal');
          var audioLabel = document.getElementById('audioLabel');
          var audioList = document.getElementById('audioList');
          var noPeersCard = document.getElementById('noPeersCard');
          var hideTimeout = null;
          var hasPeers = false;

          function sendAppMessage(msg) {
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(msg);
            }
          }

          function formatTime(s) {
            if (isNaN(s) || s < 0) return '00:00';
            var h = Math.floor(s / 3600);
            var m = Math.floor((s % 3600) / 60);
            var sec = Math.floor(s % 60);
            if (h > 0) {
              return h + ':' + (m < 10 ? '0' : '') + m + ':' + (sec < 10 ? '0' : '') + sec;
            }
            return (m < 10 ? '0' : '') + m + ':' + (sec < 10 ? '0' : '') + sec;
          }

          function resetHideTimer() {
            clearTimeout(hideTimeout);
            controlsOverlay.classList.remove('hidden');
            if (!videoElem.paused) {
              hideTimeout = setTimeout(function() {
                controlsOverlay.classList.add('hidden');
                audioModal.style.display = 'none';
              }, 3500);
            }
          }

          function handleTap(e) {
            if (e.target.closest('#controlsOverlay') && e.target !== controlsOverlay) return;
            if (controlsOverlay.classList.contains('hidden') || controlsOverlay.style.display === 'none') {
              controlsOverlay.style.display = 'flex';
              controlsOverlay.classList.add('active');
              resetHideTimer();
            } else {
              controlsOverlay.classList.add('hidden');
              audioModal.style.display = 'none';
            }
          }

          function togglePlay(e) {
            e && e.stopPropagation();
            if (videoElem.paused) {
              videoElem.play().catch(function(){});
              playBtn.innerHTML = '❚❚';
            } else {
              videoElem.pause();
              playBtn.innerHTML = '▶';
            }
            resetHideTimer();
          }

          function skipTime(delta, e) {
            e && e.stopPropagation();
            videoElem.currentTime = Math.max(0, Math.min(videoElem.duration || 0, videoElem.currentTime + delta));
            resetHideTimer();
          }

          function seekVideo(e) {
            e && e.stopPropagation();
            var rect = e.currentTarget.getBoundingClientRect();
            var pos = (e.clientX - rect.left) / rect.width;
            if (videoElem.duration) {
              videoElem.currentTime = pos * videoElem.duration;
            }
            resetHideTimer();
          }

          var speeds = [1.0, 1.25, 1.5, 2.0];
          var curSpeedIdx = 0;
          function cycleSpeed(e) {
            e && e.stopPropagation();
            curSpeedIdx = (curSpeedIdx + 1) % speeds.length;
            videoElem.playbackRate = speeds[curSpeedIdx];
            document.getElementById('speedLabel').innerText = speeds[curSpeedIdx] + 'x';
            resetHideTimer();
          }

          function toggleAudioModal(e) {
            e && e.stopPropagation();
            if (audioModal.style.display === 'block') {
              audioModal.style.display = 'none';
            } else {
              populateAudioList();
              audioModal.style.display = 'block';
            }
          }

          function populateAudioList() {
            audioList.innerHTML = '';
            var audioTracks = videoElem.audioTracks;
            if (audioTracks && audioTracks.length > 0) {
              for (var i = 0; i < audioTracks.length; i++) {
                (function(idx) {
                  var trk = audioTracks[idx];
                  var item = document.createElement('div');
                  item.className = 'audio-item' + (trk.enabled ? ' active' : '');
                  var name = trk.label || trk.language || ('Track ' + (idx + 1));
                  item.innerText = name;
                  item.onclick = function(ev) {
                    ev.stopPropagation();
                    for (var j = 0; j < audioTracks.length; j++) audioTracks[j].enabled = (j === idx);
                    audioLabel.innerText = name;
                    audioModal.style.display = 'none';
                    resetHideTimer();
                  };
                  audioList.appendChild(item);
                })(i);
              }
            } else {
              var def = document.createElement('div');
              def.className = 'audio-item active';
              def.innerText = 'Primary Stream Audio (Active)';
              audioList.appendChild(def);
            }
          }

          videoElem.addEventListener('timeupdate', function() {
            currentTimeElem.innerText = formatTime(videoElem.currentTime);
            durationTimeElem.innerText = formatTime(videoElem.duration);
            if (videoElem.duration) {
              progressFilled.style.width = ((videoElem.currentTime / videoElem.duration) * 100) + '%';
            }
          });

          videoElem.addEventListener('play', function() {
            playBtn.innerHTML = '❚❚';
            statusWrap.style.display = 'none';
            noPeersCard.style.display = 'none';
            controlsOverlay.style.display = 'flex';
            controlsOverlay.classList.add('active');
            resetHideTimer();
          });

          videoElem.addEventListener('pause', function() {
            playBtn.innerHTML = '▶';
            controlsOverlay.classList.remove('hidden');
          });

          videoElem.addEventListener('waiting', function() {
            statusWrap.style.display = 'flex';
            mainMsg.innerText = 'Buffering stream...';
            subMsg.innerText = 'Synchronizing audio & video';
          });

          window.addEventListener('beforeunload', function() {
            if (window.wtClient) {
              try { window.wtClient.destroy(); } catch(e) {}
            }
          });

          videoElem.addEventListener('playing', function() {
            statusWrap.style.display = 'none';
            noPeersCard.style.display = 'none';
          });

          // Playback logic: Direct HTTP vs P2P WebTorrent
          if (directUrl && directUrl.startsWith('http')) {
            mainMsg.innerText = 'Connecting to Direct High-Speed Stream...';
            subMsg.innerText = 'Zero-lag direct cloud playback';
            videoElem.src = directUrl;
            videoElem.play().catch(function(){});
          } else if (magnetUri && window.WebTorrent) {
            hud.style.display = 'flex';
            mainMsg.innerText = 'Joining BitTorrent Swarm...';
            subMsg.innerText = 'Connecting to WebRTC & DHT peers';

            // Show fallback after 10 seconds if no peers connect
            setTimeout(function() {
              if (!hasPeers && videoElem.paused && videoElem.currentTime === 0) {
                statusWrap.style.display = 'none';
                noPeersCard.style.display = 'flex';
              }
            }, 10000);

            var client = new WebTorrent({
              maxConns: 25,
              destroyStoreOnDestroy: true
            });
            window.wtClient = client;

            client.add(magnetUri, { destroyStoreOnDestroy: true }, function(torrent) {
              // CRITICAL: Deselect all files so WebTorrent NEVER downloads the full 10-50GB movie into device memory/storage!
              // Only pieces actively needed for immediate playback will be streamed.
              torrent.deselect();

              mainMsg.innerText = 'Metadata Received! Streaming live on-demand...';
              var file = torrent.files.find(function(f) {
                return /\.(mp4|mkv|webm)$/i.test(f.name);
              }) || torrent.files[0];

              if (file) {
                mainMsg.innerText = 'Live Streaming: ' + file.name;
                file.renderTo(videoElem, { autoplay: true }, function(err) {
                  if (err) {
                    mainMsg.innerText = 'Playback Error: ' + err.message;
                  }
                });
              }

              torrent.on('download', function() {
                hasPeers = true;
                noPeersCard.style.display = 'none';
                var speed = (torrent.downloadSpeed / (1024 * 1024)).toFixed(1);
                var pct = (torrent.progress * 100).toFixed(1);
                document.getElementById('hudSpeed').innerText = '⚡ ' + speed + ' MB/s';
                document.getElementById('hudPeers').innerText = '👥 ' + torrent.numPeers + ' Peers';
                document.getElementById('hudProgress').innerText = 'Buffer ' + pct + '%';
              });
            });

            client.on('error', function(err) {
              mainMsg.innerText = 'Torrent error: ' + err.message;
            });
          } else {
            mainMsg.innerText = 'Starting Cloud Player...';
            statusWrap.style.display = 'none';
          }
        </script>
      </body>
    </html>
  `;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleClose}>
      <SafeAreaView style={styles.container}>
        <StatusBar hidden={isLandscape} barStyle="light-content" backgroundColor="#000" />

        {/* Player Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleClose}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <Text style={styles.title} numberOfLines={1}>
              {item.title || item.name || 'Now Playing'}
            </Text>
            <Text style={styles.subBadge}>
              {isTv ? `S${season} E${episode}` : '1080p Full HD'}
              {isCloudActive ? ' • ⚡ Cloud Multi-Audio' : ' • P2P Stream'}
            </Text>
          </View>

          {/* VLC / External Player Button */}
          <TouchableOpacity style={styles.vlcButton} onPress={handleOpenExternal}>
            <Ionicons name="open-outline" size={14} color="#000" />
            <Text style={styles.vlcButtonText}>VLC / MX</Text>
          </TouchableOpacity>

          {/* Screen Orientation Toggle */}
          <TouchableOpacity style={styles.rotateButton} onPress={toggleOrientation}>
            <Ionicons name={isLandscape ? 'phone-portrait-outline' : 'scan-outline'} size={18} color="#fff" />
            <Text style={styles.rotateText}>{isLandscape ? 'Portrait' : 'Rotate'}</Text>
          </TouchableOpacity>
        </View>

        {/* Cloud Stream Multi-Server Switcher */}
        {isCloudActive && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.serverRow}>
            <TouchableOpacity
              style={[styles.serverChip, selectedServer === 'vidlink' && styles.serverChipActive]}
              onPress={() => {
                setLoading(true);
                setSelectedServer('vidlink');
              }}
            >
              <Text style={[styles.serverChipText, selectedServer === 'vidlink' && styles.serverChipTextActive]}>
                ⚡ Server 1 (VidLink Pro - Hindi)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.serverChip, selectedServer === 'superembed' && styles.serverChipActive]}
              onPress={() => {
                setLoading(true);
                setSelectedServer('superembed');
              }}
            >
              <Text style={[styles.serverChipText, selectedServer === 'superembed' && styles.serverChipTextActive]}>
                ⚡ Server 2 (SuperEmbed HD)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.serverChip, selectedServer === 'autoembed' && styles.serverChipActive]}
              onPress={() => {
                setLoading(true);
                setSelectedServer('autoembed');
              }}
            >
              <Text style={[styles.serverChipText, selectedServer === 'autoembed' && styles.serverChipTextActive]}>
                ⚡ Server 3 (AutoEmbed FHD)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.serverChip, selectedServer === 'vidsrcto' && styles.serverChipActive]}
              onPress={() => {
                setLoading(true);
                setSelectedServer('vidsrcto');
              }}
            >
              <Text style={[styles.serverChipText, selectedServer === 'vidsrcto' && styles.serverChipTextActive]}>
                ⚡ Server 4 (VidSrc HD)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.serverChip, selectedServer === 'multiembed' && styles.serverChipActive]}
              onPress={() => {
                setLoading(true);
                setSelectedServer('multiembed');
              }}
            >
              <Text style={[styles.serverChipText, selectedServer === 'multiembed' && styles.serverChipTextActive]}>
                ⚡ Server 5 (MultiEmbed Hindi)
              </Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* Player Container */}
        <View style={styles.playerContainer}>
          {isCloudActive ? (
            <WebView
              key={selectedServer + '_' + (isTv ? `${season}_${episode}` : 'movie')}
              originWhitelist={['*']}
              source={{ uri: currentEmbedUrl }}
              style={styles.webview}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              allowsFullscreenVideo={true}
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={false}
              setSupportMultipleWindows={false}
              injectedJavaScriptBeforeContentLoaded={AD_BLOCK_USER_SCRIPT}
              injectedJavaScript={AD_BLOCK_USER_SCRIPT}
              userAgent="Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
              onShouldStartLoadWithRequest={(req) => {
                const u = req.url || '';
                // Block android intent://, market://, and custom schemes that crash Android WebView
                if (!u.startsWith('http://') && !u.startsWith('https://') && !u.startsWith('about:')) {
                  return false;
                }
                return true;
              }}
              onRenderProcessGone={(e) => {
                console.warn('Cloud WebView render process recovered');
                return true;
              }}
              onError={(e) => {
                console.warn('Cloud WebView error:', e.nativeEvent);
                setLoading(false);
              }}
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
            />
          ) : (
            <WebView
              originWhitelist={['*']}
              source={{ html: clientPlayerHtml }}
              style={styles.webview}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              allowsFullscreenVideo={true}
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={false}
              userAgent="Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
              onMessage={(event) => {
                const msg = event.nativeEvent.data;
                if (msg === 'SWITCH_CLOUD') {
                  setIsCloud(true);
                } else if (msg === 'OPEN_EXTERNAL') {
                  handleOpenExternal();
                }
              }}
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
            />
          )}

          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#E50914" />
              <Text style={styles.loadingOverlayText}>Connecting to stream...</Text>
            </View>
          )}
        </View>

        {/* Footer Info (Hidden in landscape) */}
        {!isLandscape && (
          <View style={styles.footer}>
            {isCloudActive ? (
              <View style={styles.footerMeta}>
                <Text style={[styles.footerMetaText, { color: '#46d369', fontWeight: '700' }]}>
                  ⚡ Direct Cloud Stream (Zero Buffering)
                </Text>
                <Text style={styles.footerMetaText}>• 🇮🇳 Hindi & Subtitles in Player Settings</Text>
              </View>
            ) : (
              <>
                <Text style={styles.footerText} numberOfLines={1}>
                  📡 {stream.title}
                </Text>
                <View style={styles.footerMeta}>
                  <Text style={styles.footerMetaText}>Seeders: {stream.seeders}</Text>
                  {stream.size ? <Text style={styles.footerMetaText}>• Size: {stream.size}</Text> : null}
                  <Text style={[styles.footerMetaText, { color: '#46d369' }]}>• Client-Side P2P</Text>
                </View>
              </>
            )}
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000'
  },
  header: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0,
    height: Platform.OS === 'android' ? 52 + (StatusBar.currentHeight || 28) : 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#222'
  },
  backButton: {
    padding: 6,
    marginRight: 6
  },
  headerInfo: {
    flex: 1
  },
  title: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700'
  },
  subBadge: {
    color: '#46d369',
    fontSize: 11,
    fontWeight: '600'
  },
  vlcButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ff9800',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    marginRight: 6
  },
  vlcButtonText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '800'
  },
  rotateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#262626',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6
  },
  rotateText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600'
  },
  serverRow: {
    backgroundColor: '#161616',
    borderBottomWidth: 1,
    borderBottomColor: '#252525',
    maxHeight: 46,
    paddingHorizontal: 8
  },
  serverChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#262626',
    marginRight: 8,
    marginVertical: 6
  },
  serverChipActive: {
    backgroundColor: '#E50914'
  },
  serverChipText: {
    color: '#aaa',
    fontSize: 11,
    fontWeight: '600'
  },
  serverChipTextActive: {
    color: '#fff',
    fontWeight: '700'
  },
  playerContainer: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative'
  },
  webview: {
    flex: 1,
    backgroundColor: '#000'
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none'
  },
  loadingOverlayText: {
    color: '#888',
    fontSize: 12,
    marginTop: 10
  },
  footer: {
    padding: 10,
    backgroundColor: '#111',
    borderTopWidth: 1,
    borderTopColor: '#222'
  },
  footerText: {
    color: '#ddd',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4
  },
  footerMeta: {
    flexDirection: 'row',
    gap: 12
  },
  footerMetaText: {
    color: '#888',
    fontSize: 11
  }
});
