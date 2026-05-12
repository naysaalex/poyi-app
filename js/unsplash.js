// js/unsplash.js
// Unsplash API wrapper. Set UNSPLASH_KEY below or leave blank to use demo images.
// Free key: https://unsplash.com/developers (50 req/hr demo, 5000/hr with key)

const UNSPLASH_KEY = ''; // <-- paste your Unsplash Access Key here

const SEARCH_QUERIES = {
  all: 'travel destinations scenic', food: 'local food cuisine travel',
  views: 'scenic views landscape', nature: 'nature wilderness travel',
  architecture: 'architecture buildings travel', culture: 'cultural travel landmarks',
  beach: 'beach tropical ocean', adventure: 'adventure outdoor travel',
};

const DEMO = [
  { id:'d1',  url:'https://images.unsplash.com/photo-1499856871958-5b9627545d1a', alt:'Paris at night',        location:'Paris, France',    cats:['architecture','views'],   ar:1.5  },
  { id:'d2',  url:'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf', alt:'Tokyo streets',         location:'Tokyo, Japan',     cats:['culture','architecture'], ar:0.75 },
  { id:'d3',  url:'https://images.unsplash.com/photo-1552832230-c0197dd311b5', alt:'Rome colosseum',          location:'Rome, Italy',      cats:['architecture','culture'], ar:1.2  },
  { id:'d4',  url:'https://images.unsplash.com/photo-1537996194471-e657df975ab4', alt:'Bali rice terraces',   location:'Bali, Indonesia',  cats:['nature','views'],         ar:0.9  },
  { id:'d5',  url:'https://images.unsplash.com/photo-1528360983277-13d401cdc186', alt:'Greek food',           location:'Santorini, Greece',cats:['food'],                   ar:1.0  },
  { id:'d6',  url:'https://images.unsplash.com/photo-1533929736458-ca588d08c8be', alt:'London bridge',        location:'London, UK',       cats:['architecture','views'],   ar:1.3  },
  { id:'d7',  url:'https://images.unsplash.com/photo-1506905925346-21bda4d32df4', alt:'Swiss Alps',           location:'Switzerland',      cats:['nature','adventure'],     ar:0.7  },
  { id:'d8',  url:'https://images.unsplash.com/photo-1558618666-fcd25c85cd64', alt:'Morocco market',         location:'Marrakech, Morocco',cats:['culture','food'],        ar:1.1  },
  { id:'d9',  url:'https://images.unsplash.com/photo-1512813195386-6cf811ad3542', alt:'Maldives',             location:'Maldives',         cats:['beach','views'],          ar:1.4  },
  { id:'d10', url:'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9', alt:'Venice canals',        location:'Venice, Italy',    cats:['architecture','culture'], ar:0.85 },
  { id:'d11', url:'https://images.unsplash.com/photo-1490806843957-31f4c9a91c65', alt:'Northern lights',      location:'Iceland',          cats:['nature','adventure'],     ar:1.6  },
  { id:'d12', url:'https://images.unsplash.com/photo-1555396273-367ea4eb4db5', alt:'Sushi restaurant',       location:'Tokyo, Japan',     cats:['food'],                   ar:1.0  },
  { id:'d13', url:'https://images.unsplash.com/photo-1467269204594-9661b134dd2b', alt:'Machu Picchu',         location:'Peru',             cats:['nature','culture','views'],ar:0.8 },
  { id:'d14', url:'https://images.unsplash.com/photo-1585155784229-aff921ccfa11', alt:'Dubai skyline',        location:'Dubai, UAE',       cats:['architecture','views'],   ar:1.3  },
  { id:'d15', url:'https://images.unsplash.com/photo-1498503182468-3b51cbb6cb24', alt:'Amsterdam canals',     location:'Amsterdam, NL',    cats:['architecture','culture'], ar:0.9  },
  { id:'d16', url:'https://images.unsplash.com/photo-1596422846543-75c6fc197f07', alt:'Korean food bowl',     location:'Seoul, Korea',     cats:['food'],                   ar:1.0  },
  { id:'d17', url:'https://images.unsplash.com/photo-1516108317508-6788f6a160e4', alt:'Amalfi Coast',         location:'Amalfi, Italy',    cats:['views','beach'],          ar:1.2  },
  { id:'d18', url:'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df', alt:'New York skyline',     location:'New York, USA',    cats:['architecture','views'],   ar:1.5  },
  { id:'d19', url:'https://images.unsplash.com/photo-1504214208698-ea1916a2195a', alt:'Safari sunset',        location:'Kenya',            cats:['nature','adventure'],     ar:1.4  },
  { id:'d20', url:'https://images.unsplash.com/photo-1541795795328-f073b763494e', alt:'Barcelona architecture',location:'Barcelona, Spain', cats:['architecture'],          ar:0.75 },
];

window.Unsplash = {
  DEMO,

  async search(query, page = 1, perPage = 30) {
    if (!UNSPLASH_KEY) {
      const q = query.toLowerCase();
      return DEMO.filter(i => i.alt.toLowerCase().includes(q) || (i.location||'').toLowerCase().includes(q) || i.cats.some(c => c.includes(q)));
    }
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}&orientation=squarish`,
      { headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` } }
    );
    const data = await res.json();
    return (data.results || []).map(p => ({
      id: p.id, url: p.urls.regular, thumb: p.urls.small,
      alt: p.alt_description || query, location: p.user?.location || '',
      cats: [], ar: p.width / p.height,
    }));
  },

  async getDiscover(cat = 'all') {
    const query = SEARCH_QUERIES[cat] || 'travel';
    if (!UNSPLASH_KEY) {
      if (cat === 'all') return DEMO;
      return DEMO.filter(i => i.cats.includes(cat));
    }
    return this.search(query, 1, 40);
  },

  thumbUrl(img) {
    return (img.thumb || img.url) + (img.url.includes('unsplash.com') ? '?w=400&q=80' : '');
  },
};
