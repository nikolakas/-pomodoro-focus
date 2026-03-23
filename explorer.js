const ExplorerModule = (function() {

  const COUNTRIES = [
    { id:'italy',         name:'Italy',           flag:'🇮🇹', capital:'Rome',         pop:'60.4M', continent:'Europe',   lat:41.9,  lng:12.5,   fact:'Italy has more UNESCO World Heritage Sites than any other country.' },
    { id:'greece',        name:'Greece',          flag:'🇬🇷', capital:'Athens',       pop:'10.7M', continent:'Europe',   lat:39.1,  lng:21.8,   fact:'Greece has over 6,000 islands, only 227 are inhabited.' },
    { id:'france',        name:'France',          flag:'🇫🇷', capital:'Paris',        pop:'67.8M', continent:'Europe',   lat:46.2,  lng:2.2,    fact:'France is the most visited country in the world — 90M tourists/year.' },
    { id:'spain',         name:'Spain',           flag:'🇪🇸', capital:'Madrid',       pop:'47.4M', continent:'Europe',   lat:40.5,  lng:-3.7,   fact:'Spain invented the mop, the stapler, and the submarine.' },
    { id:'germany',       name:'Germany',         flag:'🇩🇪', capital:'Berlin',       pop:'83.2M', continent:'Europe',   lat:51.2,  lng:10.5,   fact:'Germany has over 1,500 types of beer brewed within its borders.' },
    { id:'uk',            name:'United Kingdom',  flag:'🇬🇧', capital:'London',       pop:'67.2M', continent:'Europe',   lat:55.4,  lng:-3.4,   fact:'The UK invented the World Wide Web, telephone, and television.' },
    { id:'portugal',      name:'Portugal',        flag:'🇵🇹', capital:'Lisbon',       pop:'10.3M', continent:'Europe',   lat:39.4,  lng:-8.2,   fact:'Portugal is the world\'s largest producer of cork.' },
    { id:'netherlands',   name:'Netherlands',     flag:'🇳🇱', capital:'Amsterdam',    pop:'17.5M', continent:'Europe',   lat:52.1,  lng:5.3,    fact:'The Netherlands has more bicycles than people.' },
    { id:'belgium',       name:'Belgium',         flag:'🇧🇪', capital:'Brussels',     pop:'11.6M', continent:'Europe',   lat:50.5,  lng:4.5,    fact:'Belgium invented French fries — they\'re actually Belgian!' },
    { id:'switzerland',   name:'Switzerland',     flag:'🇨🇭', capital:'Bern',         pop:'8.7M',  continent:'Europe',   lat:46.8,  lng:8.2,    fact:'Switzerland has not been at war since 1815.' },
    { id:'austria',       name:'Austria',         flag:'🇦🇹', capital:'Vienna',       pop:'9.1M',  continent:'Europe',   lat:47.5,  lng:14.5,   fact:'Vienna is consistently rated the world\'s most liveable city.' },
    { id:'poland',        name:'Poland',          flag:'🇵🇱', capital:'Warsaw',       pop:'37.8M', continent:'Europe',   lat:51.9,  lng:19.1,   fact:'Poland has the world\'s largest castle by land area — Malbork.' },
    { id:'czech',         name:'Czech Republic',  flag:'🇨🇿', capital:'Prague',       pop:'10.9M', continent:'Europe',   lat:49.8,  lng:15.5,   fact:'Czech Republic has the highest beer consumption per capita in the world.' },
    { id:'hungary',       name:'Hungary',         flag:'🇭🇺', capital:'Budapest',     pop:'9.7M',  continent:'Europe',   lat:47.2,  lng:19.5,   fact:'Hungary invented the Rubik\'s Cube, the ballpoint pen, and the krypton bulb.' },
    { id:'romania',       name:'Romania',         flag:'🇷🇴', capital:'Bucharest',    pop:'19.0M', continent:'Europe',   lat:45.9,  lng:24.9,   fact:'Romania is home to Dracula\'s Castle in Transylvania.' },
    { id:'sweden',        name:'Sweden',          flag:'🇸🇪', capital:'Stockholm',    pop:'10.4M', continent:'Europe',   lat:60.1,  lng:18.6,   fact:'Sweden has 221,800 islands — more than almost any other country.' },
    { id:'norway',        name:'Norway',          flag:'🇳🇴', capital:'Oslo',         pop:'5.4M',  continent:'Europe',   lat:60.5,  lng:8.5,    fact:'Norway introduced salmon sushi to Japan in the 1980s.' },
    { id:'denmark',       name:'Denmark',         flag:'🇩🇰', capital:'Copenhagen',   pop:'5.9M',  continent:'Europe',   lat:56.3,  lng:9.5,    fact:'Denmark is consistently rated the happiest country in the world.' },
    { id:'finland',       name:'Finland',         flag:'🇫🇮', capital:'Helsinki',     pop:'5.5M',  continent:'Europe',   lat:61.9,  lng:25.7,   fact:'Finland has more saunas than cars — roughly 3.3 million.' },
    { id:'croatia',       name:'Croatia',         flag:'🇭🇷', capital:'Zagreb',       pop:'4.0M',  continent:'Europe',   lat:45.1,  lng:15.2,   fact:'Croatia invented the necktie — cravat comes from Croatian.' },
    { id:'serbia',        name:'Serbia',          flag:'🇷🇸', capital:'Belgrade',     pop:'6.9M',  continent:'Europe',   lat:44.0,  lng:21.0,   fact:'Tesla was born in Serbia.' },
    { id:'ukraine',       name:'Ukraine',         flag:'🇺🇦', capital:'Kyiv',         pop:'43.5M', continent:'Europe',   lat:48.4,  lng:31.2,   fact:'Ukraine is the largest country entirely within Europe.' },
    { id:'turkey',        name:'Turkey',          flag:'🇹🇷', capital:'Ankara',       pop:'84.3M', continent:'Europe',   lat:38.9,  lng:35.2,   fact:'Turkey is where Noah\'s Ark is said to have landed — on Mount Ararat.' },
    { id:'iceland',       name:'Iceland',         flag:'🇮🇸', capital:'Reykjavik',    pop:'0.37M', continent:'Europe',   lat:64.9,  lng:-18.0,  fact:'Iceland has no mosquitoes and no army.' },
    { id:'ireland',       name:'Ireland',         flag:'🇮🇪', capital:'Dublin',       pop:'5.1M',  continent:'Europe',   lat:53.1,  lng:-8.2,   fact:'Ireland is the only country with a musical instrument as its national symbol — the harp.' },
    { id:'slovakia',      name:'Slovakia',        flag:'🇸🇰', capital:'Bratislava',   pop:'5.5M',  continent:'Europe',   lat:48.7,  lng:19.7,   fact:'Slovakia has the highest number of castles per capita in the world.' },
    { id:'bulgaria',      name:'Bulgaria',        flag:'🇧🇬', capital:'Sofia',        pop:'6.5M',  continent:'Europe',   lat:42.7,  lng:25.5,   fact:'Bulgaria is one of the oldest countries in Europe, founded in 681 AD.' },
    { id:'albania',       name:'Albania',         flag:'🇦🇱', capital:'Tirana',       pop:'2.8M',  continent:'Europe',   lat:41.2,  lng:20.2,   fact:'In Albania, nodding means NO and shaking means YES.' },
    { id:'slovenia',      name:'Slovenia',        flag:'🇸🇮', capital:'Ljubljana',    pop:'2.1M',  continent:'Europe',   lat:46.1,  lng:14.8,   fact:'Slovenia has the world\'s oldest wooden wheel, over 5,000 years old.' },
    { id:'bosnia',        name:'Bosnia',          flag:'🇧🇦', capital:'Sarajevo',     pop:'3.3M',  continent:'Europe',   lat:43.9,  lng:17.7,   fact:'Sarajevo was the first city in Europe to have a tram system.' },
    { id:'egypt',         name:'Egypt',           flag:'🇪🇬', capital:'Cairo',        pop:'104M',  continent:'Africa',   lat:26.8,  lng:30.8,   fact:'Ancient Egyptians used moldy bread as an antibiotic 3,500 years ago.' },
    { id:'morocco',       name:'Morocco',         flag:'🇲🇦', capital:'Rabat',        pop:'37.5M', continent:'Africa',   lat:31.8,  lng:-7.1,   fact:'Morocco is home to the world\'s oldest university — al-Qarawiyyin, founded 859 AD.' },
    { id:'tunisia',       name:'Tunisia',         flag:'🇹🇳', capital:'Tunis',        pop:'12.0M', continent:'Africa',   lat:33.9,  lng:9.6,    fact:'Tunisia was the filming location for the original Star Wars desert scenes.' },
    { id:'algeria',       name:'Algeria',         flag:'🇩🇿', capital:'Algiers',      pop:'46.0M', continent:'Africa',   lat:28.0,  lng:1.7,    fact:'Algeria is the largest country in Africa and the Arab world.' },
    { id:'libya',         name:'Libya',           flag:'🇱🇾', capital:'Tripoli',      pop:'7.0M',  continent:'Africa',   lat:26.3,  lng:17.2,   fact:'Over 90% of Libya is covered by the Sahara Desert.' },
    { id:'nigeria',       name:'Nigeria',         flag:'🇳🇬', capital:'Abuja',        pop:'223M',  continent:'Africa',   lat:9.1,   lng:8.7,    fact:'Nigeria is Africa\'s most populous country and largest economy.' },
    { id:'kenya',         name:'Kenya',           flag:'🇰🇪', capital:'Nairobi',      pop:'55.0M', continent:'Africa',   lat:-0.0,  lng:37.9,   fact:'Kenya is home to the Great Rift Valley and world\'s fastest marathon runners.' },
    { id:'ethiopia',      name:'Ethiopia',        flag:'🇪🇹', capital:'Addis Ababa',  pop:'126M',  continent:'Africa',   lat:9.1,   lng:40.5,   fact:'Ethiopia is the only African country never colonized.' },
    { id:'ghana',         name:'Ghana',           flag:'🇬🇭', capital:'Accra',        pop:'33.5M', continent:'Africa',   lat:7.9,   lng:-1.0,   fact:'Ghana was the first sub-Saharan African country to gain independence, in 1957.' },
    { id:'tanzania',      name:'Tanzania',        flag:'🇹🇿', capital:'Dodoma',       pop:'65.5M', continent:'Africa',   lat:-6.4,  lng:34.9,   fact:'Tanzania is home to Mount Kilimanjaro — Africa\'s highest peak.' },
    { id:'southafrica',   name:'South Africa',    flag:'🇿🇦', capital:'Cape Town',    pop:'60.1M', continent:'Africa',   lat:-30.6, lng:22.9,   fact:'South Africa has three capital cities — the only country in the world to do so.' },
    { id:'saudiarabia',   name:'Saudi Arabia',    flag:'🇸🇦', capital:'Riyadh',       pop:'35.9M', continent:'Asia',     lat:23.9,  lng:45.1,   fact:'Saudi Arabia is the largest country in the world with no rivers.' },
    { id:'uae',           name:'UAE',             flag:'🇦🇪', capital:'Abu Dhabi',    pop:'9.9M',  continent:'Asia',     lat:23.4,  lng:53.8,   fact:'Dubai has a ski resort inside a shopping mall in the middle of the desert.' },
    { id:'israel',        name:'Israel',          flag:'🇮🇱', capital:'Jerusalem',    pop:'9.4M',  continent:'Asia',     lat:31.0,  lng:34.9,   fact:'Israel leads the world in recycled water, reusing 90% of its wastewater.' },
    { id:'jordan',        name:'Jordan',          flag:'🇯🇴', capital:'Amman',        pop:'10.3M', continent:'Asia',     lat:30.6,  lng:36.2,   fact:'Petra was carved into rose-red cliffs over 2,000 years ago.' },
    { id:'japan',         name:'Japan',           flag:'🇯🇵', capital:'Tokyo',        pop:'125M',  continent:'Asia',     lat:36.2,  lng:138.3,  fact:'Japan has over 6,800 islands and vending machines outnumber people in Tokyo.' },
    { id:'china',         name:'China',           flag:'🇨🇳', capital:'Beijing',      pop:'1.4B',  continent:'Asia',     lat:35.9,  lng:104.2,  fact:'China invented paper, printing, gunpowder, and the compass.' },
    { id:'india',         name:'India',           flag:'🇮🇳', capital:'New Delhi',    pop:'1.4B',  continent:'Asia',     lat:20.6,  lng:79.1,   fact:'India invented the number zero.' },
    { id:'thailand',      name:'Thailand',        flag:'🇹🇭', capital:'Bangkok',      pop:'71.6M', continent:'Asia',     lat:15.9,  lng:100.9,  fact:'Thailand is the world\'s largest exporter of rice.' },
    { id:'southkorea',    name:'South Korea',     flag:'🇰🇷', capital:'Seoul',        pop:'51.7M', continent:'Asia',     lat:36.5,  lng:127.9,  fact:'South Korea has the world\'s fastest internet speeds.' },
    { id:'vietnam',       name:'Vietnam',         flag:'🇻🇳', capital:'Hanoi',        pop:'98.2M', continent:'Asia',     lat:14.1,  lng:108.3,  fact:'Vietnam is the world\'s second largest coffee exporter.' },
    { id:'indonesia',     name:'Indonesia',       flag:'🇮🇩', capital:'Jakarta',      pop:'275M',  continent:'Asia',     lat:-2.5,  lng:118.0,  fact:'Indonesia has more active volcanoes than any country — over 130.' },
    { id:'philippines',   name:'Philippines',     flag:'🇵🇭', capital:'Manila',       pop:'115M',  continent:'Asia',     lat:12.9,  lng:121.8,  fact:'The Philippines is made up of 7,641 islands.' },
    { id:'malaysia',      name:'Malaysia',        flag:'🇲🇾', capital:'Kuala Lumpur', pop:'33.6M', continent:'Asia',     lat:4.2,   lng:108.0,  fact:'Malaysia is home to the world\'s largest cave chamber — Sarawak Chamber.' },
    { id:'singapore',     name:'Singapore',       flag:'🇸🇬', capital:'Singapore',    pop:'5.9M',  continent:'Asia',     lat:1.4,   lng:103.8,  fact:'Singapore is the only city-state in Southeast Asia.' },
    { id:'nepal',         name:'Nepal',           flag:'🇳🇵', capital:'Kathmandu',    pop:'30.0M', continent:'Asia',     lat:28.4,  lng:84.1,   fact:'Nepal is home to 8 of the world\'s 10 tallest mountains including Everest.' },
    { id:'pakistan',      name:'Pakistan',        flag:'🇵🇰', capital:'Islamabad',    pop:'231M',  continent:'Asia',     lat:30.4,  lng:69.3,   fact:'Pakistan has more glaciers than anywhere outside the polar regions.' },
    { id:'srilanka',      name:'Sri Lanka',       flag:'🇱🇰', capital:'Colombo',      pop:'22.2M', continent:'Asia',     lat:7.9,   lng:80.8,   fact:'Sri Lanka is the world\'s top tea exporter and birthplace of cinnamon.' },
    { id:'cambodia',      name:'Cambodia',        flag:'🇰🇭', capital:'Phnom Penh',   pop:'17.2M', continent:'Asia',     lat:12.6,  lng:104.9,  fact:'Angkor Wat is the largest religious monument in the world.' },
    { id:'taiwan',        name:'Taiwan',          flag:'🇹🇼', capital:'Taipei',       pop:'23.6M', continent:'Asia',     lat:23.7,  lng:121.0,  fact:'Taiwan produces over 90% of the world\'s most advanced semiconductors.' },
    { id:'mongolia',      name:'Mongolia',        flag:'🇲🇳', capital:'Ulaanbaatar',  pop:'3.4M',  continent:'Asia',     lat:46.9,  lng:103.8,  fact:'Mongolia is the most sparsely populated country in the world.' },
    { id:'kazakhstan',    name:'Kazakhstan',      flag:'🇰🇿', capital:'Astana',       pop:'19.4M', continent:'Asia',     lat:48.0,  lng:68.0,   fact:'Kazakhstan is the world\'s largest landlocked country.' },
    { id:'uzbekistan',    name:'Uzbekistan',      flag:'🇺🇿', capital:'Tashkent',     pop:'35.3M', continent:'Asia',     lat:41.4,  lng:64.6,   fact:'Uzbekistan was at the heart of the ancient Silk Road.' },
    { id:'myanmar',       name:'Myanmar',         flag:'🇲🇲', capital:'Naypyidaw',    pop:'54.4M', continent:'Asia',     lat:17.1,  lng:96.9,   fact:'Myanmar has over 2,000 ancient pagodas in the plains of Bagan.' },
    { id:'bangladesh',    name:'Bangladesh',      flag:'🇧🇩', capital:'Dhaka',        pop:'170M',  continent:'Asia',     lat:23.7,  lng:90.4,   fact:'Bangladesh is home to the Sundarbans — the largest mangrove forest.' },
    { id:'usa',           name:'USA',             flag:'🇺🇸', capital:'Washington DC',pop:'335M',  continent:'Americas', lat:38.0,  lng:-97.0,  fact:'The USA has the world\'s largest economy and 50 states across 6 time zones.' },
    { id:'canada',        name:'Canada',          flag:'🇨🇦', capital:'Ottawa',       pop:'38.2M', continent:'Americas', lat:56.1,  lng:-106.3, fact:'Canada has the longest coastline in the world at over 202,000 km.' },
    { id:'brazil',        name:'Brazil',          flag:'🇧🇷', capital:'Brasília',     pop:'215M',  continent:'Americas', lat:-14.2, lng:-51.9,  fact:'Brazil contains 60% of the Amazon rainforest.' },
    { id:'argentina',     name:'Argentina',       flag:'🇦🇷', capital:'Buenos Aires', pop:'45.6M', continent:'Americas', lat:-38.4, lng:-63.6,  fact:'Argentina is home to Patagonia — one of the most remote places on Earth.' },
    { id:'mexico',        name:'Mexico',          flag:'🇲🇽', capital:'Mexico City',  pop:'130M',  continent:'Americas', lat:23.6,  lng:-102.6, fact:'Mexico City is built on the ruins of the ancient Aztec capital Tenochtitlan.' },
    { id:'colombia',      name:'Colombia',        flag:'🇨🇴', capital:'Bogotá',       pop:'51.9M', continent:'Americas', lat:4.6,   lng:-74.3,  fact:'Colombia is the only South American country with coastlines on both oceans.' },
    { id:'chile',         name:'Chile',           flag:'🇨🇱', capital:'Santiago',     pop:'19.5M', continent:'Americas', lat:-35.7, lng:-71.5,  fact:'Chile is the longest country in the world at 4,300 km north to south.' },
    { id:'peru',          name:'Peru',            flag:'🇵🇪', capital:'Lima',         pop:'33.4M', continent:'Americas', lat:-9.2,  lng:-75.0,  fact:'Peru is home to Machu Picchu — the lost city of the Incas.' },
    { id:'cuba',          name:'Cuba',            flag:'🇨🇺', capital:'Havana',       pop:'11.3M', continent:'Americas', lat:21.5,  lng:-79.0,  fact:'Cuba has one of the highest literacy rates in the world at 99.7%.' },
    { id:'venezuela',     name:'Venezuela',       flag:'🇻🇪', capital:'Caracas',      pop:'28.3M', continent:'Americas', lat:6.4,   lng:-66.6,  fact:'Venezuela is home to Angel Falls — the world\'s highest uninterrupted waterfall.' },
    { id:'ecuador',       name:'Ecuador',         flag:'🇪🇨', capital:'Quito',        pop:'18.0M', continent:'Americas', lat:-1.8,  lng:-78.2,  fact:'Ecuador is named after the equator which passes directly through it.' },
    { id:'bolivia',       name:'Bolivia',         flag:'🇧🇴', capital:'Sucre',        pop:'12.1M', continent:'Americas', lat:-16.3, lng:-63.6,  fact:'Bolivia has the world\'s highest navigable lake — Titicaca at 3,800m.' },
    { id:'uruguay',       name:'Uruguay',         flag:'🇺🇾', capital:'Montevideo',   pop:'3.5M',  continent:'Americas', lat:-32.5, lng:-55.8,  fact:'Uruguay was the first country to fully legalize marijuana.' },
    { id:'costarica',     name:'Costa Rica',      flag:'🇨🇷', capital:'San José',     pop:'5.2M',  continent:'Americas', lat:9.7,   lng:-83.8,  fact:'Costa Rica generates over 99% of its electricity from renewable sources.' },
    { id:'panama',        name:'Panama',          flag:'🇵🇦', capital:'Panama City',  pop:'4.4M',  continent:'Americas', lat:8.5,   lng:-80.8,  fact:'The Panama Canal saves ships 12,875 km vs sailing around South America.' },
    { id:'australia',     name:'Australia',       flag:'🇦🇺', capital:'Canberra',     pop:'26.5M', continent:'Oceania',  lat:-25.3, lng:133.8,  fact:'Australia is the only country that is also a continent.' },
    { id:'newzealand',    name:'New Zealand',     flag:'🇳🇿', capital:'Wellington',   pop:'5.1M',  continent:'Oceania',  lat:-40.9, lng:174.9,  fact:'New Zealand was the first country to give women the right to vote, in 1893.' },
    { id:'fiji',          name:'Fiji',            flag:'🇫🇯', capital:'Suva',         pop:'0.93M', continent:'Oceania',  lat:-17.7, lng:178.1,  fact:'Fiji is made up of 332 islands, only 110 of which are inhabited.' },
    { id:'papuanewguinea',name:'Papua New Guinea',flag:'🇵🇬', capital:'Port Moresby', pop:'10.3M', continent:'Oceania',  lat:-6.3,  lng:143.9,  fact:'Papua New Guinea has over 800 languages — the most on Earth.' },
  ];

  const MAP_W = 900, MAP_H = 450;
  const KM_PER_MIN = 15;
  const MAP_IMG_URL = 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Blue_Marble_2002.png/1280px-Blue_Marble_2002.png';

  let state = {
    origin: null,
    unlockedCountries: [],
    activeFlight: null,  // { destId, kmNeeded }
originChangesUsed: 0,

currentFilter: 'all',
liveInterval: null,
viewTransform: { scale: 1, offsetX: 0, offsetY: 0 },
_isDragging: false,
_dragStart: { x: 0, y: 0 },

  };

  // ── Helpers ──
  function project(lat, lng) {
    return { x: (lng + 180) / 360 * MAP_W, y: (90 - lat) / 180 * MAP_H };
  }

  function getDistance(c1, c2) {
    const R = 6371, toRad = x => x * Math.PI / 180;
    const dLat = toRad(c2.lat - c1.lat), dLng = toRad(c2.lng - c1.lng);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(c1.lat)) * Math.cos(toRad(c2.lat)) * Math.sin(dLng/2)**2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
  }

  function formatStudyTime(km) {
    const mins = Math.ceil(km / KM_PER_MIN);
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60), m = mins % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }

  function getCompletedKm() {
    return (window.app?.state?.totalMinutes || parseInt(localStorage.getItem('pomodoro-total-minutes') || 0)) * KM_PER_MIN;
  }

  function getLiveKm() {
    if (!window.app?.state?.isRunning || !window.app?.state?.sessionStartTime || window.app?.state?.mode !== 'work') return 0;
    return ((Date.now() - window.app.state.sessionStartTime) / 60000) * KM_PER_MIN;
  }

  function getTotalKm() { return getCompletedKm() + getLiveKm(); }

  // Find best intermediate stop for routes > 3600 km
  function getSuggestedStop(dest) {
    const origin = COUNTRIES.find(c => c.id === state.origin);
    if (!origin) return null;
    const directDist = getDistance(origin, dest);
    if (directDist <= 3600) return null;
    const completedKm = getCompletedKm();
    let best = null, bestScore = Infinity;
    COUNTRIES.forEach(c => {
      if (c.id === state.origin || c.id === dest.id) return;
      const accessible = state.unlockedCountries.includes(c.id) || getDistance(origin, c) <= completedKm;
      if (!accessible) return;
      const d1 = getDistance(origin, c), d2 = getDistance(c, dest);
      const maxLeg = Math.max(d1, d2);
      if (maxLeg < directDist && maxLeg < bestScore) { bestScore = maxLeg; best = c; }
    });
    return best;
  }

  // ── Persist ──
  function loadState() {
    const s = localStorage.getItem('pomodoro-explorer');
    if (s) { const d = JSON.parse(s); state.origin = d.origin || null; state.unlockedCountries = d.unlockedCountries || []; state.activeFlight = d.activeFlight || null;
state.originChangesUsed = d.originChangesUsed || 0;
 } }
  function saveState() { localStorage.setItem('pomodoro-explorer', JSON.stringify({ origin: state.origin, unlockedCountries: state.unlockedCountries, activeFlight: state.activeFlight,
originChangesUsed: state.originChangesUsed || 0
 })); }

  // ── Map Image ──
  let mapImage = null;
  function loadMapImage() {
    return new Promise(resolve => {
      if (mapImage) { resolve(); return; }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => { mapImage = img; resolve(); };
      img.onerror = () => { mapImage = null; resolve(); };
      img.src = MAP_IMG_URL;
    });
  }

  // ── Draw Map ──
  function drawMap(liveProg) {
    const canvas = document.getElementById('explorer-map');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
   ctx.setTransform(1,0,0,1,0,0);
ctx.clearRect(0, 0, MAP_W, MAP_H);
ctx.setTransform(
  state.viewTransform.scale, 0, 0,
  state.viewTransform.scale,
  state.viewTransform.offsetX,
  state.viewTransform.offsetY
);
 

    // Background
    if (mapImage) {
      ctx.drawImage(mapImage, 0, 0, MAP_W, MAP_H);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(0, 0, MAP_W, MAP_H);
    } else {
      ctx.fillStyle = '#0a1628';
      ctx.fillRect(0, 0, MAP_W, MAP_H);
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 0.5;
      for (let lat = -90; lat <= 90; lat += 30) { const y=(90-lat)/180*MAP_H; ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(MAP_W,y); ctx.stroke(); }
      for (let lng = -180; lng <= 180; lng += 30) { const x=(lng+180)/360*MAP_W; ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,MAP_H); ctx.stroke(); }
    }

    const origin = COUNTRIES.find(c => c.id === state.origin);
    const totalKm = getTotalKm();
    const completedKm = getCompletedKm();

    // Draw flight path if active
    if (state.activeFlight && origin) {
      const dest = COUNTRIES.find(c => c.id === state.activeFlight.destId);
      if (dest) {
        const needed = state.activeFlight.kmNeeded;
        const prog = Math.min(totalKm / needed, 1);
        drawCurvedPath(ctx, origin, dest, prog);

        // Draw plane on path
        const p1 = project(origin.lat, origin.lng);
        const p2 = project(dest.lat, dest.lng);
        const cp = { x:(p1.x+p2.x)/2, y:Math.min(p1.y,p2.y)-Math.abs(p2.x-p1.x)*0.2 };
        const t = typeof liveProg !== 'undefined' ? liveProg : prog;
        const px = (1-t)**2*p1.x + 2*(1-t)*t*cp.x + t**2*p2.x;
        const py = (1-t)**2*p1.y + 2*(1-t)*t*cp.y + t**2*p2.y;
        ctx.font = '18px serif';
        ctx.textAlign = 'center';
        ctx.fillText('✈️', px, py);
      }
    }

    // Draw country dots
    COUNTRIES.forEach(c => {
      const p = project(c.lat, c.lng);
      const isOrigin = c.id === state.origin;
      const isUnlocked = state.unlockedCountries.includes(c.id);
      const dist = origin ? getDistance(origin, c) : 9999;
      const isReachable = origin && dist <= completedKm && !isUnlocked && !isOrigin;
      const isActive = state.activeFlight?.destId === c.id;

    const sc = state.viewTransform.scale;
    let r = 5 / sc, col = 'rgba(255,255,255,0.2)';
    if (isOrigin)        { r = 10 / sc; col = '#ff6b6b'; }
    else if (isUnlocked) { r =  8 / sc; col = '#64ff96'; }
    else if (isActive)   { r =  9 / sc; col = '#ffca28'; }
    else if (isReachable){ r =  7 / sc; col = 'rgba(78,205,196,0.8)'; }

    if (isOrigin || isUnlocked || isReachable || isActive) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, r + 5 / sc, 0, Math.PI*2);
ctx.strokeStyle = col; ctx.globalAlpha = 0.3; ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI*2);
      ctx.fillStyle = col;
      ctx.fill();

      if (isOrigin || isUnlocked || isActive) {
      ctx.font = `${isOrigin ? 'bold ' : ''}${Math.round(9 / sc)}px Inter,sans-serif`;

        ctx.textAlign = 'center';
        ctx.fillStyle = col;
        ctx.fillText(c.flag, p.x, p.y - r - 3);
      }
    });
  }

  function drawCurvedPath(ctx, from, to, progress) {
    const p1 = project(from.lat, from.lng);
    const p2 = project(to.lat, to.lng);
    const cp = { x:(p1.x+p2.x)/2, y:Math.min(p1.y,p2.y)-Math.abs(p2.x-p1.x)*0.2 };
    // Full dashed grey path
    ctx.beginPath(); ctx.strokeStyle='rgba(255,255,255,0.2)'; ctx.lineWidth=1.5; ctx.setLineDash([4,4]); ctx.globalAlpha=0.5;
    for (let i=0; i<=60; i++) { const t=i/60; const x=(1-t)**2*p1.x+2*(1-t)*t*cp.x+t**2*p2.x; const y=(1-t)**2*p1.y+2*(1-t)*t*cp.y+t**2*p2.y; i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); }
    ctx.stroke();
    // Progress colored path
    if (progress > 0) {
      ctx.beginPath(); ctx.strokeStyle='#4ecdc4'; ctx.lineWidth=2.5; ctx.setLineDash([]); ctx.globalAlpha=1;
      const steps = Math.floor(60 * progress);
      for (let i=0; i<=steps; i++) { const t=i/60; const x=(1-t)**2*p1.x+2*(1-t)*t*cp.x+t**2*p2.x; const y=(1-t)**2*p1.y+2*(1-t)*t*cp.y+t**2*p2.y; i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); }
      ctx.stroke();
    }
    ctx.setLineDash([]); ctx.globalAlpha=1;
  }

  // ── Live Update ──
  function startLiveTracking() {
    stopLiveTracking();
    state.liveInterval = setInterval(() => {
      if (!state.activeFlight) return;
      const totalKm = getTotalKm();
      const needed = state.activeFlight.kmNeeded;
      const prog = Math.min(totalKm / needed, 1);
      drawMap(prog);
      updateFlightOverlay(totalKm, needed, prog);
      if (prog >= 1) {
        stopLiveTracking();
        const dest = COUNTRIES.find(c => c.id === state.activeFlight.destId);
        if (dest) unlockCountry(dest);
      }
    }, 2000);
  }

  function stopLiveTracking() {
    if (state.liveInterval) { clearInterval(state.liveInterval); state.liveInterval = null; }
  }

  function updateFlightOverlay(currentKm, neededKm, prog) {
    const overlay = document.getElementById('explorer-flight-overlay');
    if (!overlay || !state.activeFlight) return;
    overlay.style.display = 'block';
    const fill = document.getElementById('flight-progress-fill');
    const plane = document.getElementById('flight-plane-icon');
    const dest = COUNTRIES.find(c => c.id === state.activeFlight.destId);
    const origin = COUNTRIES.find(c => c.id === state.origin);
    if (fill) fill.style.width = `${prog * 100}%`;
    if (plane) plane.style.left = `${Math.min(prog * 96, 96)}%`;
    document.getElementById('flight-flag').textContent = dest?.flag || '✈️';
    document.getElementById('flight-route').textContent = `${origin?.flag} ${origin?.name} → ${dest?.flag} ${dest?.name}`;
    const remaining = Math.max(0, neededKm - currentKm);
    document.getElementById('flight-distance').textContent = `${Math.round(currentKm).toLocaleString()} / ${neededKm.toLocaleString()} km — ${formatStudyTime(remaining)} left`;
  }

  // ── Destination Cards ──
  function renderDestinations() {
    const grid = document.getElementById('explorer-dest-grid');
    if (!grid) return;
    const origin = COUNTRIES.find(c => c.id === state.origin);
    const completedKm = getCompletedKm();
    const totalKm = getTotalKm();

    let list = COUNTRIES.filter(c => c.id !== state.origin);

    if (state.currentFilter === 'unlocked') {
      list = list.filter(c => state.unlockedCountries.includes(c.id));
    } else if (state.currentFilter === 'reachable') {
      list = list.filter(c => !state.unlockedCountries.includes(c.id));
    }

    if (origin) list.sort((a,b) => getDistance(origin,a) - getDistance(origin,b));
    grid.innerHTML = '';

    if (list.length === 0) {
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:2rem;font-size:0.88rem;">
        ${state.currentFilter === 'unlocked' ? '🌍 No countries unlocked yet!' : 'No countries found.'}
      </div>`;
      return;
    }

    list.forEach(c => {
      if (!origin) return;
      const dist = getDistance(origin, c);
      const isUnlocked = state.unlockedCountries.includes(c.id);
      const isActive = state.activeFlight?.destId === c.id;
      const minsNeeded = Math.ceil(dist / KM_PER_MIN);
      const isReachable = dist <= completedKm && !isUnlocked;
      const needsStop = dist > 3600;
      const stop = needsStop ? getSuggestedStop(c) : null;

      const card = document.createElement('div');
      card.className = `dest-card ${isUnlocked ? 'dest-unlocked' : ''} ${isActive ? 'dest-active-flight' : ''}`;
      if (!isReachable && !isUnlocked && !isActive) card.style.opacity = '0.55';
      if (isActive) card.style.borderColor = '#ffca28';

      let statusHtml = '';
      if (isUnlocked) statusHtml = `<div class="dest-badge">✓ Visited</div>`;
      else if (isActive) statusHtml = `<div class="dest-badge" style="background:rgba(255,202,40,0.2);color:#ffca28;">✈️ Flying</div>`;
      else if (isReachable) statusHtml = `<div class="dest-badge" style="background:rgba(78,205,196,0.2);color:#4ecdc4;">Ready</div>`;

      let stopHtml = '';
      if (needsStop && stop && !isUnlocked) {
        stopHtml = `<div style="font-size:0.6rem;color:#ffca28;margin-top:2px;">via ${stop.flag} ${stop.name}</div>`;
      }

      card.innerHTML = `
        ${statusHtml}
        <div class="dest-flag">${c.flag}</div>
        <div class="dest-name">${c.name}</div>
        <div class="dest-km">${dist.toLocaleString()} km</div>
        <div style="font-size:0.65rem;color:var(--accent);">${formatStudyTime(minsNeeded)}</div>
        ${stopHtml}
      `;

      card.addEventListener('click', () => selectDestination(c.id));
      grid.appendChild(card);
    });
  }

  function selectDestination(id) {
    const dest = COUNTRIES.find(c => c.id === id);
    const origin = COUNTRIES.find(c => c.id === state.origin);
    if (!dest || !origin) return;

    const isUnlocked = state.unlockedCountries.includes(id);
    if (isUnlocked) { showArrivalModal(dest, getDistance(origin, dest), false); return; }

    if (state.activeFlight?.destId === id) {
      const subtitle = document.getElementById('explorer-dest-subtitle');
      if (subtitle) subtitle.textContent = `✈️ Already flying to ${dest.flag} ${dest.name}! Keep studying!`;
      return;
    }

    const dist = getDistance(origin, dest);
    const completedKm = getCompletedKm();
    const needsStop = dist > 3600;
    const stop = getSuggestedStop(dest);

    const subtitle = document.getElementById('explorer-dest-subtitle');
    if (subtitle) {
      if (needsStop && stop && !state.unlockedCountries.includes(stop.id)) {
        subtitle.innerHTML = `
          <span>⚠️ Too far for direct flight! Suggested stop: ${stop.flag} <strong>${stop.name}</strong> first</span>
          <button class="btn btn-primary" id="btn-confirm-fly" style="margin-left:8px;height:30px;padding:0 12px;font-size:0.8rem;border-radius:8px;">
            Fly to ${stop.flag} ${stop.name} first
          </button>
        `;
        document.getElementById('btn-confirm-fly')?.addEventListener('click', () => confirmFlight(stop));
      } else {
        subtitle.innerHTML = `
          <span>${origin.flag} → ${dest.flag} <strong>${dest.name}</strong> — ${dist.toLocaleString()} km — Study ${formatStudyTime(dist)} total</span>
          <button class="btn btn-primary" id="btn-confirm-fly" style="margin-left:8px;height:30px;padding:0 12px;font-size:0.8rem;border-radius:8px;">
            ✈️ Set Destination
          </button>
        `;
        document.getElementById('btn-confirm-fly')?.addEventListener('click', () => confirmFlight(dest));
      }
    }
  }

  function confirmFlight(dest) {
    const origin = COUNTRIES.find(c => c.id === state.origin);
    if (!origin) return;
    const dist = getDistance(origin, dest);
    const completedKm = getCompletedKm();
    // kmNeeded = total km from all study to reach destination
    // We need completedKm + X more km = dist
    // So kmNeeded = completedKm + (dist - completedKm if dist > completedKm else 0)
    const kmNeeded = Math.max(completedKm + 1, dist); // need at least this total km
    state.activeFlight = { destId: dest.id, kmNeeded };
    saveState();

    const subtitle = document.getElementById('explorer-dest-subtitle');
    if (subtitle) subtitle.innerHTML = `✈️ Flying to ${dest.flag} <strong>${dest.name}</strong> — Study to move the plane!`;

    drawMap();
    renderDestinations();
    updateFlightOverlay(completedKm, kmNeeded, completedKm / kmNeeded);
    startLiveTracking();

    if (window.app) window.app.showToast('✈️ Destination Set!', `Flying to ${dest.name}. Study to move the plane!`, '✈️');
  }

function unlockCountry(dest) {
  if (!state.unlockedCountries.includes(dest.id)) state.unlockedCountries.push(dest.id);
  state.activeFlight = null;
  saveState();
  document.getElementById('explorer-flight-overlay').style.display = 'none';
  drawMap();
  renderDestinations();
  updateTopbar();
  showArrivalModal(dest, getDistance(COUNTRIES.find(c=>c.id===state.origin), dest), true);
  if (window.app?.addXp) window.app.addXp(Math.floor(getDistance(COUNTRIES.find(c=>c.id===state.origin), dest) / 100));
  if (window.app?.showToast) window.app.showToast(`🎉 ${dest.name} Unlocked!`, `You've arrived at ${dest.flag} ${dest.name}!`, dest.flag);
}

  // ── Arrival Modal ──
  function showArrivalModal(dest, dist, isNew) {
    const modal = document.getElementById('explorer-arrival-modal');
    if (!modal) return;
    document.getElementById('arrival-flag').textContent = dest.flag;
    document.getElementById('arrival-title').textContent = isNew ? `Welcome to ${dest.name}!` : `${dest.flag} ${dest.name}`;
    document.getElementById('arrival-distance').textContent = dist.toLocaleString();
    document.getElementById('arrival-capital').textContent = dest.capital;
    document.getElementById('arrival-population').textContent = dest.pop;
    document.getElementById('arrival-fact-text').textContent = dest.fact;
    const xp = Math.floor(dist / 100);
    document.getElementById('arrival-xp').textContent = isNew ? `+${xp}` : '—';
    document.getElementById('arrival-time').textContent = Math.ceil(dist / KM_PER_MIN);
    if (isNew) {
      const conf = document.getElementById('arrival-confetti');
      if (conf) { conf.innerHTML = ''; for (let i=0;i<20;i++) { const p=document.createElement('div'); p.style.cssText=`position:absolute;width:8px;height:8px;border-radius:2px;background:${['#ff6b6b','#4ecdc4','#ffca28','#a78bfa'][i%4]};left:${Math.random()*100}%;top:-10px;animation:conf-fall ${1+Math.random()}s ease forwards ${Math.random()*0.5}s;`; conf.appendChild(p); } }
    }
    modal.style.display = 'flex';
    document.getElementById('btn-arrival-set-origin').onclick = () => {
      state.origin = dest.id;
      state.activeFlight = null;
        saveState();
      modal.style.display = 'none';
      showMainUI();
    };
    document.getElementById('btn-arrival-close').onclick = () => { modal.style.display = 'none'; };
  }

  // ── Top Bar ──
  function updateTopbar() {
    const origin = COUNTRIES.find(c => c.id === state.origin);
    if (!origin) return;
    const km = getTotalKm();
    document.getElementById('explorer-origin-flag').textContent = origin.flag;
    document.getElementById('explorer-origin-name').textContent = origin.name;
    document.getElementById('explorer-total-km').textContent = Math.round(km).toLocaleString() + ' km';
    document.getElementById('explorer-countries-count').textContent = state.unlockedCountries.length;
    const continents = new Set(state.unlockedCountries.map(id => COUNTRIES.find(x=>x.id===id)?.continent).filter(Boolean));
    document.getElementById('explorer-continents-count').textContent = continents.size;
    const subtitle = document.getElementById('explorer-dest-subtitle');
    if (subtitle && !state.activeFlight) subtitle.textContent = `Flying from ${origin.flag} ${origin.name} — click a country to set destination`;
  }

  // ── Init ──
  function populateOriginSelect() {
    const sel = document.getElementById('explorer-origin-select');
    if (!sel) return;
    sel.innerHTML = [...COUNTRIES].sort((a,b)=>a.name.localeCompare(b.name)).map(c =>
      `<option value="${c.id}" ${c.id==='italy'?'selected':''}>${c.flag} ${c.name}</option>`
    ).join('');
  }

  function showMainUI() {
    document.getElementById('explorer-origin-picker').style.display = 'none';
    const main = document.getElementById('explorer-main');
    main.style.display = 'flex';
    main.style.flexDirection = 'column';
    main.style.gap = '12px';
    updateTopbar();
    loadMapImage().then(() => { drawMap(); });
    renderDestinations();
    if (state.activeFlight) {
      const needed = state.activeFlight.kmNeeded;
      updateFlightOverlay(getTotalKm(), needed, getTotalKm() / needed);
      startLiveTracking();
    }
  }
function applyZoom(factor) {
  const cx = MAP_W / 2, cy = MAP_H / 2;
  const newScale = Math.min(8, Math.max(1, state.viewTransform.scale * factor));
  state.viewTransform.offsetX = cx - newScale * (cx - state.viewTransform.offsetX) / state.viewTransform.scale;
  state.viewTransform.offsetY = cy - newScale * (cy - state.viewTransform.offsetY) / state.viewTransform.scale;
  state.viewTransform.scale = newScale;
  const c = document.getElementById('explorer-map');
  if (c) {
    state.viewTransform.offsetX = Math.min(0, Math.max(c.width*(1-newScale),  state.viewTransform.offsetX));
    state.viewTransform.offsetY = Math.min(0, Math.max(c.height*(1-newScale), state.viewTransform.offsetY));
  }
  drawMap();
}

function bindEvents() {
  // Create tooltip
  const tooltip = document.createElement('div');
  tooltip.id = 'map-tooltip';
  tooltip.style.cssText = 'position:fixed;display:none;background:rgba(10,22,40,0.95);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:6px 10px;font-size:0.75rem;color:#fff;pointer-events:none;z-index:9999;white-space:nowrap;';
  document.body.appendChild(tooltip);

document.getElementById('btn-set-origin')?.addEventListener('click', () => {

  const sel = document.getElementById('explorer-origin-select');
  if (!sel) return;
  state.origin = sel.value;
  state.originChangesUsed = 1;
  saveState();
  showMainUI();
  setTimeout(() => {
    if (window.app?.showToast) window.app.showToast(
      '📍 Origin Set!',
      'You can change your origin ONE more time free. After that, it resets ALL progress.',
      '⚠️'
    );
  }, 800);
});


document.getElementById('btn-change-origin')?.addEventListener('click', () => {
  if (state.activeFlight) {
    if (window.app?.showToast) window.app.showToast('✈️ Currently Flying!', 'Abort your current flight before changing origin.', '🔒');
    return;
  }
  if (state.originChangesUsed === 1) {
    state.originChangesUsed = 2;
    saveState();
    stopLiveTracking();
    document.getElementById('explorer-origin-picker').style.display = 'flex';
    document.getElementById('explorer-main').style.display = 'none';
    setTimeout(() => {
      if (window.app?.showToast) window.app.showToast('⚠️ Last Free Change!', 'Next origin change will delete ALL unlocked countries.', '⚠️');
    }, 400);
  } else if (state.originChangesUsed >= 2) {
    const confirmed = confirm('⚠️ WARNING: This will permanently DELETE all your unlocked countries and reset flight progress.\n\nAre you sure?');
    if (!confirmed) return;
    state.unlockedCountries = [];
    state.activeFlight = null;
    saveState();
    stopLiveTracking();
    document.getElementById('explorer-flight-overlay').style.display = 'none';
    document.getElementById('explorer-origin-picker').style.display = 'flex';
    document.getElementById('explorer-main').style.display = 'none';
  } else {
    stopLiveTracking();
    document.getElementById('explorer-origin-picker').style.display = 'flex';
    document.getElementById('explorer-main').style.display = 'none';
  }
});


    document.querySelectorAll('.explorer-dest-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.explorer-dest-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.currentFilter = btn.dataset.filter;
        renderDestinations();
      });
    });

    const canvas = document.getElementById('explorer-map');
    if (canvas) {
      canvas.addEventListener('click', e => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = MAP_W / rect.width, scaleY = MAP_H / rect.height;
        const rawX = (e.clientX - rect.left) * scaleX;
const rawY = (e.clientY - rect.top) * scaleY;
const mx = (rawX - state.viewTransform.offsetX) / state.viewTransform.scale;
const my = (rawY - state.viewTransform.offsetY) / state.viewTransform.scale;

        let closest = null, minD = 20;
        COUNTRIES.forEach(c => { if (c.id === state.origin) return; const p = project(c.lat,c.lng); const d = Math.sqrt((p.x-mx)**2+(p.y-my)**2); if (d < minD) { minD = d; closest = c; } });
        if (closest) selectDestination(closest.id);
        });
        // Zoom
