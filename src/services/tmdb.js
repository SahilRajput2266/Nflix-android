// TMDB Standalone Service for NFlix Mobile
const TMDB_API_KEY = '0fd277f90c948d5d3d39c5b1242cec88';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_W500 = 'https://image.tmdb.org/t/p/w500';
const IMAGE_ORIGINAL = 'https://image.tmdb.org/t/p/original';

export const getPosterUrl = (path) => (path ? `${IMAGE_W500}${path}` : null);
export const getBackdropUrl = (path) => (path ? `${IMAGE_ORIGINAL}${path}` : null);

async function tmdbFetch(endpoint) {
  const delimiter = endpoint.includes('?') ? '&' : '?';
  const url = `${BASE_URL}${endpoint}${delimiter}api_key=${TMDB_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB request failed with status: ${res.status}`);
  return res.json();
}

function formatMedia(item) {
  const isTv = item.media_type === 'tv' || (!item.title && !!item.name);
  return {
    id: item.id,
    mediaType: isTv ? 'tv' : 'movie',
    title: item.title || item.name || 'Untitled',
    overview: item.overview || 'No overview available.',
    poster: getPosterUrl(item.poster_path),
    backdrop: getBackdropUrl(item.backdrop_path),
    rating: item.vote_average ? item.vote_average.toFixed(1) : '7.8',
    releaseYear: (item.release_date || item.first_air_date || '2024').substring(0, 4)
  };
}

export async function fetchTrending() {
  try {
    const data = await tmdbFetch('/trending/all/day');
    return (data.results || []).map(formatMedia);
  } catch (err) {
    console.warn('Falling back to cinemeta trending:', err.message);
    return fetchCinemetaFallback();
  }
}

export async function fetchLatestMovies() {
  try {
    const data = await tmdbFetch('/movie/now_playing?page=1');
    return (data.results || []).map((item) => formatMedia({ ...item, media_type: 'movie' }));
  } catch (err) {
    console.warn('Error fetching latest movies:', err.message);
    return [];
  }
}

export async function fetchGenreMovies(genreId) {
  try {
    const data = await tmdbFetch(`/discover/movie?with_genres=${genreId}&sort_by=popularity.desc`);
    return (data.results || []).map((item) => formatMedia({ ...item, media_type: 'movie' }));
  } catch (err) {
    console.warn('Error fetching genre movies:', err.message);
    return [];
  }
}

export async function fetchTopRated() {
  try {
    const data = await tmdbFetch('/movie/top_rated?page=1');
    return (data.results || []).map((item) => formatMedia({ ...item, media_type: 'movie' }));
  } catch (err) {
    console.warn('Error fetching top rated:', err.message);
    return [];
  }
}

export async function searchMulti(query) {
  if (!query || !query.trim()) return [];
  try {
    const data = await tmdbFetch(`/search/multi?query=${encodeURIComponent(query.trim())}`);
    return (data.results || [])
      .filter((item) => item.media_type === 'movie' || item.media_type === 'tv')
      .map(formatMedia);
  } catch (err) {
    console.warn('Error searching:', err.message);
    return [];
  }
}

export async function fetchMediaDetails(id, mediaType = 'movie') {
  const type = mediaType === 'tv' ? 'tv' : 'movie';
  try {
    const data = await tmdbFetch(`/${type}/${id}?append_to_response=credits,videos,external_ids`);
    const director = (data.credits?.crew || []).find((c) => c.job === 'Director')?.name || 'N/A';
    const cast = (data.credits?.cast || []).slice(0, 6).map((c) => c.name).join(', ');
    const trailer = (data.videos?.results || []).find(
      (v) => (v.type === 'Trailer' || v.type === 'Teaser') && v.site === 'YouTube'
    )?.key;

    return {
      ...formatMedia({ ...data, media_type: type }),
      runtime: data.runtime || data.episode_run_time?.[0] || 115,
      genres: (data.genres || []).map((g) => g.name),
      tagline: data.tagline || '',
      director,
      cast,
      trailerKey: trailer || null,
      imdbId: data.external_ids?.imdb_id || null,
      seasonsCount: data.number_of_seasons || 1,
      episodesCount: data.number_of_episodes || 0,
      seasons: (data.seasons || []).filter((s) => s.season_number > 0)
    };
  } catch (err) {
    console.warn('Error fetching details:', err.message);
    return null;
  }
}

export async function fetchTvSeasonEpisodes(tvId, seasonNumber = 1) {
  try {
    const data = await tmdbFetch(`/tv/${tvId}/season/${seasonNumber}`);
    return (data.episodes || []).map((ep) => ({
      id: ep.id,
      episodeNumber: ep.episode_number,
      seasonNumber: ep.season_number,
      name: ep.name,
      overview: ep.overview,
      still: ep.still_path ? `${IMAGE_W500}${ep.still_path}` : null,
      runtime: ep.runtime || 45
    }));
  } catch (err) {
    console.warn('Error fetching season episodes:', err.message);
    return [];
  }
}

async function fetchCinemetaFallback() {
  try {
    const res = await fetch('https://v3-cinemeta.strem.io/catalog/movie/top.json');
    const data = await res.json();
    return (data.metas || []).slice(0, 15).map((m) => ({
      id: m.imdb_id || m.id,
      mediaType: 'movie',
      title: m.name,
      overview: m.description || '',
      poster: m.poster,
      backdrop: m.background,
      rating: m.imdbRating || '7.5',
      releaseYear: m.year || '2024'
    }));
  } catch {
    return [];
  }
}
