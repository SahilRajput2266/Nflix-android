import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
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
    try {
      window.open = function() { return null; };
      window.alert = function() { return null; };
      window.confirm = function() { return true; };
      document.addEventListener('click', function(e) {
        var el = e.target;
        while (el && el.tagName) {
          if (el.tagName === 'A' && el.target === '_blank') {
            el.removeAttribute('target');
          }
          el = el.parentElement;
        }
      }, true);
    } catch(err) {}
  })();
  true;
`;

const SERVERS = [
  { id: 'superembed', name: '⚡ Server 1 (SuperEmbed HD)' },
  { id: '2embed', name: '⚡ Server 2 (2Embed CC - Fast)' },
  { id: 'vidsrcpm', name: '⚡ Server 3 (VidSrc PM - 1080p)' },
  { id: 'vidlink', name: '⚡ Server 4 (VidLink Pro - Multi)' },
  { id: 'vidsrcto', name: '⚡ Server 5 (VidSrc To)' }
];

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
  const [selectedServer, setSelectedServer] = useState('superembed');
  const [isLandscape, setIsLandscape] = useState(false);
  const [isCloud, setIsCloud] = useState(Boolean(stream?.isCloudStream));
  const isCloudActive = Boolean(stream?.isCloudStream) || isCloud;

  useEffect(() => {
    if (visible) {
      ScreenOrientation.unlockAsync().catch(() => {});
      setIsCloud(Boolean(stream?.isCloudStream));
      setLoading(true);
    } else {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
      setIsLandscape(false);
    }
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, [visible, stream]);

  // Auto-dismiss loading indicator after 2.5s so user is NEVER stuck on a black screen!
  useEffect(() => {
    let timer;
    if (loading) {
      timer = setTimeout(() => {
        setLoading(false);
      }, 2500);
    }
    return () => clearTimeout(timer);
  }, [loading, selectedServer]);

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

  const tmdbId = item.id;
  const isTv = (item?.mediaType === 'tv') || (stream?.mediaType === 'tv') || Boolean(item?.name && !item?.title);

  const getEmbedUrl = (srv) => {
    if (srv === 'superembed') {
      return isTv
        ? `https://superembed.stream/?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}`
        : `https://superembed.stream/?video_id=${tmdbId}&tmdb=1`;
    }
    if (srv === '2embed') {
      return isTv
        ? `https://www.2embed.cc/embedtv/${tmdbId}&s=${season}&e=${episode}`
        : `https://www.2embed.cc/embed/${tmdbId}`;
    }
    if (srv === 'vidsrcpm') {
      return isTv
        ? `https://vidsrc.pm/embed/tv/${tmdbId}/${season}/${episode}`
        : `https://vidsrc.pm/embed/movie/${tmdbId}`;
    }
    if (srv === 'vidlink') {
      return isTv
        ? `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}?primaryColor=e50914&autoplay=true`
        : `https://vidlink.pro/movie/${tmdbId}?primaryColor=e50914&autoplay=true`;
    }
    if (srv === 'vidsrcto') {
      return isTv
        ? `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`
        : `https://vidsrc.to/embed/movie/${tmdbId}`;
    }
    return `https://superembed.stream/?video_id=${tmdbId}&tmdb=1`;
  };

  const currentEmbedUrl = getEmbedUrl(selectedServer);

  const handleOpenExternal = async () => {
    const playUri = stream.magnetUri || stream.url || currentEmbedUrl;
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
            const vlcIntent = 'intent:#Intent;package=org.videolan.vlc;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;end';
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
          text: '⚡ Switch to Cloud HD',
          onPress: () => {
            setIsCloud(true);
            setLoading(true);
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  // WebTorrent Client Player HTML
  const clientPlayerHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <script src="https://cdn.jsdelivr.net/npm/webtorrent@latest/webtorrent.min.js"></script>
        <style>
          * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
          body, html { margin:0; padding:0; width:100%; height:100%; background:#000; color:#fff; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; overflow:hidden; user-select:none; }
          #container { width:100%; height:100%; display:flex; justify-content:center; align-items:center; position:relative; background:#000; }
          video { width:100%; height:100%; object-fit:contain; background:#000; }
          #statusWrap { position:absolute; z-index:50; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:24px; text-align:center; pointer-events:none; }
          .spinner { width:44px; height:44px; border:4px solid rgba(255,255,255,0.15); border-top-color:#E50914; border-radius:50%; animation:spin 0.8s linear infinite; margin-bottom:12px; }
          @keyframes spin { to { transform:rotate(360deg); } }
          #mainMsg { font-size:14px; font-weight:700; color:#fff; margin-bottom:4px; }
          #subMsg { font-size:12px; color:#888; }
          #hud { position:absolute; top:12px; left:12px; right:12px; background:rgba(18,18,18,0.85); padding:8px 14px; border-radius:8px; font-size:11px; display:none; justify-content:space-between; align-items:center; z-index:40; border:1px solid rgba(255,255,255,0.1); }
          .hud-speed { color:#46d369; font-weight:700; }
          .hud-peers { color:#00a8ff; font-weight:700; }
          #noPeersCard { display:none; position:absolute; inset:20px; z-index:60; background:rgba(20,20,20,0.95); border:1px solid #333; border-radius:12px; flex-direction:column; align-items:center; justify-content:center; padding:20px; text-align:center; }
        </style>
      </head>
      <body>
        <div id="container">
          <div id="statusWrap">
            <div class="spinner"></div>
            <div id="mainMsg">Connecting to Stream...</div>
            <div id="subMsg">Searching BitTorrent swarms</div>
          </div>
          <div id="hud">
            <div class="hud-speed" id="hudSpeed">⚡ 0 MB/s</div>
            <div class="hud-peers" id="hudPeers">👥 0 Peers</div>
          </div>
          <video id="videoPlayer" playsinline webkit-playsinline controls></video>
          <div id="noPeersCard">
            <h3 style="color:#fff;margin-bottom:8px;">⚡ Swarm Buffering</h3>
            <p style="color:#aaa;font-size:13px;margin-bottom:16px;">Direct Cloud HD stream available with instant playback & Hindi audio.</p>
            <button onclick="window.ReactNativeWebView && window.ReactNativeWebView.postMessage('SWITCH_CLOUD')" style="background:#E50914;color:#fff;border:none;padding:10px 20px;border-radius:6px;font-weight:700;cursor:pointer;">⚡ Play Cloud HD</button>
          </div>
        </div>
        <script>
          var videoElem = document.getElementById('videoPlayer');
          var statusWrap = document.getElementById('statusWrap');
          var hud = document.getElementById('hud');
          var noPeersCard = document.getElementById('noPeersCard');
          var magnetUri = "${stream.magnetUri || ''}";
          var directUrl = "${stream.url || ''}";

          window.addEventListener('beforeunload', function() {
            if (window.wtClient) { try { window.wtClient.destroy(); } catch(e) {} }
          });

          if (directUrl && directUrl.startsWith('http')) {
            statusWrap.style.display = 'none';
            videoElem.src = directUrl;
            videoElem.play().catch(function(){});
          } else if (magnetUri && window.WebTorrent) {
            hud.style.display = 'flex';
            setTimeout(function() {
              if (videoElem.paused && videoElem.currentTime === 0) {
                statusWrap.style.display = 'none';
                noPeersCard.style.display = 'flex';
              }
            }, 10000);
            var client = new WebTorrent({ maxConns: 25, destroyStoreOnDestroy: true });
            window.wtClient = client;
            client.add(magnetUri, { destroyStoreOnDestroy: true }, function(torrent) {
              torrent.deselect();
              var file = torrent.files.find(function(f) { return /\.(mp4|mkv|webm)$/i.test(f.name); }) || torrent.files[0];
              if (file) {
                statusWrap.style.display = 'none';
                file.renderTo(videoElem, { autoplay: true });
              }
              torrent.on('download', function() {
                noPeersCard.style.display = 'none';
                statusWrap.style.display = 'none';
                var speed = (torrent.downloadSpeed / (1024 * 1024)).toFixed(1);
                document.getElementById('hudSpeed').innerText = '⚡ ' + speed + ' MB/s';
                document.getElementById('hudPeers').innerText = '👥 ' + torrent.numPeers + ' Peers';
              });
            });
          } else {
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

        {/* Portrait Mode Header */}
        {!isLandscape && (
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={handleClose}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>

            <View style={styles.headerInfo}>
              <Text style={styles.title} numberOfLines={1}>
                {item.title || item.name || 'Now Playing'}
              </Text>
              <View style={styles.badgeRow}>
                <View style={styles.badgePill}>
                  <Text style={styles.badgePillText}>{isTv ? `S${season} E${episode}` : 'Full HD'}</Text>
                </View>
                {isCloudActive ? (
                  <View style={[styles.badgePill, styles.badgeCloud]}>
                    <Text style={styles.badgeCloudText}>⚡ CLOUD HD</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* VLC Button */}
            <TouchableOpacity style={styles.vlcButton} onPress={handleOpenExternal}>
              <Ionicons name="open-outline" size={13} color="#000" />
              <Text style={styles.vlcButtonText}>VLC</Text>
            </TouchableOpacity>

            {/* Rotate Button */}
            <TouchableOpacity style={styles.rotateButton} onPress={toggleOrientation}>
              <Ionicons name="expand-outline" size={17} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* Server Selection Row (Portrait only) */}
        {!isLandscape && isCloudActive && (
          <View style={styles.serverRowWrap}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.serverRowContent}>
              {SERVERS.map((srv) => {
                const isActive = selectedServer === srv.id;
                return (
                  <TouchableOpacity
                    key={srv.id}
                    style={[styles.serverChip, isActive && styles.serverChipActive]}
                    onPress={() => {
                      if (selectedServer !== srv.id) {
                        setLoading(true);
                        setSelectedServer(srv.id);
                      }
                    }}
                  >
                    <Text style={[styles.serverChipText, isActive && styles.serverChipTextActive]}>
                      {srv.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Player Container */}
        <View style={[styles.playerContainer, isLandscape && styles.playerContainerLandscape]}>
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
              javaScriptCanOpenWindowsAutomatically={false}
              injectedJavaScriptBeforeContentLoaded={AD_BLOCK_USER_SCRIPT}
              injectedJavaScript={AD_BLOCK_USER_SCRIPT}
              userAgent="Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
              onShouldStartLoadWithRequest={(req) => {
                const u = req.url || '';
                // Prevent crash by rejecting non-http/https intents
                if (!u.startsWith('http://') && !u.startsWith('https://') && !u.startsWith('about:')) {
                  return false;
                }
                return true;
              }}
              onRenderProcessGone={() => true}
              onLoadProgress={({ nativeEvent }) => {
                if (nativeEvent.progress > 0.3) {
                  setLoading(false);
                }
              }}
              onLoadEnd={() => setLoading(false)}
              onError={() => setLoading(false)}
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
                  setLoading(true);
                }
              }}
              onLoadEnd={() => setLoading(false)}
            />
          )}

          {/* Floating Non-Blocking Loading Pill */}
          {loading && (
            <View style={styles.floatingLoader}>
              <ActivityIndicator size="small" color="#E50914" />
              <Text style={styles.floatingLoaderText}>Connecting to HD Server...</Text>
            </View>
          )}

          {/* Landscape Floating Top Bar */}
          {isLandscape && (
            <View style={styles.landscapeFloatingHeader}>
              <TouchableOpacity style={styles.landscapeBtn} onPress={handleClose}>
                <Ionicons name="arrow-back" size={20} color="#fff" />
              </TouchableOpacity>

              <Text style={styles.landscapeTitle} numberOfLines={1}>
                {item.title || item.name} {isTv ? `• S${season} E${episode}` : ''}
              </Text>

              {isCloudActive && (
                <TouchableOpacity
                  style={styles.landscapeServerBtn}
                  onPress={() => {
                    const idx = SERVERS.findIndex(s => s.id === selectedServer);
                    const next = SERVERS[(idx + 1) % SERVERS.length];
                    setLoading(true);
                    setSelectedServer(next.id);
                  }}
                >
                  <Ionicons name="swap-horizontal" size={14} color="#46d369" />
                  <Text style={styles.landscapeServerBtnText}>
                    {SERVERS.find(s => s.id === selectedServer)?.name.split(' ')[2] || 'Server'}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.landscapeBtn} onPress={toggleOrientation}>
                <Ionicons name="contract-outline" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Footer Info (Portrait only) */}
        {!isLandscape && (
          <View style={styles.footer}>
            {isCloudActive ? (
              <View style={styles.footerInner}>
                <View style={styles.footerRow}>
                  <Ionicons name="flash" size={13} color="#46d369" />
                  <Text style={styles.footerHighlight}>Zero Buffering Cloud Engine</Text>
                  <Text style={styles.footerDot}>•</Text>
                  <Text style={styles.footerMuted}>No Phone Storage Used</Text>
                </View>
                <Text style={styles.footerSub}>
                  💡 Tip: If video is slow, tap another server above for instant playback.
                </Text>
              </View>
            ) : (
              <View style={styles.footerInner}>
                <Text style={styles.footerTorrentTitle} numberOfLines={1}>
                  📡 {stream.title}
                </Text>
                <View style={styles.footerRow}>
                  <Text style={styles.footerMuted}>Seeders: {stream.seeders || 'Swarm'}</Text>
                  {stream.size ? <Text style={styles.footerMuted}>• Size: {stream.size}</Text> : null}
                  <Text style={[styles.footerMuted, { color: '#46d369' }]}>• Zero Disk Storage</Text>
                </View>
              </View>
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
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#222'
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },
  headerInfo: {
    flex: 1
  },
  title: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700'
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2
  },
  badgePill: {
    backgroundColor: '#262626',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4
  },
  badgePillText: {
    color: '#bbb',
    fontSize: 10,
    fontWeight: '700'
  },
  badgeCloud: {
    backgroundColor: 'rgba(70,211,105,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(70,211,105,0.4)'
  },
  badgeCloudText: {
    color: '#46d369',
    fontSize: 10,
    fontWeight: '800'
  },
  vlcButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ff9800',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8
  },
  vlcButtonText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '800'
  },
  rotateButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#262626',
    justifyContent: 'center',
    alignItems: 'center'
  },
  serverRowWrap: {
    backgroundColor: '#141414',
    borderBottomWidth: 1,
    borderBottomColor: '#242424',
    paddingVertical: 7
  },
  serverRowContent: {
    paddingHorizontal: 10,
    gap: 8
  },
  serverChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#222',
    borderWidth: 1,
    borderColor: '#333'
  },
  serverChipActive: {
    backgroundColor: '#E50914',
    borderColor: '#E50914'
  },
  serverChipText: {
    color: '#aaa',
    fontSize: 11,
    fontWeight: '600'
  },
  serverChipTextActive: {
    color: '#fff',
    fontWeight: '800'
  },
  playerContainer: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative'
  },
  playerContainerLandscape: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999
  },
  webview: {
    flex: 1,
    backgroundColor: '#000'
  },
  floatingLoader: {
    position: 'absolute',
    top: 14,
    alignSelf: 'center',
    backgroundColor: 'rgba(18,18,18,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 100
  },
  floatingLoaderText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600'
  },
  landscapeFloatingHeader: {
    position: 'absolute',
    top: 12,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15,15,15,0.75)',
    borderRadius: 25,
    paddingHorizontal: 10,
    paddingVertical: 6,
    zIndex: 100,
    gap: 10
  },
  landscapeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(40,40,40,0.85)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  landscapeTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
    fontWeight: '700'
  },
  landscapeServerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(30,30,30,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#444'
  },
  landscapeServerBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700'
  },
  footer: {
    backgroundColor: '#111',
    borderTopWidth: 1,
    borderTopColor: '#222',
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  footerInner: {
    gap: 3
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  footerHighlight: {
    color: '#46d369',
    fontSize: 12,
    fontWeight: '700'
  },
  footerDot: {
    color: '#666',
    fontSize: 10
  },
  footerMuted: {
    color: '#888',
    fontSize: 11
  },
  footerSub: {
    color: '#777',
    fontSize: 11
  },
  footerTorrentTitle: {
    color: '#ddd',
    fontSize: 12,
    fontWeight: '600'
  }
});
