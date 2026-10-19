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
  ScrollView,
  Platform
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

// 4 Verified Working Embed Providers
const SERVERS = [
  { id: 'vidsrcto', name: '⚡ Server 1 (VidSrc HD - Primary)' },
  { id: 'vidsrcpm', name: '⚡ Server 2 (VidSrc PM - 1080p)' },
  { id: '2embed', name: '⚡ Server 3 (2Embed CC - Fast)' },
  { id: 'vidlink', name: '⚡ Server 4 (VidLink Pro - Multi)' }
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
  const [selectedServer, setSelectedServer] = useState('vidsrcto');
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

  // Auto-dismiss loading indicator after 2.5s
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
    if (srv === 'vidsrcto') {
      return isTv
        ? `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`
        : `https://vidsrc.to/embed/movie/${tmdbId}`;
    }
    if (srv === 'vidsrcpm') {
      return isTv
        ? `https://vidsrc.pm/embed/tv/${tmdbId}/${season}/${episode}`
        : `https://vidsrc.pm/embed/movie/${tmdbId}`;
    }
    if (srv === '2embed') {
      return isTv
        ? `https://www.2embed.cc/embedtv/${tmdbId}&s=${season}&e=${episode}`
        : `https://www.2embed.cc/embed/${tmdbId}`;
    }
    if (srv === 'vidlink') {
      return isTv
        ? `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}?primaryColor=e50914&autoplay=true`
        : `https://vidlink.pro/movie/${tmdbId}?primaryColor=e50914&autoplay=true`;
    }
    return `https://vidsrc.to/embed/movie/${tmdbId}`;
  };

  const currentEmbedUrl = getEmbedUrl(selectedServer);

  const handleOpenExternal = async () => {
    const playUri = stream.magnetUri || stream.url || currentEmbedUrl;
    if (playUri) {
      await Clipboard.setStringAsync(playUri);
    }

    if (playUri.startsWith('http')) {
      const vlcIntent = Platform.OS === 'android'
        ? `intent:${encodeURI(playUri)}#Intent;package=org.videolan.vlc;type=video/*;action=android.intent.action.VIEW;end`
        : `vlc://${playUri}`;
      try {
        await Linking.openURL(vlcIntent);
        return;
      } catch {}
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
                Alert.alert('VLC Needed', 'Please install VLC Player from Play Store.');
              }
            }
          }
        },
        {
          text: '📥 Stream via 1DM / Flud',
          onPress: async () => {
            try {
              await Linking.openURL(playUri);
            } catch {
              Linking.openURL('https://play.google.com/store/apps/details?id=idm.internet.download.manager');
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

  // Torrent fallback screen
  const torrentFallbackHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          * { box-sizing: border-box; }
          body, html { margin:0; padding:0; width:100%; height:100%; background:#111; color:#fff; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display:flex; justify-content:center; align-items:center; }
          .card { background:#1e1e1e; border:1px solid #333; border-radius:14px; padding:24px; text-align:center; max-width:320px; box-shadow:0 10px 30px rgba(0,0,0,0.8); }
          .icon { font-size:36px; margin-bottom:12px; }
          h2 { font-size:18px; margin:0 0 8px 0; color:#fff; }
          p { font-size:13px; color:#aaa; line-height:1.4; margin:0 0 20px 0; }
          .btn { display:block; width:100%; padding:12px; border-radius:8px; font-weight:700; font-size:14px; border:none; cursor:pointer; margin-bottom:10px; }
          .btn-primary { background:#E50914; color:#fff; }
          .btn-secondary { background:#ff9800; color:#000; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">🎬</div>
          <h2>Torrent Stream Selected</h2>
          <p>For high-speed P2P playback with zero buffering, launch in VLC Player, or switch to Instant Cloud HD.</p>
          <button class="btn btn-primary" onclick="window.ReactNativeWebView && window.ReactNativeWebView.postMessage('SWITCH_CLOUD')">⚡ Play Instant Cloud HD</button>
          <button class="btn btn-secondary" onclick="window.ReactNativeWebView && window.ReactNativeWebView.postMessage('OPEN_EXTERNAL')">🎬 Play in VLC / 1DM</button>
        </div>
      </body>
    </html>
  `;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleClose}>
      <SafeAreaView style={styles.container}>
        <StatusBar hidden={isLandscape} barStyle="light-content" backgroundColor="#000" />

        {/* Portrait Header */}
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

            <TouchableOpacity style={styles.vlcButton} onPress={handleOpenExternal}>
              <Ionicons name="open-outline" size={13} color="#000" />
              <Text style={styles.vlcButtonText}>VLC</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.rotateButton} onPress={toggleOrientation}>
              <Ionicons name="expand-outline" size={17} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* Server Selection Row */}
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

        {/* Video Player Container */}
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
                if (!u.startsWith('http://') && !u.startsWith('https://') && !u.startsWith('about:')) {
                  return false;
                }
                return true;
              }}
              onRenderProcessGone={() => true}
              onLoadProgress={({ nativeEvent }) => {
                if (nativeEvent.progress > 0.3) setLoading(false);
              }}
              onLoadEnd={() => setLoading(false)}
              onError={() => setLoading(false)}
            />
          ) : (
            <WebView
              originWhitelist={['*']}
              source={{ html: torrentFallbackHtml }}
              style={styles.webview}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              onMessage={(event) => {
                const msg = event.nativeEvent.data;
                if (msg === 'SWITCH_CLOUD') {
                  setIsCloud(true);
                  setLoading(true);
                } else if (msg === 'OPEN_EXTERNAL') {
                  handleOpenExternal();
                }
              }}
              onLoadEnd={() => setLoading(false)}
            />
          )}

          {/* Non-blocking Floating Loader */}
          {loading && (
            <View style={styles.floatingLoader}>
              <ActivityIndicator size="small" color="#E50914" />
              <Text style={styles.floatingLoaderText}>Loading HD Stream...</Text>
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

        {/* Footer Info */}
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
