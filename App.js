import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  FlatList,
  Dimensions,
  ActivityIndicator,
  StatusBar,
  RefreshControl
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  fetchTrending,
  fetchLatestMovies,
  fetchGenreMovies,
  fetchTopRated,
  searchMulti
} from './src/services/tmdb';
import {
  getWatchlist,
  toggleWatchlist,
  isInWatchlist,
  recordHistory
} from './src/services/storage';
import PlayerModal from './src/components/PlayerModal';
import DetailModal from './src/components/DetailModal';

const { width } = Dimensions.get('window');
const POSTER_WIDTH = width * 0.31;
const POSTER_HEIGHT = POSTER_WIDTH * 1.5;

export default function App() {
  const [trending, setTrending] = useState([]);
  const [latest, setLatest] = useState([]);
  const [actionMovies, setActionMovies] = useState([]);
  const [sciFiMovies, setSciFiMovies] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [watchlist, setWatchlist] = useState([]);

  // Search & Active Tabs
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'search' | 'watchlist'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [playerVisible, setPlayerVisible] = useState(false);
  const [playerItem, setPlayerItem] = useState(null);
  const [currentSeason, setCurrentSeason] = useState(1);
  const [currentEpisode, setCurrentEpisode] = useState(1);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [tr, lt, act, scifi, trated, wl] = await Promise.all([
        fetchTrending(),
        fetchLatestMovies(),
        fetchGenreMovies(28), // Action
        fetchGenreMovies(878), // Sci-Fi
        fetchTopRated(),
        getWatchlist()
      ]);
      setTrending(tr);
      setLatest(lt);
      setActionMovies(act);
      setSciFiMovies(scifi);
      setTopRated(trated);
      setWatchlist(wl);
    } catch (err) {
      console.error('Data load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSearch = async (text) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setSearchResults([]);
      return;
    }
    const results = await searchMulti(text);
    setSearchResults(results);
  };

  const openDetails = (item) => {
    setSelectedMedia(item);
    setDetailVisible(true);
  };

  const openPlayer = (item, season = 1, episode = 1) => {
    setDetailVisible(false);
    setPlayerItem(item);
    setCurrentSeason(season);
    setCurrentEpisode(episode);
    setPlayerVisible(true);
    recordHistory(item, season, episode);
  };

  const handleToggleWatchlist = async (item) => {
    const updated = await toggleWatchlist(item);
    setWatchlist(updated);
  };

  const heroItem = trending[0] || latest[0];

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#141414" />

      {/* Top Netflix Header */}
      <View style={styles.header}>
        <View style={styles.brandWrap}>
          <Text style={styles.brandN}>N</Text>
          <Text style={styles.brandText}>FLIX</Text>
        </View>

        <View style={styles.headerTabs}>
          <TouchableOpacity
            style={[styles.headerTab, activeTab === 'home' && styles.headerTabActive]}
            onPress={() => setActiveTab('home')}
          >
            <Text style={[styles.headerTabText, activeTab === 'home' && styles.headerTabTextActive]}>
              Home
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerTab, activeTab === 'watchlist' && styles.headerTabActive]}
            onPress={() => setActiveTab('watchlist')}
          >
            <Text
              style={[
                styles.headerTabText,
                activeTab === 'watchlist' && styles.headerTabTextActive
              ]}
            >
              My List ({watchlist.length})
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.searchIconBtn}
          onPress={() => setActiveTab(activeTab === 'search' ? 'home' : 'search')}
        >
          <Ionicons
            name={activeTab === 'search' ? 'close' : 'search'}
            size={22}
            color="#fff"
          />
        </TouchableOpacity>
      </View>

      {/* Search Input Bar (when Search is active) */}
      {activeTab === 'search' && (
        <View style={styles.searchBarWrap}>
          <Ionicons name="search" size={20} color="#888" style={styles.searchInsideIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search movies, TV shows, actors..."
            placeholderTextColor="#888"
            value={searchQuery}
            onChangeText={handleSearch}
            autoFocus={true}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={18} color="#888" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Main Content Area */}
      {loading ? (
        <View style={styles.centeredLoader}>
          <ActivityIndicator size="large" color="#E50914" />
          <Text style={styles.loaderText}>Loading NFlix...</Text>
        </View>
      ) : activeTab === 'search' ? (
        /* Search Grid */
        <ScrollView style={styles.container} contentContainerStyle={styles.searchGrid}>
          {searchResults.length === 0 && searchQuery.trim().length > 0 ? (
            <Text style={styles.emptyText}>No results found for "{searchQuery}"</Text>
          ) : (
            searchResults.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.posterCard}
                onPress={() => openDetails(item)}
              >
                <Image
                  source={{ uri: item.poster || item.backdrop }}
                  style={styles.posterImage}
                  resizeMode="cover"
                />
                <Text style={styles.posterTitle} numberOfLines={1}>
                  {item.title}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      ) : activeTab === 'watchlist' ? (
        /* My List View */
        <ScrollView style={styles.container} contentContainerStyle={styles.searchGrid}>
          {watchlist.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="bookmark-outline" size={60} color="#444" />
              <Text style={styles.emptyTitle}>Your List is Empty</Text>
              <Text style={styles.emptySub}>
                Add movies and TV shows to your list to watch them anytime.
              </Text>
            </View>
          ) : (
            watchlist.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.posterCard}
                onPress={() => openDetails(item)}
              >
                <Image
                  source={{ uri: item.poster || item.backdrop }}
                  style={styles.posterImage}
                  resizeMode="cover"
                />
                <Text style={styles.posterTitle} numberOfLines={1}>
                  {item.title}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      ) : (
        /* Home Screen */
        <ScrollView
          style={styles.container}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadAllData();
              }}
              tintColor="#E50914"
            />
          }
        >
          {/* Hero Banner */}
          {heroItem && (
            <View style={styles.heroWrap}>
              <Image
                source={{ uri: heroItem.backdrop || heroItem.poster }}
                style={styles.heroImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', 'rgba(20,20,20,0.6)', '#141414']}
                style={styles.heroGradient}
              />
              <View style={styles.heroContent}>
                <Text style={styles.heroTitle} numberOfLines={2}>
                  {heroItem.title}
                </Text>
                <Text style={styles.heroOverview} numberOfLines={2}>
                  {heroItem.overview}
                </Text>

                <View style={styles.heroBtnRow}>
                  <TouchableOpacity
                    style={styles.heroPlayBtn}
                    onPress={() => openPlayer(heroItem)}
                  >
                    <Ionicons name="play" size={20} color="#000" />
                    <Text style={styles.heroPlayText}>Play</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.heroInfoBtn}
                    onPress={() => openDetails(heroItem)}
                  >
                    <Ionicons name="information-circle-outline" size={22} color="#fff" />
                    <Text style={styles.heroInfoText}>Info</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.heroListBtn}
                    onPress={() => handleToggleWatchlist(heroItem)}
                  >
                    <Ionicons
                      name={watchlist.some((x) => x.id === heroItem.id) ? 'checkmark' : 'add'}
                      size={22}
                      color="#fff"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Media Carousels */}
          <MediaRow title="🔥 Trending Today" data={trending} onItemPress={openDetails} />
          <MediaRow title="✨ Latest Releases" data={latest} onItemPress={openDetails} />
          <MediaRow
            title="💥 Action & Blockbusters"
            data={actionMovies}
            onItemPress={openDetails}
          />
          <MediaRow
            title="🚀 Sci-Fi Universe"
            data={sciFiMovies}
            onItemPress={openDetails}
          />
          <MediaRow title="⭐ Top Rated Classics" data={topRated} onItemPress={openDetails} />

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Detail BottomSheet/Modal */}
      <DetailModal
        visible={detailVisible}
        media={selectedMedia}
        isSaved={selectedMedia ? watchlist.some((x) => x.id === selectedMedia.id) : false}
        onClose={() => setDetailVisible(false)}
        onPlay={openPlayer}
        onToggleWatchlist={handleToggleWatchlist}
      />

      {/* Standalone Player Modal */}
      <PlayerModal
        visible={playerVisible}
        item={playerItem}
        season={currentSeason}
        episode={currentEpisode}
        onClose={() => setPlayerVisible(false)}
        onNextEpisode={() => {
          const nextEp = currentEpisode + 1;
          setCurrentEpisode(nextEp);
          recordHistory(playerItem, currentSeason, nextEp);
        }}
      />
    </SafeAreaView>
  );
}

