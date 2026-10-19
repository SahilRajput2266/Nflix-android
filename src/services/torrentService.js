// 100% Client-Side Torrent Service (Runs entirely on mobile, no backend server needed)
export async function fetchTorrentStreams(imdbId, mediaType = 'movie', season = 1, episode = 1, debridKey = null) {
  if (!imdbId) return [];

  let cleanImdb = String(imdbId).trim();
  if (!cleanImdb.startsWith('tt')) {
    cleanImdb = 'tt' + cleanImdb;
  }

  const configPrefix = debridKey ? `realdebrid=${debridKey.trim()}/` : '';
  const endpoint = mediaType === 'tv'
    ? `https://torrentio.strem.fun/${configPrefix}stream/series/${cleanImdb}:${season}:${episode}.json`
    : `https://torrentio.strem.fun/${configPrefix}stream/movie/${cleanImdb}.json`;

  try {
    const res = await fetch(endpoint, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36'
      }
    });

    if (!res.ok) throw new Error(`Torrentio error: ${res.status}`);
    const data = await res.json();
    if (!data.streams || !Array.isArray(data.streams)) return [];

    const parsed = data.streams.map((s, idx) => {
      const rawTitle = s.title || '';
      const nameLine = s.name || '';

      const seedersMatch = rawTitle.match(/👤\s*(\d+)/);
      const seeders = seedersMatch ? parseInt(seedersMatch[1], 10) : 0;

      const sizeMatch = rawTitle.match(/💾\s*([\d\.]+\s*[GM]B)/i);
      const size = sizeMatch ? sizeMatch[1] : '';

      let quality = '1080p FHD';
      if (/4k|2160p|uhd/i.test(nameLine + rawTitle)) quality = '4K Ultra HD';
      else if (/1080p/i.test(nameLine + rawTitle)) quality = '1080p FHD';
      else if (/720p/i.test(nameLine + rawTitle)) quality = '720p HD';

      const isHindi = /hindi|hin\b/i.test(rawTitle);
      const isDualAudio = /dual[\s\-_.]*audio/i.test(rawTitle);
      const isTelugu = /telugu/i.test(rawTitle);
      const isTamil = /tamil/i.test(rawTitle);

      let audioBadge = 'English';
      if (isHindi && isDualAudio) audioBadge = '🇮🇳 Hindi + English Dual Audio';
      else if (isHindi) audioBadge = '🇮🇳 Hindi Dubbed';
      else if (isDualAudio) audioBadge = '🎧 Dual Audio';
      else if (isTelugu) audioBadge = 'Telugu Audio';
      else if (isTamil) audioBadge = 'Tamil Audio';

      const firstLine = rawTitle.split('\n')[0].replace(/[\.\[\]]/g, ' ').trim();

      // Build standard magnet URI for client-side P2P streaming
      const trackers = [
        'wss://tracker.openwebtorrent.com',
        'wss://tracker.btorrent.xyz',
        'wss://tracker.fastcast.nz',
        'wss://tracker.webtorrent.dev',
        'udp://tracker.opentrackr.org:1337/announce',
        'udp://open.stealth.si:80/announce',
        'udp://tracker.torrent.eu.org:451/announce'
      ].map(t => '&tr=' + encodeURIComponent(t)).join('');

      const magnetUri = s.infoHash
        ? `magnet:?xt=urn:btih:${s.infoHash}&dn=${encodeURIComponent(firstLine || 'Video')}${trackers}`
        : null;

      return {
        id: s.infoHash || ('stream-' + idx),
        infoHash: s.infoHash,
        url: s.url || null,
        magnetUri,
        quality,
        audioBadge,
        isHindi: isHindi || isDualAudio,
        seeders,
        size,
        title: firstLine || `Stream ${idx + 1}`,
        fileIdx: s.fileIdx !== undefined ? s.fileIdx : 0
      };
    });

    parsed.sort((a, b) => {
      if (a.isHindi && !b.isHindi) return -1;
      if (!a.isHindi && b.isHindi) return 1;
      return b.seeders - a.seeders;
    });

    return parsed;
  } catch (err) {
    console.warn('fetchTorrentStreams client-side error:', err.message);
    return [];
  }
}