canvas.addEventListener('wheel', e => {
  if (!e.ctrlKey) return; // only zoom with Ctrl held
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (MAP_W / rect.width);
  const my = (e.clientY - rect.top)  * (MAP_H / rect.height);
  const delta = e.deltaY < 0 ? 1.15 : 0.87;
  const newScale = Math.min(8, Math.max(1, state.viewTransform.scale * delta));
  state.viewTransform.offsetX = mx - newScale * (mx - state.viewTransform.offsetX) / state.viewTransform.scale;
  state.viewTransform.offsetY = my - newScale * (my - state.viewTransform.offsetY) / state.viewTransform.scale;
  state.viewTransform.scale = newScale;
  state.viewTransform.offsetX = Math.min(0, Math.max(canvas.width*(1-newScale), state.viewTransform.offsetX));
  state.viewTransform.offsetY = Math.min(0, Math.max(canvas.height*(1-newScale), state.viewTransform.offsetY));
  drawMap();
}, { passive: false });
    

// Pan
canvas.addEventListener('mousedown', e => {
  if (e.button !== 0) return;
  state._isDragging = true;
  state._dragStart = { x: e.clientX - state.viewTransform.offsetX, y: e.clientY - state.viewTransform.offsetY };
  canvas.style.cursor = 'grabbing';
});

