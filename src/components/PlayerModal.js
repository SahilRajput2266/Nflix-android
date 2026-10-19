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
  ActivityIndicator
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';

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
  const [selectedServer, setSelectedServer] = useState('multiembed');
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    if (visible) {
      // Unlock all orientations while playing video
      ScreenOrientation.unlockAsync().catch(() => {});
    }
    return () => {
      // Re-lock to portrait when leaving player
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, [visible]);

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

  const imdbId = stream.imdbId || item.imdbId;
  const isTv = item.mediaType === 'tv';

  const getEmbedUrl = (srv) => {
    if (srv === 'vidsrccc') {
      return isTv
        ? `https://vidsrc.cc/v2/embed/tv/${imdbId}/${season}/${episode}`
        : `https://vidsrc.cc/v2/embed/movie/${imdbId}`;
    }
    return isTv
      ? `https://multiembed.mov/?video_id=${imdbId}&s=${season}&e=${episode}`
      : `https://multiembed.mov/?video_id=${imdbId}`;
  };

  const currentEmbedUrl = stream.embedUrl || getEmbedUrl(selectedServer);

  const clientPlayerHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <script src="https://cdn.jsdelivr.net/npm/webtorrent@latest/webtorrent.min.js"></script>
        <style>
          * { box-sizing: border-box; }
          body, html { margin:0; padding:0; width:100%; height:100%; background:#000; color:#fff; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; overflow:hidden; }
          #container { width:100%; height:100%; display:flex; justify-content:center; align-items:center; position:relative; }
          video { width:100%; height:100%; object-fit:contain; background:#000; }
          #statusWrap { position:absolute; z-index:50; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:20px; text-align:center; }
          .spinner { width:48px; height:48px; border:4px solid #222; border-top-color:#E50914; border-radius:50%; animation:spin 0.9s linear infinite; margin-bottom:14px; }
          @keyframes spin { to { transform:rotate(360deg); } }
          #mainMsg { font-size:15px; font-weight:700; color:#fff; margin-bottom:6px; }
          #subMsg { font-size:12px; color:#888; }
          #hud { position:absolute; top:12px; left:12px; right:12px; background:rgba(18,18,18,0.85); backdrop-filter:blur(8px); padding:8px 14px; border-radius:8px; font-size:12px; display:none; justify-content:space-between; align-items:center; z-index:100; border:1px solid rgba(255,255,255,0.1); }
          .hud-item { display:flex; align-items:center; gap:6px; font-weight:600; }
          .hud-speed { color:#46d369; }
          .hud-peers { color:#00a8ff; }
          .hud-progress { color:#ff9800; }
        </style>
      </head>
      <body>
        <div id="container">
          <div id="statusWrap">
            <div class="spinner"></div>
            <div id="mainMsg">Connecting to P2P Torrent Swarm...</div>
            <div id="subMsg">Connecting to peers using phone memory</div>
          </div>
          <div id="hud">
            <div class="hud-item hud-speed" id="hudSpeed">⚡ 0 MB/s</div>
            <div class="hud-item hud-peers" id="hudPeers">👥 0 Peers</div>
            <div class="hud-item hud-progress" id="hudProgress">Buffering 0%</div>
          </div>
          <video id="player" controls autoplay playsinline></video>
        </div>
        <script>
          (function() {
            var directUrl = ${JSON.stringify(stream.url || '')};
            var magnetUri = ${JSON.stringify(stream.magnetUri || '')};
            var videoElem = document.getElementById('player');
            var statusWrap = document.getElementById('statusWrap');
            var hud = document.getElementById('hud');
            var mainMsg = document.getElementById('mainMsg');
            var subMsg = document.getElementById('subMsg');

            if (directUrl) {
              mainMsg.innerText = 'Connecting to Fast Stream...';
              videoElem.src = directUrl;
              videoElem.onloadedmetadata = function() {
                statusWrap.style.display = 'none';
              };
              return;
            }

            if (!magnetUri) {
              mainMsg.innerText = 'No valid stream magnet link found.';
              return;
            }

            try {
              var client = new WebTorrent();
              client.add(magnetUri, function(torrent) {
                mainMsg.innerText = 'Torrent Found! Buffering first chunks...';
                subMsg.innerText = 'Found ' + torrent.name;

                var videoFile = torrent.files.find(function(f) {
                  return /\\.(mp4|mkv|webm|avi|mov)$/i.test(f.name);
                }) || torrent.files[0];

                if (videoFile) {
                  videoFile.renderTo(videoElem, { autoplay: true }, function(err) {
                    if (!err) {
                      statusWrap.style.display = 'none';
                      hud.style.display = 'flex';
                    }
                  });
                }

                torrent.on('download', function() {
                  statusWrap.style.display = 'none';
                  hud.style.display = 'flex';
                  var mbSpeed = (torrent.downloadSpeed / (1024 * 1024)).toFixed(1);
                  var progressPct = (torrent.progress * 100).toFixed(1);
                  document.getElementById('hudSpeed').innerText = '⚡ ' + mbSpeed + ' MB/s';
                  document.getElementById('hudPeers').innerText = '👥 ' + torrent.numPeers + ' Peers';
                  document.getElementById('hudProgress').innerText = progressPct + '%';
                });
              });

              client.on('error', function(err) {
                mainMsg.innerText = 'Torrent Swarm Error';
                subMsg.innerText = err.message || 'Could not connect to peers. Try another stream.';
              });
            } catch(e) {
              mainMsg.innerText = 'Client Player Error';
              subMsg.innerText = e.message;
            }
          })();
        </script>
      </body>
    </html>
  `;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleClose}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />

        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <Text style={styles.title} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.subBadge} numberOfLines={1}>
              {stream.isCloudStream ? '⚡ Instant Cloud CDN' : (stream.quality || 'HD') + ' • ' + (stream.audioBadge || 'P2P')}
            </Text>
          </View>

          {/* Fullscreen / Rotate Screen Button */}
          <TouchableOpacity onPress={toggleOrientation} style={styles.rotateButton}>
            <Ionicons name={isLandscape ? 'phone-portrait-outline' : 'scan-outline'} size={20} color="#fff" />
            <Text style={styles.rotateText}>{isLandscape ? 'Portrait' : 'Rotate'}</Text>
          </TouchableOpacity>
        </View>

        {/* Cloud Stream Server Switcher */}
        {stream.isCloudStream && (
          <View style={styles.serverRow}>
            <TouchableOpacity
              style={[styles.serverChip, selectedServer === 'multiembed' && styles.serverChipActive]}
              onPress={() => {
                setLoading(true);
                setSelectedServer('multiembed');
              }}
            >
              <Text style={[styles.serverChipText, selectedServer === 'multiembed' && styles.serverChipTextActive]}>
                ⚡ Server 1 (MultiEmbed)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.serverChip, selectedServer === 'vidsrccc' && styles.serverChipActive]}
              onPress={() => {
                setLoading(true);
                setSelectedServer('vidsrccc');
              }}
            >
              <Text style={[styles.serverChipText, selectedServer === 'vidsrccc' && styles.serverChipTextActive]}>
                ⚡ Server 2 (VidSrc)
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Player Container */}
        <View style={styles.playerContainer}>
          {stream.isCloudStream ? (
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
              userAgent="Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
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

        {/* Footer Info (Hidden in landscape to maximize video) */}
        {!isLandscape && (
          <View style={styles.footer}>
            {stream.isCloudStream ? (
              <View style={styles.footerMeta}>
                <Text style={[styles.footerMetaText, { color: '#46d369', fontWeight: '700' }]}>
                  ⚡ Direct Cloud Stream (Zero Buffering)
                </Text>
                <Text style={styles.footerMetaText}>• 1080p FHD • Subtitles Included</Text>
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
    marginRight: 8
  },
  headerInfo: {
    flex: 1
  },
  title: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700'
  },
  subBadge: {
    color: '#46d369',
    fontSize: 12,
    fontWeight: '600'
  },
  rotateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#262626',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginLeft: 8
  },
  rotateText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600'
  },
  serverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#161616',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#252525'
  },
  serverChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#262626'
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