function MediaRow({ title, data, onItemPress }) {
  if (!data || data.length === 0) return null;
  return (
    <View style={styles.rowWrap}>
      <Text style={styles.rowTitle}>{title}</Text>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={data}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => onItemPress(item)}>
            <Image
              source={{ uri: item.poster || item.backdrop }}
              style={styles.cardImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.rowList}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#141414'
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#141414'
  },
  brandWrap: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  brandN: {
    color: '#E50914',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -1
  },
  brandText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 2,
    marginLeft: 1
  },
  headerTabs: {
    flexDirection: 'row',
    gap: 16
  },
  headerTab: {
    paddingVertical: 6,
    paddingHorizontal: 10
  },
  headerTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#E50914'
  },
  headerTabText: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '600'
  },
  headerTabTextActive: {
    color: '#fff',
    fontWeight: '700'
  },
  searchIconBtn: {
    padding: 6
  },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#262626',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44
  },
  searchInsideIcon: {
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14
  },
  container: {
    flex: 1
  },
  centeredLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loaderText: {
    color: '#888',
    marginTop: 12,
    fontSize: 14
  },
  heroWrap: {
    width,
    height: width * 0.9,
    position: 'relative',
    marginBottom: 10
  },
  heroImage: {
    width: '100%',
    height: '100%'
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject
  },
  heroContent: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16
  },
  heroTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6
  },
  heroOverview: {
    color: '#ccc',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12
  },
  heroBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  heroPlayBtn: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 4
  },
  heroPlayText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 15,
    marginLeft: 6
  },
  heroInfoBtn: {
    backgroundColor: 'rgba(100,100,100,0.5)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4
  },
  heroInfoText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6
  },
  heroListBtn: {
    backgroundColor: 'rgba(100,100,100,0.5)',
    padding: 8,
    borderRadius: 4
  },
  rowWrap: {
    marginTop: 18
  },
  rowTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    paddingHorizontal: 16,
    marginBottom: 10
  },
  rowList: {
    paddingHorizontal: 16,
    gap: 10
  },
  card: {
    width: POSTER_WIDTH,
    height: POSTER_HEIGHT,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#222'
  },
  cardImage: {
    width: '100%',
    height: '100%'
  },
  searchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
    paddingTop: 10,
    paddingBottom: 40
  },
  posterCard: {
    width: POSTER_WIDTH,
    marginBottom: 12
  },
  posterImage: {
    width: POSTER_WIDTH,
    height: POSTER_HEIGHT,
    borderRadius: 6,
    backgroundColor: '#222'
  },
  posterTitle: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 4
  },
  emptyWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16
  },
  emptySub: {
    color: '#888',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40
  },
  emptyText: {
    color: '#888',
    textAlign: 'center',
    width: '100%',
    marginTop: 40
  }
});
