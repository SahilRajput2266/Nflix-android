import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  Platform,
  StatusBar,
  Linking,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { fetchMediaDetails, fetchTvSeasonEpisodes } from '../services/tmdb';
import { fetchTorrentStreams } from '../services/torrentService';

const { width } = Dimensions.get('window');

export default function DetailModal({
  visible,
  media,
  isSaved,
  onClose,
  onPlayStream,
  onPlay,
  onToggleWatchlist
}) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingStreams, setLoadingStreams] = useState(true);
  const [streams, setStreams] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [episodes, setEpisodes] = useState([]);
  const [audioFilter, setAudioFilter] = useState('all');

  const playFn = onPlayStream || onPlay;

  useEffect(() => {
    if (!media || !visible) return;
    setLoading(true);
    setLoadingStreams(true);
    setStreams([]);
    setAudioFilter('all');
    setSelectedSeason(1);
    setSelectedEpisode(1);

    fetchMediaDetails(media.id, media.mediaType).then(async (data) => {
      setDetails(data);
      setLoading(false);

      if (data && data.mediaType === 'tv') {
        const eps = await fetchTvSeasonEpisodes(media.id, 1);
        setEpisodes(eps);
      }

      const imdb = data?.imdbId || media.imdbId;
      if (imdb) {
        const torrents = await fetchTorrentStreams(imdb, data?.mediaType || 'movie', 1, 1);
        setStreams(torrents);
      }
      setLoadingStreams(false);
    });
  }, [media, visible]);

  const handleEpisodeSelect = async (ep) => {
    setSelectedEpisode(ep.episodeNumber);
    setLoadingStreams(true);
    const imdb = details?.imdbId || media?.imdbId;
    if (imdb) {
      const torrents = await fetchTorrentStreams(imdb, 'tv', selectedSeason, ep.episodeNumber);
      setStreams(torrents);
    }
    setLoadingStreams(false);
  };

  const handleSeasonChange = async (sNum) => {
    setSelectedSeason(sNum);
    setSelectedEpisode(1);
    if (media) {
      const eps = await fetchTvSeasonEpisodes(media.id, sNum);
      setEpisodes(eps);
      const imdb = details?.imdbId || media?.imdbId;
      if (imdb) {
        setLoadingStreams(true);
        const torrents = await fetchTorrentStreams(imdb, 'tv', sNum, 1);
        setStreams(torrents);
        setLoadingStreams(false);
      }
    }
  };

  const handlePlayCloud = (epNum = selectedEpisode) => {
    try {
      const fn = playFn || onPlayStream || onPlay;
      if (!fn) return;
      const itemData = details || media || {};
      const epObj = (episodes || []).find((e) => e.episodeNumber === epNum);
      const epTitle = epObj ? ' - S' + selectedSeason + 'E' + epNum + ': ' + (epObj.name || '') : '';

      fn(
        itemData,
        {
          isCloudStream: true,
          title: (itemData.title || itemData.name || 'Video') + epTitle,
          id: itemData.id,
          imdbId: itemData.imdbId || (media && media.imdbId) || null,
          mediaType: itemData.mediaType || media?.mediaType || (isTvShow ? 'tv' : 'movie')
        },
        selectedSeason,
        epNum
      );
    } catch (err) {
      console.warn('handlePlayCloud error:', err);
    }
  };

  const handleDownload = async (stream) => {
    const downloadUri = stream?.magnetUri || stream?.url;
    if (!downloadUri) {
      Alert.alert('Download Error', 'No download link available for this stream.');
      return;
    }

    await Clipboard.setStringAsync(downloadUri);

    if (downloadUri.startsWith('http')) {
      Linking.openURL(downloadUri).catch(() => {});
      return;
    }

    try {
      await Linking.openURL(downloadUri);
    } catch {
      Alert.alert(
        '📥 Magnet Link Copied!',
        'The torrent magnet link has been copied to your clipboard.\n\nTo download this movie directly to your phone storage, open any downloader app (like 1DM, Flud, or TorrDroid) and paste the link.\n\nOr tap below to get 1DM from Google Play Store.',
        [
          {
            text: 'Install 1DM (Play Store)',
            onPress: () =>
              Linking.openURL('https://play.google.com/store/apps/details?id=idm.internet.download.manager')
          },
          { text: 'OK, Copied!', style: 'cancel' }
        ]
      );
    }
  };

  const handleOpenVLC = async (stream) => {
    const uri = stream?.magnetUri || stream?.url;
    if (!uri) {
      Alert.alert('Error', 'No stream URL found.');
      return;
    }

    await Clipboard.setStringAsync(uri);

    // If direct HTTP link, launch VLC view intent immediately
    if (uri.startsWith('http')) {
      const vlcIntent = Platform.OS === 'android'
        ? ('intent:' + encodeURI(uri) + '#Intent;package=org.videolan.vlc;type=video/*;action=android.intent.action.VIEW;end')
        : ('vlc://' + uri);
      try {
        await Linking.openURL(vlcIntent);
        return;
      } catch (e) {}
    }

    // For magnet links: launch 1DM, TorrDroid, or Flud directly
    Alert.alert(
      '⚡ VLC / 1DM Direct Stream',
      'Choose playback method for this stream:\n\n• 1DM can stream torrents into VLC sequentially with zero disk buildup.\n• Or launch VLC Player directly.',
      [
        {
          text: '📥 Stream via 1DM / Flud',
          onPress: async () => {
            try {
              await Linking.openURL(uri);
            } catch {
              Alert.alert(
                '1DM Needed',
                'Install 1DM from Play Store to stream torrents directly into VLC Player?',
                [
                  { text: 'Get 1DM', onPress: () => Linking.openURL('https://play.google.com/store/apps/details?id=idm.internet.download.manager') },
                  { text: 'Cancel', style: 'cancel' }
                ]
              );
            }
          }
        },
        {
          text: '🎬 Launch VLC App',
          onPress: async () => {
            const vlcIntent = 'intent:#Intent;package=org.videolan.vlc;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;end';
            try {
              await Linking.openURL(vlcIntent);
            } catch {
              try {
                await Linking.openURL('vlc://');
              } catch {
                Alert.alert('VLC Player', 'Please install VLC Player from Play Store.');
              }
            }
          }
        },
        {
          text: '⚡ Play Instant Cloud HD',
          onPress: () => handlePlayCloud(selectedEpisode)
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleCopyLink = async (stream) => {
    const uri = stream?.magnetUri || stream?.url;
    if (uri) {
      await Clipboard.setStringAsync(uri);
      Alert.alert('📋 Copied!', 'Magnet link copied to clipboard. You can paste it into 1DM, Flud, TorrDroid, or VLC.');
    }
  };

  if (!media) return null;

  const filteredStreams = streams.filter((s) => {
    if (audioFilter === 'hindi') return s.audioBadge.includes('Hindi');
    if (audioFilter === 'dual') return s.audioBadge.includes('Dual');
    if (audioFilter === 'english') return s.audioBadge.includes('English');
    return true;
  });

  const isTvShow = (details?.mediaType || media?.mediaType) === 'tv';

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#141414" />
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Backdrop Header */}
          <TouchableOpacity style={styles.backdropWrap} activeOpacity={0.9} onPress={() => handlePlayCloud(selectedEpisode)}>
            <Image
              source={{ uri: media.backdrop || media.poster }}
              style={styles.backdrop}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(20,20,20,0.6)', '#141414']}
              style={styles.gradient}
            />
            <View style={styles.backdropPlayBtn}>
              <Ionicons name="play" size={28} color="#fff" />
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </TouchableOpacity>

          {/* Details Content */}
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color="#E50914" />
            </View>
          ) : (
            <View style={styles.content}>
              <Text style={styles.title}>{details?.title || media.title}</Text>
              {details?.tagline ? <Text style={styles.tagline}>"{details.tagline}"</Text> : null}

              {/* Meta info */}
              <View style={styles.metaRow}>
                <Text style={styles.rating}>★ {details?.rating || media.rating}</Text>
                <Text style={styles.metaText}>{details?.releaseYear || media.releaseYear}</Text>
                {details?.runtime ? (
                  <Text style={styles.metaText}>
                    {Math.floor(details.runtime / 60)}h {details.runtime % 60}m
                  </Text>
                ) : null}
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{isTvShow ? 'TV SERIES' : 'MOVIE'}</Text>
                </View>
              </View>

              {/* Prominent Primary Play Button (Netflix Style) */}
              <TouchableOpacity
                style={styles.primaryPlayBtn}
                activeOpacity={0.85}
                onPress={() => handlePlayCloud(selectedEpisode)}
              >
                <Ionicons name="play" size={20} color="#000" />
                <Text style={styles.primaryPlayBtnText}>
                  {isTvShow ? ('Play S' + selectedSeason + ' Ep ' + selectedEpisode) : 'Play Cloud HD'}
                </Text>
              </TouchableOpacity>

              {/* Sub-Actions Row: My List, Zero Buffer, VLC */}
              <View style={styles.actionBtnRow}>
                <TouchableOpacity
                  style={styles.actionPillBtn}
                  onPress={() => onToggleWatchlist && onToggleWatchlist(media)}
                >
                  <Ionicons name={isSaved ? 'checkmark' : 'add'} size={18} color="#fff" />
                  <Text style={styles.actionPillText}>{isSaved ? 'In My List' : 'Add to List'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionPillBtn}
                  onPress={() => handlePlayCloud(selectedEpisode)}
                >
                  <Ionicons name="flash" size={15} color="#46d369" />
                  <Text style={[styles.actionPillText, { color: '#46d369' }]}>Cloud HD</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionPillBtn}
                  onPress={() => {
                    const sample = streams[0];
                    if (sample) handleOpenVLC(sample);
                    else handlePlayCloud(selectedEpisode);
                  }}
                >
                  <Ionicons name="open-outline" size={15} color="#ff9800" />
                  <Text style={[styles.actionPillText, { color: '#ff9800' }]}>VLC / MX</Text>
                </TouchableOpacity>
              </View>

              {/* Watchlist Button */}
              <TouchableOpacity
                style={styles.watchlistBtn}
                onPress={() => onToggleWatchlist && onToggleWatchlist(media)}
              >
                <Ionicons
                  name={isSaved ? 'checkmark' : 'add'}
                  size={20}
                  color="#fff"
                />
                <Text style={styles.watchlistBtnText}>
                  {isSaved ? 'In My Watchlist' : 'Add to Watchlist'}
                </Text>
              </TouchableOpacity>

              {/* Overview */}
              <Text style={styles.overview}>{details?.overview || media.overview}</Text>

              {/* Genres */}
              {details?.genres?.length > 0 && (
                <View style={styles.genreWrap}>
                  {details.genres.map((g) => (
                    <View key={g.id || g} style={styles.genrePill}>
                      <Text style={styles.genreText}>{g.name || g}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Instant Cloud Stream Banner */}
              <TouchableOpacity
                style={styles.cloudPlayBanner}
                activeOpacity={0.85}
                onPress={() => handlePlayCloud(selectedEpisode)}
              >
                <View style={styles.cloudPlayLeft}>
                  <View style={styles.cloudPlayIconWrap}>
                    <Ionicons name="flash" size={20} color="#000" />
                  </View>
                  <View style={styles.cloudPlayTextWrap}>
                    <Text style={styles.cloudPlayTitle}>
                      {isTvShow ? 'Play S' + selectedSeason + ' Ep ' + selectedEpisode + ' (Cloud HD)' : 'Play Instant HD (Cloud)'}
                    </Text>
                    <Text style={styles.cloudPlaySub}>
                      ⚡ Zero Buffering • 🇮🇳 Hindi Audio & Subtitles
                    </Text>
                  </View>
                </View>
                <Ionicons name="play-circle" size={34} color="#E50914" />
              </TouchableOpacity>

              {/* NFlix-Style TV Show Episodes with Thumbnails */}
              {isTvShow && (
                <View style={styles.episodesSection}>
                  <View style={styles.episodesHeaderRow}>
                    <Text style={styles.sectionHeading}>Episodes</Text>
                    {episodes.length > 0 && (
                      <Text style={styles.episodesSubCount}>{episodes.length} Episodes</Text>
                    )}
                  </View>

                  {/* Season Selector Tabs */}
                  {details?.seasons?.length > 1 && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.seasonList}
                    >
                      {details.seasons.map((s) => (
                        <TouchableOpacity
                          key={s.id || s.season_number}
                          style={[
                            styles.seasonTab,
                            selectedSeason === s.season_number && styles.seasonTabActive
                          ]}
                          onPress={() => handleSeasonChange(s.season_number)}
                        >
                          <Text
                            style={[
                              styles.seasonTabText,
                              selectedSeason === s.season_number && styles.seasonTabTextActive
                            ]}
                          >
                            Season {s.season_number}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}

                  {/* Episodes Vertical Cards List with Thumbnails */}
                  <View style={styles.episodeListWrap}>
                    {episodes.map((ep) => {
                      const isCurrent = selectedEpisode === ep.episodeNumber;
                      const thumbUri = ep.still || media.backdrop || media.poster;

                      return (
                        <View
                          key={ep.id || ep.episodeNumber}
                          style={[
                            styles.episodeCard,
                            isCurrent && styles.episodeCardSelected
                          ]}
                        >
                          {/* Episode Thumbnail + Info Row */}
                          <TouchableOpacity
                            style={styles.episodeMainRow}
                            activeOpacity={0.8}
                            onPress={() => handleEpisodeSelect(ep)}
                          >
                            <View style={styles.episodeThumbWrap}>
                              <Image
                                source={{ uri: thumbUri }}
                                style={styles.episodeThumb}
                                resizeMode="cover"
                              />
                              <View style={styles.episodePlayOverlay}>
                                <Ionicons name="play" size={16} color="#fff" />
                              </View>
                              {ep.runtime ? (
                                <View style={styles.episodeDurationBadge}>
                                  <Text style={styles.episodeDurationText}>{ep.runtime}m</Text>
                                </View>
                              ) : null}
                            </View>

                            <View style={styles.episodeInfo}>
                              <Text style={styles.episodeTitle} numberOfLines={1}>
                                {ep.episodeNumber}. {ep.name || ('Episode ' + ep.episodeNumber)}
                              </Text>
                              <Text style={styles.episodeOverview} numberOfLines={2}>
                                {ep.overview || 'Tap to choose playback options below.'}
                              </Text>
                            </View>
                          </TouchableOpacity>

                          {/* 2 Clear Play Option Buttons for each Episode */}
                          <View style={styles.episodeActionRow}>
                            <TouchableOpacity
                              style={styles.episodeCloudBtn}
                              onPress={() => handlePlayCloud(ep.episodeNumber)}
                            >
                              <Ionicons name="flash" size={13} color="#fff" />
                              <Text style={styles.episodeCloudBtnText}>⚡ Play Cloud HD</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[
                                styles.episodeTorrentsBtn,
                                isCurrent && styles.episodeTorrentsBtnActive
                              ]}
                              onPress={() => handleEpisodeSelect(ep)}
                            >
                              <Ionicons name="filter" size={12} color={isCurrent ? '#fff' : '#aaa'} />
                              <Text style={[styles.episodeTorrentsBtnText, isCurrent && styles.episodeTorrentsBtnTextActive]}>
                                {isCurrent ? 'Torrents Below ▾' : 'View Torrents'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Torrent Streams Section */}
              <View style={styles.torrentSection}>
                <View style={styles.streamHeaderRow}>
                  <Text style={styles.sectionHeading}>
                    {isTvShow ? ('Torrents for S' + selectedSeason + ' Ep ' + selectedEpisode) : 'Available Torrent Streams'}
                  </Text>
                  <Text style={styles.streamCountBadge}>{streams.length} Found</Text>
                </View>

                {/* Audio Language Filter Chips */}
                {streams.length > 0 && (
                  <View style={styles.audioFilterRow}>
                    <TouchableOpacity
                      style={[styles.audioFilterChip, audioFilter === 'all' && styles.audioFilterChipActive]}
                      onPress={() => setAudioFilter('all')}
                    >
                      <Text style={[styles.audioFilterChipText, audioFilter === 'all' && styles.audioFilterChipTextActive]}>
                        All ({streams.length})
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.audioFilterChip, audioFilter === 'hindi' && styles.audioFilterChipActive]}
                      onPress={() => setAudioFilter('hindi')}
                    >
                      <Text style={[styles.audioFilterChipText, audioFilter === 'hindi' && styles.audioFilterChipTextActive]}>
                        🇮🇳 Hindi ({streams.filter((s) => s.audioBadge.includes('Hindi')).length})
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.audioFilterChip, audioFilter === 'dual' && styles.audioFilterChipActive]}
                      onPress={() => setAudioFilter('dual')}
                    >
                      <Text style={[styles.audioFilterChipText, audioFilter === 'dual' && styles.audioFilterChipTextActive]}>
                        🎧 Dual ({streams.filter((s) => s.audioBadge.includes('Dual')).length})
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.audioFilterChip, audioFilter === 'english' && styles.audioFilterChipActive]}
                      onPress={() => setAudioFilter('english')}
                    >
                      <Text style={[styles.audioFilterChipText, audioFilter === 'english' && styles.audioFilterChipTextActive]}>
                        English
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {loadingStreams ? (
                  <View style={styles.streamLoadingWrap}>
                    <ActivityIndicator size="small" color="#E50914" />
                    <Text style={styles.streamLoadingText}>Searching active torrent swarms & seeds...</Text>
                  </View>
                ) : filteredStreams.length === 0 ? (
                  <Text style={styles.noStreamsText}>No torrent streams found for this selection.</Text>
                ) : (
                  filteredStreams.map((stream, idx) => (
                    <View key={stream.id || idx} style={styles.streamCard}>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => playFn && playFn(details || media, stream, selectedSeason, selectedEpisode)}
                      >
                        <View style={styles.streamTopLine}>
                          <View style={[styles.qualityBadge, stream.quality.includes('4K') && styles.quality4k]}>
                            <Text style={styles.qualityText}>{stream.quality}</Text>
                          </View>
                          <Text style={styles.audioBadgeText}>{stream.audioBadge}</Text>
                        </View>

                        <Text style={styles.streamTitleText} numberOfLines={2}>
                          {stream.title}
                        </Text>

                        <View style={styles.streamMetaRow}>
                          {stream.size ? (
                            <Text style={styles.streamMetaItem}>💾 {stream.size}</Text>
                          ) : null}
                          <Text style={styles.streamMetaItem}>👤 {stream.seeders} Seeders</Text>
                          {stream.url ? (
                            <Text style={[styles.streamMetaItem, { color: '#46d369', fontWeight: '700' }]}>⚡ Direct</Text>
                          ) : (
                            <Text style={[styles.streamMetaItem, { color: '#00a8ff' }]}>P2P Swarm</Text>
                          )}
                        </View>
                      </TouchableOpacity>

                      {/* 4 Action Buttons Row: Watch, VLC/MX, Download, Copy */}
                      <View style={styles.streamActionRow}>
                        <TouchableOpacity
                          style={styles.streamPlayBtn}
                          onPress={() => playFn && playFn(details || media, stream, selectedSeason, selectedEpisode)}
                        >
                          <Ionicons name="play" size={13} color="#000" />
                          <Text style={styles.streamPlayBtnText}>Watch</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.streamVlcBtn}
                          onPress={() => handleOpenVLC(stream)}
                        >
                          <Ionicons name="open-outline" size={13} color="#000" />
                          <Text style={styles.streamVlcBtnText}>VLC/MX</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.streamDownloadBtn}
                          onPress={() => handleDownload(stream)}
                        >
                          <Ionicons name="download-outline" size={14} color="#fff" />
                          <Text style={styles.streamDownloadBtnText}>Download</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.streamCopyBtn}
                          onPress={() => handleCopyLink(stream)}
                        >
                          <Ionicons name="copy-outline" size={14} color="#aaa" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  primaryPlayBtn: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 6,
    marginBottom: 10,
    gap: 8,
    shadowColor: '#fff',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4
  },
  primaryPlayBtnText: {
    color: '#000',
    fontWeight: '800',
    fontSize: 16
  },
  actionBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16
  },
  actionPillBtn: {
    flex: 1,
    backgroundColor: '#262626',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 6,
    gap: 5
  },
  actionPillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600'
  },
  backdropPlayBtn: {
    position: 'absolute',
    top: '42%',
    left: '50%',
    marginLeft: -26,
    marginTop: -26,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E50914',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6
  },
  container: {
    flex: 1,
    backgroundColor: '#141414'
  },
  scroll: {
    flex: 1
  },
  backdropWrap: {
    width,
    height: 240,
    position: 'relative'
  },
  backdrop: {
    width: '100%',
    height: '100%'
  },
  gradient: {
    ...StyleSheet.absoluteFillObject
  },
  closeBtn: {
    position: 'absolute',
    top: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) + 8 : 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingWrap: {
    padding: 60,
    alignItems: 'center'
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 40
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800'
  },
  tagline: {
    color: '#aaa',
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 4,
    marginBottom: 8
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    gap: 12
  },
  rating: {
    color: '#46d369',
    fontWeight: '700',
    fontSize: 14
  },
  metaText: {
    color: '#aaa',
    fontSize: 13
  },
  badge: {
    borderWidth: 1,
    borderColor: '#E50914',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3
  },
  badgeText: {
    color: '#E50914',
    fontSize: 10,
    fontWeight: '800'
  },
  watchlistBtn: {
    backgroundColor: '#262626',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 6,
    marginBottom: 16
  },
  watchlistBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 8
  },
  overview: {
    color: '#ddd',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 16
  },
  genreWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16
  },
  genrePill: {
    backgroundColor: '#222',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14
  },
  genreText: {
    color: '#aaa',
    fontSize: 12
  },
  cloudPlayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e1e1e',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#333'
  },
  cloudPlayLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12
  },
  cloudPlayIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center'
  },
  cloudPlayTextWrap: {
    flex: 1
  },
  cloudPlayTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700'
  },
  cloudPlaySub: {
    color: '#aaa',
    fontSize: 11,
    marginTop: 2
  },
  episodesSection: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#262626',
    paddingTop: 16
  },
  episodesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  sectionHeading: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700'
  },
  episodesSubCount: {
    color: '#888',
    fontSize: 12
  },
  seasonList: {
    flexDirection: 'row',
    marginBottom: 14
  },
  seasonTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#222',
    marginRight: 8
  },
  seasonTabActive: {
    backgroundColor: '#E50914'
  },
  seasonTabText: {
    color: '#aaa',
    fontWeight: '600',
    fontSize: 12
  },
  seasonTabTextActive: {
    color: '#fff',
    fontWeight: '700'
  },
  episodeListWrap: {
    gap: 12
  },
  episodeCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#282828'
  },
  episodeCardSelected: {
    borderColor: '#E50914',
    backgroundColor: '#221616'
  },
  episodeMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  episodeThumbWrap: {
    width: 110,
    height: 65,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#262626'
  },
  episodeThumb: {
    width: '100%',
    height: '100%'
  },
  episodePlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  episodeDurationBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3
  },
  episodeDurationText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700'
  },
  episodeInfo: {
    flex: 1
  },
  episodeTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4
  },
  episodeOverview: {
    color: '#999',
    fontSize: 11,
    lineHeight: 16
  },
  episodeActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#242424'
  },
  episodeCloudBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#E50914',
    paddingVertical: 6,
    borderRadius: 5
  },
  episodeCloudBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700'
  },
  episodeTorrentsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#262626',
    paddingVertical: 6,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#383838'
  },
  episodeTorrentsBtnActive: {
    borderColor: '#E50914'
  },
  episodeTorrentsBtnText: {
    color: '#ccc',
    fontSize: 11,
    fontWeight: '600'
  },
  episodeTorrentsBtnTextActive: {
    color: '#fff',
    fontWeight: '700'
  },
  torrentSection: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#262626',
    paddingTop: 16
  },
  streamHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  streamCountBadge: {
    color: '#aaa',
    fontSize: 12,
    backgroundColor: '#222',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10
  },
  audioFilterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap'
  },
  audioFilterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#222'
  },
  audioFilterChipActive: {
    backgroundColor: '#E50914'
  },
  audioFilterChipText: {
    color: '#aaa',
    fontSize: 11,
    fontWeight: '600'
  },
  audioFilterChipTextActive: {
    color: '#fff',
    fontWeight: '700'
  },
  streamLoadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 20
  },
  streamLoadingText: {
    color: '#888',
    fontSize: 13
  },
  noStreamsText: {
    color: '#777',
    fontSize: 13,
    paddingVertical: 12
  },
  streamCard: {
    backgroundColor: '#1c1c1c',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#E50914'
  },
  streamTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  qualityBadge: {
    backgroundColor: '#333',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3
  },
  quality4k: {
    backgroundColor: '#9c27b0'
  },
  qualityText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700'
  },
  audioBadgeText: {
    color: '#46d369',
    fontSize: 12,
    fontWeight: '600'
  },
  streamTitleText: {
    color: '#eee',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: 8
  },
  streamMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  streamMetaItem: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600'
  },
  streamActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#282828'
  },
  streamPlayBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 7,
    borderRadius: 6,
    gap: 4
  },
  streamPlayBtnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 12
  },
  streamVlcBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff9800',
    paddingVertical: 7,
    borderRadius: 6,
    gap: 4
  },
  streamVlcBtnText: {
    color: '#000',
    fontWeight: '800',
    fontSize: 12
  },
  streamDownloadBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#282828',
    paddingVertical: 7,
    borderRadius: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: '#444'
  },
  streamDownloadBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12
  },
  streamCopyBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: '#222',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333'
  }
});
