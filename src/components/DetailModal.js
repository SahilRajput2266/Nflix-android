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
  SafeAreaView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { fetchMediaDetails, fetchTvSeasonEpisodes } from '../services/tmdb';

const { width } = Dimensions.get('window');

export default function DetailModal({
  visible,
  media,
  isSaved,
  onClose,
  onPlay,
  onToggleWatchlist
}) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [episodes, setEpisodes] = useState([]);

  useEffect(() => {
    if (!media || !visible) return;
    setLoading(true);
    fetchMediaDetails(media.id, media.mediaType).then((data) => {
      setDetails(data);
      setLoading(false);
      if (data && data.mediaType === 'tv') {
        fetchTvSeasonEpisodes(media.id, 1).then(setEpisodes);
      }
    });
  }, [media, visible]);

  const handleSeasonChange = (sNum) => {
    setSelectedSeason(sNum);
    if (media) {
      fetchTvSeasonEpisodes(media.id, sNum).then(setEpisodes);
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
                  <Text style={styles.badgeText}>HD</Text>
                </View>
                {details?.runtime ? (
                  <Text style={styles.metaText}>{details.runtime} min</Text>
                ) : null}
              </View>

              {/* Primary Action Buttons */}
              <TouchableOpacity
                style={styles.playBtn}
                onPress={() => onPlay(details || media, selectedSeason, 1)}
              >
                <Ionicons name="play" size={22} color="#000" />
                <Text style={styles.playBtnText}>Play Now</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.watchlistBtn}
                onPress={() => onToggleWatchlist(details || media)}
              >
                <Ionicons
                  name={isSaved ? 'checkmark' : 'add'}
                  size={22}
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

              {/* TV Show Seasons & Episodes */}
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

                  {/* Episodes List */}
                  {episodes.map((ep) => (
                    <TouchableOpacity
                      key={ep.id}
                      style={styles.epCard}
                      onPress={() => onPlay(details || media, ep.seasonNumber, ep.episodeNumber)}
                    >
                      <Image
                        source={{ uri: ep.still || media.poster }}
                        style={styles.epThumb}
                        resizeMode="cover"
                      />
                      <View style={styles.epInfo}>
                        <Text style={styles.epNum}>
                          {ep.episodeNumber}. {ep.name}
                        </Text>
                        <Text style={styles.epDesc} numberOfLines={2}>
                          {ep.overview || 'No description available.'}
                        </Text>
                      </View>
                      <Ionicons name="play-circle-outline" size={32} color="#E50914" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
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
    height: 250,
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
    top: 16,
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
    borderColor: '#777',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3
  },
  badgeText: {
    color: '#ccc',
    fontSize: 11,
    fontWeight: '600'
  },
  playBtn: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 6,
    marginBottom: 10
  },
  playBtnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 16,
    marginLeft: 8
  },
  watchlistBtn: {
    backgroundColor: '#262626',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 6,
    marginBottom: 16
  },
  watchlistBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
    marginLeft: 8
  },
  overview: {
    color: '#ddd',
    fontSize: 14,
    lineHeight: 22,
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
    paddingVertical: 5,
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
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#262626',
    paddingTop: 16
  },
  sectionHeading: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12
  },
  seasonList: {
    flexDirection: 'row',
    marginBottom: 16
  },
  seasonTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#222',
    marginRight: 10
  },
  seasonTabActive: {
    backgroundColor: '#E50914'
  },
  seasonTabText: {
    color: '#aaa',
    fontWeight: '600',
    fontSize: 13
  },
  seasonTabTextActive: {
    color: '#fff',
    fontWeight: '700'
  },
  epCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1b1b1b',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10
  },
  epThumb: {
    width: 90,
    height: 55,
    borderRadius: 4,
    backgroundColor: '#333'
  },
  epInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8
  },
  epNum: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 4
  },
  epDesc: {
    color: '#888',
    fontSize: 11,
    lineHeight: 15
  }
});