canvas.addEventListener('mouseup',    () => { state._isDragging = false; canvas.style.cursor = 'grab'; });
canvas.addEventListener('mouseleave', () => { state._isDragging = false; canvas.style.cursor = 'grab'; });
canvas.style.cursor = 'grab';
canvas.addEventListener('mousemove', e => {
  if (state._isDragging) {
    tooltip.style.display = 'none';
    state.viewTransform.offsetX = e.clientX - state._dragStart.x;
    state.viewTransform.offsetY = e.clientY - state._dragStart.y;
    const s = state.viewTransform.scale;
    state.viewTransform.offsetX = Math.min(0, Math.max(canvas.width*(1-s),  state.viewTransform.offsetX));
    state.viewTransform.offsetY = Math.min(0, Math.max(canvas.height*(1-s), state.viewTransform.offsetY));
    drawMap();
    return;
  }
  const rect = canvas.getBoundingClientRect();
  const rawX = (e.clientX - rect.left) * (MAP_W / rect.width);
  const rawY = (e.clientY - rect.top)  * (MAP_H / rect.height);
  const mx = (rawX - state.viewTransform.offsetX) / state.viewTransform.scale;
  const my = (rawY - state.viewTransform.offsetY) / state.viewTransform.scale;
  let hovered = null, minD = 18;
  COUNTRIES.forEach(c => {
    const p = project(c.lat, c.lng);
    const d = Math.sqrt((p.x - mx) ** 2 + (p.y - my) ** 2);
    if (d < minD) { minD = d; hovered = c; }
  });
  if (hovered) {
    const isOrigin   = hovered.id === state.origin;
    const isUnlocked = state.unlockedCountries.includes(hovered.id);
    const isActive   = state.activeFlight?.destId === hovered.id;
    const status = isOrigin ? '📍 Origin' : isUnlocked ? '✅ Visited' : isActive ? '✈️ Flying here' : '🔒 Locked';
    tooltip.innerHTML = '<strong>' + hovered.flag + ' ' + hovered.name + '</strong><span style="opacity:0.7;margin-left:6px;">' + status + '</span>';
    tooltip.style.display = 'block';
    tooltip.style.left = (e.clientX + 14) + 'px';
    tooltip.style.top  = (e.clientY - 10) + 'px';
  } else {
    tooltip.style.display = 'none';
  }

});

