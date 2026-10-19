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
import { fetchMediaDetails, fetchTvSeasonEpisodes } from '../services/tmdb';
import { fetchTorrentStreams } from '../services/torrentService';

const { width } = Dimensions.get('window');

export default function DetailModal({
  visible,
  media,
  isSaved,
  onClose,
  onPlayStream,
  onToggleWatchlist
}) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingStreams, setLoadingStreams] = useState(true);
  const [streams, setStreams] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [episodes, setEpisodes] = useState([]);

  useEffect(() => {
    if (!media || !visible) return;
    setLoading(true);
    setLoadingStreams(true);
    setStreams([]);

    fetchMediaDetails(media.id, media.mediaType).then(async (data) => {
      setDetails(data);
      setLoading(false);

      if (data && data.mediaType === 'tv') {
        const eps = await fetchTvSeasonEpisodes(media.id, 1);
        setEpisodes(eps);
      }

      const imdb = data?.imdbId || (media.imdbId);
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
    if (details?.imdbId) {
      const torrents = await fetchTorrentStreams(details.imdbId, 'tv', selectedSeason, ep.episodeNumber);
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
      if (details?.imdbId) {
        setLoadingStreams(true);
        const torrents = await fetchTorrentStreams(details.imdbId, 'tv', sNum, 1);
        setStreams(torrents);
        setLoadingStreams(false);
      }
    }
  };

  if (!media) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Backdrop Header */}
          <View style={styles.backdropWrap}>
            <Image
              source={{ uri: media.backdrop || media.poster }}
              style={styles.backdrop}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(20,20,20,0.8)', '#141414']}
              style={styles.gradient}
            />
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color="#E50914" />
            </View>
          ) : (
            <View style={styles.content}>
              <Text style={styles.title}>{details?.title || media.title}</Text>
              {details?.tagline ? <Text style={styles.tagline}>"{details.tagline}"</Text> : null}

              {/* Meta Stats Row */}
              <View style={styles.metaRow}>
                <Text style={styles.rating}>★ {details?.rating || media.rating}</Text>
                <Text style={styles.metaText}>{details?.releaseYear || media.releaseYear}</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>P2P TORRENT</Text>
                </View>
                {details?.runtime ? (
                  <Text style={styles.metaText}>{details.runtime} min</Text>
                ) : null}
              </View>

              {/* Action Buttons */}
              <TouchableOpacity
                style={styles.watchlistBtn}
                onPress={() => onToggleWatchlist(details || media)}
              >
                <Ionicons
                  name={isSaved ? 'checkmark' : 'add'}
                  size={20}
                  color="#fff"
                />
                <Text style={styles.watchlistBtnText}>
                  {isSaved ? 'In My List' : 'Add to My List'}
                </Text>
              </TouchableOpacity>

              {/* Overview */}
              <Text style={styles.overview}>{details?.overview || media.overview}</Text>

              {/* Genres */}
              {details?.genres?.length > 0 && (
                <View style={styles.genreWrap}>
                  {details.genres.map((g, idx) => (
                    <View key={idx} style={styles.genrePill}>
                      <Text style={styles.genreText}>{g}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Cast & Director */}
              {details?.director && details.director !== 'N/A' && (
                <Text style={styles.infoLine}>
                  <Text style={styles.infoLabel}>Director: </Text>
                  {details.director}
                </Text>
              )}
              {details?.cast && (
                <Text style={styles.infoLine}>
                  <Text style={styles.infoLabel}>Starring: </Text>
                  {details.cast}
                </Text>
              )}

              {/* TV Show Seasons & Episodes (if series) */}
              {details?.mediaType === 'tv' && details.seasons?.length > 0 && (
                <View style={styles.episodesSection}>
                  <Text style={styles.sectionHeading}>Episodes</Text>

                  {/* Season Selector */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.seasonList}
                  >
                    {details.seasons.map((s) => (
                      <TouchableOpacity
                        key={s.id}
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

                  {/* Episodes Horizontal Picker */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                    {episodes.map((ep) => (
                      <TouchableOpacity
                        key={ep.id}
                        style={[
                          styles.epPill,
                          selectedEpisode === ep.episodeNumber && styles.epPillActive
                        ]}
                        onPress={() => handleEpisodeSelect(ep)}
                      >
                        <Text
                          style={[
                            styles.epPillText,
                            selectedEpisode === ep.episodeNumber && styles.epPillTextActive
                          ]}
                        >
                          Ep {ep.episodeNumber}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Torrent Streams Section */}
              <View style={styles.torrentSection}>
                <View style={styles.streamHeaderRow}>
                  <Text style={styles.sectionHeading}>Available Torrent Streams</Text>
                  <Text style={styles.streamCountBadge}>{streams.length} Found</Text>
                </View>

                {loadingStreams ? (
                  <View style={styles.streamLoadingWrap}>
                    <ActivityIndicator size="small" color="#E50914" />
                    <Text style={styles.streamLoadingText}>Searching active torrent swarms & seeds...</Text>
                  </View>
                ) : streams.length === 0 ? (
                  <Text style={styles.noStreamsText}>No torrent streams found for this title.</Text>
                ) : (
                  streams.map((stream, idx) => (
                    <View key={stream.id || idx} style={styles.streamCard}>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => onPlayStream(details || media, stream, selectedSeason, selectedEpisode)}
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
                            <Text style={[styles.streamMetaItem, { color: '#46d369', fontWeight: '700' }]}>⚡ Direct High-Speed</Text>
                          ) : (
                            <Text style={[styles.streamMetaItem, { color: '#00a8ff' }]}>P2P Swarm</Text>
                          )}
                        </View>
                      </TouchableOpacity>

                      <View style={styles.streamActionRow}>
                        <TouchableOpacity
                          style={styles.streamPlayBtn}
                          onPress={() => onPlayStream(details || media, stream, selectedSeason, selectedEpisode)}
                        >
                          <Ionicons name="play" size={14} color="#000" />
                          <Text style={styles.streamPlayBtnText}>Watch Now</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.streamDownloadBtn}
                          onPress={() => handleDownload(stream)}
                        >
                          <Ionicons name="download-outline" size={15} color="#fff" />
                          <Text style={styles.streamDownloadBtnText}>Download</Text>
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
    top: Platform.OS === "android" ? (StatusBar.currentHeight || 28) + 8 : 16,
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
  infoLine: {
    color: '#bbb',
    fontSize: 13,
    marginBottom: 6
  },
  infoLabel: {
    color: '#777',
    fontWeight: '600'
  },
  episodesSection: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#262626',
    paddingTop: 16
  },
  sectionHeading: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700'
  },
  seasonList: {
    flexDirection: 'row',
    marginTop: 10,
    marginBottom: 12
  },
  seasonTab: {
    paddingHorizontal: 12,
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
  epPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#1f1f1f',
    borderRadius: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#333'
  },
  epPillActive: {
    borderColor: '#E50914',
    backgroundColor: '#2a1515'
  },
  epPillText: {
    color: '#ccc',
    fontSize: 12,
    fontWeight: '600'
  },
  epPillTextActive: {
    color: '#E50914',
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
    marginBottom: 12
  },
  streamCountBadge: {
    color: '#aaa',
    fontSize: 12,
    backgroundColor: '#222',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10
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
    gap: 10,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#282828'
  },
  streamPlayBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6
  },
  streamPlayBtnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 13
  },
  streamDownloadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#262626',
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
    borderWidth: 1,
    borderColor: '#3e3e3e'
  },
  streamDownloadBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13
  }
});