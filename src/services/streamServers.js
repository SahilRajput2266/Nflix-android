// Cloud Streaming Servers List & URL Builder
export const STREAM_SERVERS = [
  { id: '2embed', name: 'Server 1 (2Embed Multi)' },
  { id: 'vidlink', name: 'Server 2 (VidLink Pro)' },
  { id: 'multiembed', name: 'Server 3 (MultiEmbed Hindi)' },
  { id: 'embedsu', name: 'Server 4 (Embed.su)' },
  { id: 'smashy', name: 'Server 5 (SmashyStream)' },
  { id: 'autoembed', name: 'Server 6 (AutoEmbed FHD)' },
  { id: 'vidsrcto', name: 'Server 7 (VidSrc)' },
  { id: 'vidsrcme', name: 'Server 8 (VidSrc.me)' }
];

export function buildStreamUrl(serverId, item, season = 1, episode = 1) {
  const id = item.id;
  const isTv = item.mediaType === 'tv';

  switch (serverId) {
    case '2embed':
      return isTv
        ? `https://www.2embed.cc/embedtv/${id}&s=${season}&e=${episode}`
        : `https://www.2embed.cc/embed/${id}`;

    case 'vidlink':
      return isTv
        ? `https://vidlink.pro/tv/${id}/${season}/${episode}?primaryColor=e50914&autoplay=true`
        : `https://vidlink.pro/movie/${id}?primaryColor=e50914&autoplay=true`;

    case 'multiembed':
      return isTv
        ? `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${season}&e=${episode}`
        : `https://multiembed.mov/?video_id=${id}&tmdb=1`;

    case 'embedsu':
      return isTv
        ? `https://embed.su/embed/tv/${id}/${season}/${episode}`
        : `https://embed.su/embed/movie/${id}`;

    case 'smashy':
      return isTv
        ? `https://embed.smashystream.com/playere.php?tmdb=${id}&season=${season}&episode=${episode}`
        : `https://embed.smashystream.com/playere.php?tmdb=${id}`;

    case 'autoembed':
      return isTv
        ? `https://player.autoembed.cc/embed/tv/${id}/${season}/${episode}`
        : `https://player.autoembed.cc/embed/movie/${id}`;

    case 'vidsrcto':
      return isTv
        ? `https://vidsrc.to/embed/tv/${id}/${season}/${episode}`
        : `https://vidsrc.to/embed/movie/${id}`;

    case 'vidsrcme':
      return isTv
        ? `https://vidsrc.me/embed/tv?tmdb=${id}&season=${season}&episode=${episode}`
        : `https://vidsrc.me/embed/movie?tmdb=${id}`;

    default:
      return `https://vidlink.pro/movie/${id}`;
  }
}

// Injected JavaScript for WebView to suppress popups, redirects & ads
export const AD_BLOCK_USER_SCRIPT = `
  (function() {
    // Block window.open and popup redirects
    window.open = function() { return null; };
    window.alert = function() { return null; };
    window.confirm = function() { return true; };
    
    // Intercept rogue click overlays
    document.addEventListener('click', function(e) {
      var target = e.target;
      while (target && target.tagName) {
        if (target.tagName === 'A' && target.target === '_blank') {
          target.removeAttribute('target');
        }
        target = target.parentElement;
      }
    }, true);
  })();
  true;
`;