canvas.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });

    }  // ← ADD THIS LINE — closes if (canvas) {

    document.getElementById('btn-zoom-in')?.addEventListener('click',  () => applyZoom(1.4));

document.getElementById('btn-zoom-out')?.addEventListener('click', () => applyZoom(0.7));
document.getElementById('btn-reset-zoom')?.addEventListener('click', () => {
  state.viewTransform = { scale: 1, offsetX: 0, offsetY: 0 };
  drawMap();
});

document.getElementById('btn-abort-flight')?.addEventListener('click', () => {
  if (!state.activeFlight) return;
  const dest = COUNTRIES.find(c => c.id === state.activeFlight?.destId);
  const confirmed = confirm(`🛑 Abort flight to ${dest?.flag} ${dest?.name}?\n\nYour study km is kept, flight destination is cleared.`);
  if (!confirmed) return;
  state.activeFlight = null;
  saveState();
  stopLiveTracking();
  document.getElementById('explorer-flight-overlay').style.display = 'none';
  drawMap();
  renderDestinations();
  updateTopbar();
  if (window.app?.showToast) window.app.showToast('🛑 Flight Aborted', 'Pick a new destination or change origin.', '✈️');
});
 }

  function init() {
    loadState();
    populateOriginSelect();
    bindEvents();
    if (state.origin) showMainUI();
    else { document.getElementById('explorer-origin-picker').style.display = 'flex'; document.getElementById('explorer-main').style.display = 'none'; }
  }

  function onTabOpen() {
    if (state.origin) { updateTopbar(); loadMapImage().then(()=>drawMap()); renderDestinations(); if (state.activeFlight) startLiveTracking(); }
  }

  const style = document.createElement('style');
  style.textContent = `@keyframes conf-fall { to { transform:translateY(400px) rotate(720deg); opacity:0; } } .dest-active-flight { box-shadow:0 0 0 2px #ffca28; }`;
  document.head.appendChild(style);

  return { init, onTabOpen, state, COUNTRIES };
})();

window.ExplorerModule = ExplorerModule;
document.addEventListener('DOMContentLoaded', function() { ExplorerModule.init(); });


