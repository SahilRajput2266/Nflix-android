import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { STREAM_SERVERS, buildStreamUrl, AD_BLOCK_USER_SCRIPT } from '../services/streamServers';

export default function PlayerModal({
  visible,
  item,
  season = 1,
  episode = 1,
  onClose,
  onNextEpisode
}) {
  const [selectedServer, setSelectedServer] = useState(STREAM_SERVERS[0].id);
  const [loading, setLoading] = useState(true);

  if (!item) return null;

  const streamUrl = buildStreamUrl(selectedServer, item, season, episode);

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />

        {/* Top Header Controls */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={26} color="#fff" />
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <Text style={styles.title} numberOfLines={1}>
              {item.title}
            </Text>
            {item.mediaType === 'tv' && (
              <Text style={styles.episodeBadge}>
                S{season} : E{episode}
              </Text>
            )}
          </View>

          {item.mediaType === 'tv' && onNextEpisode && (
            <TouchableOpacity onPress={onNextEpisode} style={styles.nextEpBtn}>
              <Text style={styles.nextEpText}>Next</Text>
              <Ionicons name="play-forward" size={16} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {/* Streaming Video WebView */}
        <View style={styles.playerContainer}>
          {loading && (
            <View style={styles.loaderWrap}>
              <ActivityIndicator size="large" color="#E50914" />
              <Text style={styles.loadingText}>Connecting to secure stream...</Text>
            </View>
          )}
          <WebView
            key={`${selectedServer}-${item.id}-${season}-${episode}`}
            source={{ uri: streamUrl }}
            style={styles.webview}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowsFullscreenVideo={true}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            injectedJavaScript={AD_BLOCK_USER_SCRIPT}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            userAgent="Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
          />
        </View>

        {/* Stream Server Selector Bottom Bar */}
        <View style={styles.serverSection}>
          <Text style={styles.serverHeading}>Switch Stream Server (Failover):</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.serverList}>
            {STREAM_SERVERS.map((server) => {
              const active = server.id === selectedServer;
              return (
                <TouchableOpacity
                  key={server.id}
                  style={[styles.serverPill, active && styles.serverPillActive]}
                  onPress={() => setSelectedServer(server.id)}
                >
                  <Text style={[styles.serverText, active && styles.serverTextActive]}>
                    {server.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
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
    height: 54,
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
  episodeBadge: {
    color: '#E50914',
    fontSize: 12,
    fontWeight: '600'
  },
  nextEpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#262626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6
  },
  nextEpText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginRight: 4
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
  serverSection: {
    paddingVertical: 10,
    backgroundColor: '#111',
    borderTopWidth: 1,
    borderTopColor: '#222'
  },
  serverHeading: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 14,
    marginBottom: 6,
    textTransform: 'uppercase'
  },
  serverList: {
    paddingHorizontal: 12
  },
  serverPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#222',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#333'
  },
  serverPillActive: {
    backgroundColor: '#E50914',
    borderColor: '#E50914'
  },
  serverText: {
    color: '#bbb',
    fontSize: 12,
    fontWeight: '600'
  },
  serverTextActive: {
    color: '#fff',
    fontWeight: '700'
  }
});
