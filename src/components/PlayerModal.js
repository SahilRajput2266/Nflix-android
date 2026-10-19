import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

export default function PlayerModal({
  visible,
  item,
  stream,
  season = 1,
  episode = 1,
  onClose
}) {
  const [loading, setLoading] = useState(true);

  if (!item || !stream) return null;

  // If stream has direct URL, use it; otherwise construct stream player HTML
  const streamUrl = stream.url || `https://webtorrent.io/free-torrents#${stream.infoHash}`;

  const playerHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          body, html { margin:0; padding:0; width:100%; height:100%; background:#000; display:flex; justify-content:center; align-items:center; }
          video { width:100%; height:100%; object-fit:contain; }
        </style>
      </head>
      <body>
        <video id="player" controls autoplay playsinline src="${stream.url || ''}"></video>
      </body>
    </html>
  `;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />

        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={26} color="#fff" />
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <Text style={styles.title} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.subBadge} numberOfLines={1}>
              {stream.quality} • {stream.audioBadge}
            </Text>
          </View>
        </View>

        {/* Video Player Area */}
        <View style={styles.playerContainer}>
          {loading && (
            <View style={styles.loaderWrap}>
              <ActivityIndicator size="large" color="#E50914" />
              <Text style={styles.loadingText}>Connecting to Torrent Stream...</Text>
            </View>
          )}

          <WebView
            source={stream.url ? { html: playerHtml } : { uri: streamUrl }}
            style={styles.webview}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowsFullscreenVideo={true}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
          />
        </View>

        {/* Bottom Stream Telemetry Bar */}
        <View style={styles.footer}>
          <Text style={styles.footerText} numberOfLines={1}>
            📡 {stream.title}
          </Text>
          <View style={styles.footerMeta}>
            <Text style={styles.footerMetaText}>Seeders: {stream.seeders}</Text>
            {stream.size ? <Text style={styles.footerMetaText}>• Size: {stream.size}</Text> : null}
          </View>
        </View>
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
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 28) : 0,
    height: Platform.OS === "android" ? 54 + (StatusBar.currentHeight || 28) : 54,
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
    fontSize: 16,
    fontWeight: '700'
  },
  subBadge: {
    color: '#46d369',
    fontSize: 12,
    fontWeight: '600'
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
  loaderWrap: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10
  },
  loadingText: {
    color: '#aaa',
    fontSize: 13,
    marginTop: 12
  },
  footer: {
    padding: 12,
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
