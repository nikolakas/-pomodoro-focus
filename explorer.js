const ExplorerModule = (() => {

  const COUNTRIES = [
    // EUROPE
    { id:'italy',        name:'Italy',           flag:'🇮🇹', capital:'Rome',         pop:'60.4M', continent:'Europe',       lat:41.9,  lng:12.5,   km:0,    fact:'Italy has more UNESCO World Heritage Sites than any other country.' },
    { id:'greece',       name:'Greece',          flag:'🇬🇷', capital:'Athens',       pop:'10.7M', continent:'Europe',       lat:39.1,  lng:21.8,   km:1052, fact:'Greece has over 6,000 islands, only 227 are inhabited.' },
    { id:'france',       name:'France',          flag:'🇫🇷', capital:'Paris',        pop:'67.8M', continent:'Europe',       lat:46.2,  lng:2.2,    km:1107, fact:'France is the most visited country in the world with 90M tourists/year.' },
    { id:'spain',        name:'Spain',           flag:'🇪🇸', capital:'Madrid',       pop:'47.4M', continent:'Europe',       lat:40.5,  lng:-3.7,   km:1363, fact:'Spain invented the mop, the stapler, and the submarine.' },
    { id:'germany',      name:'Germany',         flag:'🇩🇪', capital:'Berlin',       pop:'83.2M', continent:'Europe',       lat:51.2,  lng:10.5,   km:1181, fact:'Germany has over 1,500 different types of beer.' },
    { id:'uk',           name:'United Kingdom',  flag:'🇬🇧', capital:'London',       pop:'67.2M', continent:'Europe',       lat:55.4,  lng:-3.4,   km:1892, fact:'The UK invented the World Wide Web, telephone, and television.' },
    { id:'portugal',     name:'Portugal',        flag:'🇵🇹', capital:'Lisbon',       pop:'10.3M', continent:'Europe',       lat:39.4,  lng:-8.2,   km:1932, fact:'Portugal is the world\'s largest producer of cork.' },
    { id:'netherlands',  name:'Netherlands',     flag:'🇳🇱', capital:'Amsterdam',    pop:'17.5M', continent:'Europe',       lat:52.1,  lng:5.3,    km:1284, fact:'The Netherlands has more bicycles than people.' },
    { id:'belgium',      name:'Belgium',         flag:'🇧🇪', capital:'Brussels',     pop:'11.6M', continent:'Europe',       lat:50.5,  lng:4.5,    km:1207, fact:'Belgium invented French fries — they\'re actually Belgian!' },
    { id:'switzerland',  name:'Switzerland',     flag:'🇨🇭', capital:'Bern',         pop:'8.7M',  continent:'Europe',       lat:46.8,  lng:8.2,    km:683,  fact:'Switzerland has not been at war since 1815.' },
    { id:'austria',      name:'Austria',         flag:'🇦🇹', capital:'Vienna',       pop:'9.1M',  continent:'Europe',       lat:47.5,  lng:14.5,   km:524,  fact:'Vienna is consistently rated the world\'s most liveable city.' },
    { id:'poland',       name:'Poland',          flag:'🇵🇱', capital:'Warsaw',       pop:'37.8M', continent:'Europe',       lat:51.9,  lng:19.1,   km:1318, fact:'Poland has the world\'s largest castle by land area — Malbork.' },
    { id:'czech',        name:'Czech Republic',  flag:'🇨🇿', capital:'Prague',       pop:'10.9M', continent:'Europe',       lat:49.8,  lng:15.5,   km:921,  fact:'Czech Republic has the highest beer consumption per capita in the world.' },
    { id:'hungary',      name:'Hungary',         flag:'🇭🇺', capital:'Budapest',     pop:'9.7M',  continent:'Europe',       lat:47.2,  lng:19.5,   km:788,  fact:'Hungary invented the Rubik\'s Cube, the ballpoint pen, and the krypton bulb.' },
    { id:'romania',      name:'Romania',         flag:'🇷🇴', capital:'Bucharest',    pop:'19.0M', continent:'Europe',       lat:45.9,  lng:24.9,   km:1122, fact:'Romania is home to Dracula\'s Castle in Transylvania.' },
    { id:'sweden',       name:'Sweden',          flag:'🇸🇪', capital:'Stockholm',    pop:'10.4M', continent:'Europe',       lat:60.1,  lng:18.6,   km:2005, fact:'Sweden has 221,800 islands — more than almost any other country.' },
    { id:'norway',       name:'Norway',          flag:'🇳🇴', capital:'Oslo',         pop:'5.4M',  continent:'Europe',       lat:60.5,  lng:8.5,    km:2046, fact:'Norway introduced salmon sushi to Japan in the 1980s.' },
    { id:'denmark',      name:'Denmark',         flag:'🇩🇰', capital:'Copenhagen',   pop:'5.9M',  continent:'Europe',       lat:56.3,  lng:9.5,    km:1652, fact:'Denmark is consistently rated the happiest country in the world.' },
    { id:'finland',      name:'Finland',         flag:'🇫🇮', capital:'Helsinki',     pop:'5.5M',  continent:'Europe',       lat:61.9,  lng:25.7,   km:2065, fact:'Finland has more saunas than cars — roughly 3.3 million.' },
    { id:'croatia',      name:'Croatia',         flag:'🇭🇷', capital:'Zagreb',       pop:'4.0M',  continent:'Europe',       lat:45.1,  lng:15.2,   km:491,  fact:'Croatia invented the necktie — the word cravat comes from Croatian.' },
    { id:'serbia',       name:'Serbia',          flag:'🇷🇸', capital:'Belgrade',     pop:'6.9M',  continent:'Europe',       lat:44.0,  lng:21.0,   km:854,  fact:'Tesla was born in Serbia. The unit of magnetic flux density is named after him.' },
    { id:'ukraine',      name:'Ukraine',         flag:'🇺🇦', capital:'Kyiv',         pop:'43.5M', continent:'Europe',       lat:48.4,  lng:31.2,   km:1769, fact:'Ukraine is the largest country entirely within Europe.' },
    { id:'turkey',       name:'Turkey',          flag:'🇹🇷', capital:'Ankara',       pop:'84.3M', continent:'Europe/Asia',  lat:38.9,  lng:35.2,   km:1866, fact:'Turkey is where Noah\'s Ark is said to have landed — on Mount Ararat.' },
    { id:'iceland',      name:'Iceland',         flag:'🇮🇸', capital:'Reykjavik',    pop:'0.37M', continent:'Europe',       lat:64.9,  lng:-18.0,  km:2956, fact:'Iceland has no mosquitoes and no army — one of few countries worldwide.' },
    { id:'ireland',      name:'Ireland',         flag:'🇮🇪', capital:'Dublin',       pop:'5.1M',  continent:'Europe',       lat:53.1,  lng:-8.2,   km:1992, fact:'Ireland is the only country with a musical instrument as its national symbol — the harp.' },
    { id:'slovakia',     name:'Slovakia',        flag:'🇸🇰', capital:'Bratislava',   pop:'5.5M',  continent:'Europe',       lat:48.7,  lng:19.7,   km:754,  fact:'Slovakia has the highest number of castles per capita in the world.' },
    { id:'bulgaria',     name:'Bulgaria',        flag:'🇧🇬', capital:'Sofia',        pop:'6.5M',  continent:'Europe',       lat:42.7,  lng:25.5,   km:1075, fact:'Bulgaria is one of the oldest countries in Europe, founded in 681 AD.' },
    { id:'albania',      name:'Albania',         flag:'🇦🇱', capital:'Tirana',       pop:'2.8M',  continent:'Europe',       lat:41.2,  lng:20.2,   km:692,  fact:'In Albania, nodding your head means NO and shaking it means YES.' },
    { id:'slovenia',     name:'Slovenia',        flag:'🇸🇮', capital:'Ljubljana',    pop:'2.1M',  continent:'Europe',       lat:46.1,  lng:14.8,   km:327,  fact:'Slovenia has the world\'s oldest wooden wheel, over 5,000 years old.' },
    { id:'bosnia',       name:'Bosnia',          flag:'🇧🇦', capital:'Sarajevo',     pop:'3.3M',  continent:'Europe',       lat:43.9,  lng:17.7,   km:683,  fact:'Sarajevo was the first city in Europe to have a tram system.' },

    // MIDDLE EAST & AFRICA
    { id:'egypt',        name:'Egypt',           flag:'🇪🇬', capital:'Cairo',        pop:'104M',  continent:'Africa',       lat:26.8,  lng:30.8,   km:2095, fact:'Ancient Egyptians used moldy bread as an antibiotic 3,500 years ago.' },
    { id:'morocco',      name:'Morocco',         flag:'🇲🇦', capital:'Rabat',        pop:'37.5M', continent:'Africa',       lat:31.8,  lng:-7.1,   km:2087, fact:'Morocco is home to the world\'s oldest university — University of al-Qarawiyyin, founded in 859 AD.' },
    { id:'tunisia',      name:'Tunisia',         flag:'🇹🇳', capital:'Tunis',        pop:'12.0M', continent:'Africa',       lat:33.9,  lng:9.6,    km:1165, fact:'Tunisia was the filming location for the original Star Wars desert scenes.' },
    { id:'algeria',      name:'Algeria',         flag:'🇩🇿', capital:'Algiers',      pop:'46.0M', continent:'Africa',       lat:28.0,  lng:1.7,    km:1488, fact:'Algeria is the largest country in Africa and the Arab world.' },
    { id:'southafrica',  name:'South Africa',    flag:'🇿🇦', capital:'Cape Town',    pop:'60.1M', continent:'Africa',       lat:-30.6, lng:22.9,   km:8800, fact:'South Africa has three capital cities — the only country in the world to do so.' },
    { id:'nigeria',      name:'Nigeria',         flag:'🇳🇬', capital:'Abuja',        pop:'223M',  continent:'Africa',       lat:9.1,   lng:8.7,    km:3966, fact:'Nigeria is Africa\'s most populous country and largest economy.' },
    { id:'kenya',        name:'Kenya',           flag:'🇰🇪', capital:'Nairobi',      pop:'55.0M', continent:'Africa',       lat:-0.0,  lng:37.9,   km:5585, fact:'Kenya is home to the Great Rift Valley and world\'s fastest marathon runners.' },
    { id:'ethiopia',     name:'Ethiopia',        flag:'🇪🇹', capital:'Addis Ababa',  pop:'126M',  continent:'Africa',       lat:9.1,   lng:40.5,   km:4335, fact:'Ethiopia is the only African country that was never colonized.' },
    { id:'ghana',        name:'Ghana',           flag:'🇬🇭', capital:'Accra',        pop:'33.5M', continent:'Africa',       lat:7.9,   lng:-1.0,   km:4876, fact:'Ghana was the first sub-Saharan African country to gain independence in 1957.' },
    { id:'tanzania',     name:'Tanzania',        flag:'🇹🇿', capital:'Dodoma',       pop:'65.5M', continent:'Africa',       lat:-6.4,  lng:34.9,   km:6027, fact:'Tanzania is home to Mount Kilimanjaro — Africa\'s highest peak.' },
    { id:'saudiarabia',  name:'Saudi Arabia',    flag:'🇸🇦', capital:'Riyadh',       pop:'35.9M', continent:'Asia',         lat:23.9,  lng:45.1,   km:3853, fact:'Saudi Arabia is the largest country in the world with no rivers.' },
    { id:'uae',          name:'UAE',             flag:'🇦🇪', capital:'Abu Dhabi',    pop:'9.9M',  continent:'Asia',         lat:23.4,  lng:53.8,   km:4438, fact:'Dubai has a ski resort inside a shopping mall in the middle of the desert.' },
    { id:'israel',       name:'Israel',          flag:'🇮🇱', capital:'Jerusalem',    pop:'9.4M',  continent:'Asia',         lat:31.0,  lng:34.9,   km:2328, fact:'Israel is the world leader in recycled water, reusing 90% of its wastewater.' },
    { id:'jordan',       name:'Jordan',          flag:'🇯🇴', capital:'Amman',        pop:'10.3M', continent:'Asia',         lat:30.6,  lng:36.2,   km:2595, fact:'Petra in Jordan was carved directly into rose-red cliffs over 2,000 years ago.' },
    { id:'libya',        name:'Libya',           flag:'🇱🇾', capital:'Tripoli',      pop:'7.0M',  continent:'Africa',       lat:26.3,  lng:17.2,   km:1682, fact:'Over 90% of Libya is covered by the Sahara Desert.' },

    // ASIA
    { id:'japan',        name:'Japan',           flag:'🇯🇵', capital:'Tokyo',        pop:'125M',  continent:'Asia',         lat:36.2,  lng:138.3,  km:9560, fact:'Japan has over 6,800 islands and vending machines outnumber people in Tokyo.' },
    { id:'china',        name:'China',           flag:'🇨🇳', capital:'Beijing',      pop:'1.4B',  continent:'Asia',         lat:35.9,  lng:104.2,  km:8164, fact:'China invented paper, printing, gunpowder, and the compass.' },
    { id:'india',        name:'India',           flag:'🇮🇳', capital:'New Delhi',    pop:'1.4B',  continent:'Asia',         lat:20.6,  lng:79.1,   km:6600, fact:'India invented the number zero — arguably the most important mathematical concept.' },
    { id:'thailand',     name:'Thailand',        flag:'🇹🇭', capital:'Bangkok',      pop:'71.6M', continent:'Asia',         lat:15.9,  lng:100.9,  km:7624, fact:'Thailand is the world\'s largest exporter of rice.' },
    { id:'southkorea',   name:'South Korea',     flag:'🇰🇷', capital:'Seoul',        pop:'51.7M', continent:'Asia',         lat:36.5,  lng:127.9,  km:9277, fact:'South Korea has the world\'s fastest internet speeds.' },
    { id:'vietnam',      name:'Vietnam',         flag:'🇻🇳', capital:'Hanoi',        pop:'98.2M', continent:'Asia',         lat:14.1,  lng:108.3,  km:8741, fact:'Vietnam is the world\'s second largest coffee exporter.' },
    { id:'indonesia',    name:'Indonesia',       flag:'🇮🇩', capital:'Jakarta',      pop:'275M',  continent:'Asia',         lat:-2.5,  lng:118.0,  km:10165,fact:'Indonesia has the most volcanoes of any country — over 130 active ones.' },
    { id:'philippines',  name:'Philippines',     flag:'🇵🇭', capital:'Manila',       pop:'115M',  continent:'Asia',         lat:12.9,  lng:121.8,  km:10122,fact:'The Philippines is made up of 7,641 islands.' },
    { id:'malaysia',     name:'Malaysia',        flag:'🇲🇾', capital:'Kuala Lumpur', pop:'33.6M', continent:'Asia',         lat:4.2,   lng:108.0,  km:9228, fact:'Malaysia is home to the world\'s largest cave chamber — Sarawak Chamber.' },
    { id:'singapore',    name:'Singapore',       flag:'🇸🇬', capital:'Singapore',    pop:'5.9M',  continent:'Asia',         lat:1.4,   lng:103.8,  km:9585, fact:'Singapore is the only city-state in Southeast Asia.' },
    { id:'nepal',        name:'Nepal',           flag:'🇳🇵', capital:'Kathmandu',    pop:'30.0M', continent:'Asia',         lat:28.4,  lng:84.1,   km:6564, fact:'Nepal is home to 8 of the world\'s 10 tallest mountains including Everest.' },
    { id:'pakistan',     name:'Pakistan',        flag:'🇵🇰', capital:'Islamabad',    pop:'231M',  continent:'Asia',         lat:30.4,  lng:69.3,   km:5327, fact:'Pakistan has more glaciers than anywhere outside the polar regions.' },
    { id:'bangladesh',   name:'Bangladesh',      flag:'🇧🇩', capital:'Dhaka',        pop:'170M',  continent:'Asia',         lat:23.7,  lng:90.4,   km:7040, fact:'Bangladesh is home to the Sundarbans — the largest mangrove forest in the world.' },
    { id:'srilanka',     name:'Sri Lanka',       flag:'🇱🇰', capital:'Colombo',      pop:'22.2M', continent:'Asia',         lat:7.9,   lng:80.8,   km:6796, fact:'Sri Lanka is the world\'s top tea exporter and the birthplace of cinnamon.' },
    { id:'cambodia',     name:'Cambodia',        flag:'🇰🇭', capital:'Phnom Penh',   pop:'17.2M', continent:'Asia',         lat:12.6,  lng:104.9,  km:8810, fact:'Angkor Wat in Cambodia is the largest religious monument in the world.' },
    { id:'taiwan',       name:'Taiwan',          flag:'🇹🇼', capital:'Taipei',       pop:'23.6M', continent:'Asia',         lat:23.7,  lng:121.0,  km:9470, fact:'Taiwan produces over 90% of the world\'s most advanced semiconductors.' },
    { id:'mongolia',     name:'Mongolia',        flag:'🇲🇳', capital:'Ulaanbaatar',  pop:'3.4M',  continent:'Asia',         lat:46.9,  lng:103.8,  km:7240, fact:'Mongolia is the most sparsely populated country in the world.' },
    { id:'kazakhstan',   name:'Kazakhstan',      flag:'🇰🇿', capital:'Astana',       pop:'19.4M', continent:'Asia',         lat:48.0,  lng:68.0,   km:5180, fact:'Kazakhstan is the world\'s largest landlocked country.' },
    { id:'uzbekistan',   name:'Uzbekistan',      flag:'🇺🇿', capital:'Tashkent',     pop:'35.3M', continent:'Asia',         lat:41.4,  lng:64.6,   km:4878, fact:'Uzbekistan was at the heart of the ancient Silk Road trade route.' },
    { id:'myanmar',      name:'Myanmar',         flag:'🇲🇲', capital:'Naypyidaw',    pop:'54.4M', continent:'Asia',         lat:17.1,  lng:96.9,   km:8177, fact:'Myanmar has over 2,000 ancient pagodas in the plains of Bagan.' },

    // AMERICAS
    { id:'usa',          name:'USA',             flag:'🇺🇸', capital:'Washington DC',pop:'335M',  continent:'Americas',     lat:38.0,  lng:-97.0,  km:9137, fact:'The USA has the world\'s largest economy and 50 states spanning 6 time zones.' },
    { id:'canada',       name:'Canada',          flag:'🇨🇦', capital:'Ottawa',       pop:'38.2M', continent:'Americas',     lat:56.1,  lng:-106.3, km:8250, fact:'Canada has the longest coastline in the world at over 202,000 km.' },
    { id:'brazil',       name:'Brazil',          flag:'🇧🇷', capital:'Brasília',     pop:'215M',  continent:'Americas',     lat:-14.2, lng:-51.9,  km:9260, fact:'Brazil contains 60% of the Amazon rainforest — the lungs of the Earth.' },
    { id:'argentina',    name:'Argentina',       flag:'🇦🇷', capital:'Buenos Aires', pop:'45.6M', continent:'Americas',     lat:-38.4, lng:-63.6,  km:11560,fact:'Argentina is home to Patagonia — one of the most remote places on Earth.' },
    { id:'mexico',       name:'Mexico',          flag:'🇲🇽', capital:'Mexico City',  pop:'130M',  continent:'Americas',     lat:23.6,  lng:-102.6, km:10045,fact:'Mexico City is built on the ruins of the ancient Aztec capital Tenochtitlan.' },
    { id:'colombia',     name:'Colombia',        flag:'🇨🇴', capital:'Bogotá',       pop:'51.9M', continent:'Americas',     lat:4.6,   lng:-74.3,  km:9573, fact:'Colombia is the only country in South America with coastlines on both oceans.' },
    { id:'chile',        name:'Chile',           flag:'🇨🇱', capital:'Santiago',     pop:'19.5M', continent:'Americas',     lat:-35.7, lng:-71.5,  km:11800,fact:'Chile is the longest country in the world, stretching 4,300 km north to south.' },
    { id:'peru',         name:'Peru',            flag:'🇵🇪', capital:'Lima',         pop:'33.4M', continent:'Americas',     lat:-9.2,  lng:-75.0,  km:10580,fact:'Peru is home to Machu Picchu — the lost city of the Incas.' },
    { id:'cuba',         name:'Cuba',            flag:'🇨🇺', capital:'Havana',       pop:'11.3M', continent:'Americas',     lat:21.5,  lng:-79.0,  km:8978, fact:'Cuba has one of the highest literacy rates in the world at 99.7%.' },
    { id:'venezuela',    name:'Venezuela',       flag:'🇻🇪', capital:'Caracas',      pop:'28.3M', continent:'Americas',     lat:6.4,   lng:-66.6,  km:8920, fact:'Venezuela is home to Angel Falls — the world\'s highest uninterrupted waterfall.' },
    { id:'ecuador',      name:'Ecuador',         flag:'🇪🇨', capital:'Quito',        pop:'18.0M', continent:'Americas',     lat:-1.8,  lng:-78.2,  km:10050,fact:'Ecuador is named after the equator which passes directly through it.' },
    { id:'bolivia',      name:'Bolivia',         flag:'🇧🇴', capital:'Sucre',        pop:'12.1M', continent:'Americas',     lat:-16.3, lng:-63.6,  km:10900,fact:'Bolivia has the world\'s highest navigable lake — Lake Titicaca at 3,800m.' },
    { id:'uruguay',      name:'Uruguay',         flag:'🇺🇾', capital:'Montevideo',   pop:'3.5M',  continent:'Americas',     lat:-32.5, lng:-55.8,  km:11280,fact:'Uruguay was the first country in the world to fully legalize marijuana.' },
    { id:'costarica',    name:'Costa Rica',      flag:'🇨🇷', capital:'San José',     pop:'5.2M',  continent:'Americas',     lat:9.7,   lng:-83.8,  km:9850, fact:'Costa Rica generates over 99% of its electricity from renewable sources.' },
    { id:'panama',       name:'Panama',          flag:'🇵🇦', capital:'Panama City',  pop:'4.4M',  continent:'Americas',     lat:8.5,   lng:-80.8,  km:9710, fact:'The Panama Canal saves ships 12,875 km compared to sailing around South America.' },

    // OCEANIA
    { id:'australia',    name:'Australia',       flag:'🇦🇺', capital:'Canberra',     pop:'26.5M', continent:'Oceania',      lat:-25.3, lng:133.8,  km:14050,fact:'Australia is the only country that is also a continent.' },
    { id:'newzealand',   name:'New Zealand',     flag:'🇳🇿', capital:'Wellington',   pop:'5.1M',  continent:'Oceania',      lat:-40.9, lng:174.9,  km:18345,fact:'New Zealand was the first country to give women the right to vote in 1893.' },
    { id:'fiji',         name:'Fiji',            flag:'🇫🇯', capital:'Suva',         pop:'0.93M', continent:'Oceania',      lat:-17.7, lng:178.1,  km:16690,fact:'Fiji is made up of 332 islands, only 110 of which are inhabited.' },
    { id:'papuanewguinea',name:'Papua New Guinea',flag:'🇵🇬',capital:'Port Moresby', pop:'10.3M', continent:'Oceania',      lat:-6.3,  lng:143.9,  km:12940,fact:'Papua New Guinea has over 800 languages — the most linguistic diversity on Earth.' },
    { id:'newcaledonia', name:'New Caledonia',   flag:'🇳🇨', capital:'Nouméa',       pop:'0.27M', continent:'Oceania',      lat:-20.9, lng:165.6,  km:16280,fact:'New Caledonia has the world\'s largest lagoon protected by UNESCO.' },
  ];

  // ── State ──
  let state = {
    origin: null,
    unlockedCountries: [],
    totalKm: 0,
    selectedDest: null,
    currentFilter: 'reachable',
    isFlying: false,
  };

  // ── Map projection (equirectangular) ──
  const MAP_W = 900, MAP_H = 450;
  function project(lat, lng) {
    const x = (lng + 180) / 360 * MAP_W;
    const y = (90 - lat) / 180 * MAP_H;
    return { x, y };
  }

  // ── Distance between two countries (Haversine) ──
  function getDistance(c1, c2) {
    const R = 6371;
    const dLat = (c2.lat - c1.lat) * Math.PI / 180;
    const dLng = (c2.lng - c1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 +
              Math.cos(c1.lat * Math.PI/180) * Math.cos(c2.lat * Math.PI/180) *
              Math.sin(dLng/2)**2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
  }

  // ── Get available km from app state ──
  function getAvailableKm() {
    if (window.app && window.app.state) {
      return (window.app.state.totalMinutes || 0) * 15;
    }
    return parseInt(localStorage.getItem('explorer-total-km') || 0);
  }

  // ── Load/Save ──
  function loadState() {
    const saved = localStorage.getItem('pomodoro-explorer');
    if (saved) {
      const s = JSON.parse(saved);
      state.origin = s.origin || null;
      state.unlockedCountries = s.unlockedCountries || [];
      state.totalKm = s.totalKm || 0;
    }
  }

  function saveState() {
    localStorage.setItem('pomodoro-explorer', JSON.stringify({
      origin: state.origin,
      unlockedCountries: state.unlockedCountries,
      totalKm: state.totalKm,
    }));
  }

  // ── Init ──
  function init() {
    loadState();
    populateOriginSelect();
    bindEvents();
    if (state.origin) {
      showMainUI();
    } else {
      document.getElementById('explorer-origin-picker').style.display = 'flex';
      document.getElementById('explorer-main').style.display = 'none';
    }
  }

  function populateOriginSelect() {
    const sel = document.getElementById('explorer-origin-select');
    if (!sel) return;
    sel.innerHTML = '';
    const sorted = [...COUNTRIES].sort((a,b) => a.name.localeCompare(b.name));
    sorted.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.flag} ${c.name}`;
      if (c.id === 'italy') opt.selected = true;
      sel.appendChild(opt);
    });
  }

  function showMainUI() {
    document.getElementById('explorer-origin-picker').style.display = 'none';
    document.getElementById('explorer-main').style.display = 'flex';
    document.getElementById('explorer-main').style.flexDirection = 'column';
    document.getElementById('explorer-main').style.gap = '12px';
    updateTopbar();
    drawMap();
    renderDestinations();
  }

  function updateTopbar() {
    const origin = COUNTRIES.find(c => c.id === state.origin);
    if (!origin) return;
    const km = getAvailableKm();
    document.getElementById('explorer-origin-flag').textContent = origin.flag;
    document.getElementById('explorer-origin-name').textContent = origin.name;
    document.getElementById('explorer-total-km').textContent = km.toLocaleString() + ' km';
    document.getElementById('explorer-countries-count').textContent = state.unlockedCountries.length;
    const continents = new Set(state.unlockedCountries.map(id => {
      const c = COUNTRIES.find(x => x.id === id);
      return c ? c.continent : null;
    }).filter(Boolean));
    document.getElementById('explorer-continents-count').textContent = continents.size;
    const subtitle = document.getElementById('explorer-dest-subtitle');
    if (subtitle) subtitle.textContent = `Flying from ${origin.flag} ${origin.name} — ${km.toLocaleString()} km available`;
  }

  // ── Draw Map ──
  function drawMap() {
    const canvas = document.getElementById('explorer-map');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, MAP_W, MAP_H);

    // Background ocean
    ctx.fillStyle = '#0a1628';
    ctx.fillRect(0, 0, MAP_W, MAP_H);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 0.5;
    for (let lat = -90; lat <= 90; lat += 30) {
      const y = (90 - lat) / 180 * MAP_H;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(MAP_W, y); ctx.stroke();
    }
    for (let lng = -180; lng <= 180; lng += 30) {
      const x = (lng + 180) / 360 * MAP_W;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, MAP_H); ctx.stroke();
    }

    const origin = COUNTRIES.find(c => c.id === state.origin);
    const availableKm = getAvailableKm();

    // Draw each country as a dot
    COUNTRIES.forEach(c => {
      const p = project(c.lat, c.lng);
      const isOrigin = c.id === state.origin;
      const isUnlocked = state.unlockedCountries.includes(c.id);
      const dist = origin ? getDistance(origin, c) : 9999;
      const isReachable = origin && dist <= availableKm && !isUnlocked && !isOrigin;

      let radius = 6;
      let color = 'rgba(255,255,255,0.15)';

      if (isOrigin) { radius = 10; color = '#ff6b6b'; }
      else if (isUnlocked) { radius = 8; color = '#64ff96'; }
      else if (isReachable) { radius = 7; color = 'rgba(78,205,196,0.7)'; }

      // Glow for special dots
      if (isOrigin || isUnlocked || isReachable) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius + 4, 0, Math.PI * 2);
        ctx.fillStyle = isOrigin ? 'rgba(255,107,107,0.15)' : isUnlocked ? 'rgba(100,255,150,0.15)' : 'rgba(78,205,196,0.1)';
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // Label for origin and unlocked
      if (isOrigin || isUnlocked) {
        ctx.fillStyle = isOrigin ? '#ff6b6b' : '#64ff96';
        ctx.font = `${isOrigin ? 'bold ' : ''}9px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(c.flag, p.x, p.y - radius - 3);
      }
    });

    // Draw path from origin to selected destination
    if (state.selectedDest && origin) {
      const dest = COUNTRIES.find(c => c.id === state.selectedDest);
      if (dest) drawFlightPath(ctx, origin, dest, 1.0, '#4ecdc4');
    }
  }

  function drawFlightPath(ctx, from, to, progress, color) {
    const p1 = project(from.lat, from.lng);
    const p2 = project(to.lat, to.lng);
    const cp = {
      x: (p1.x + p2.x) / 2,
      y: Math.min(p1.y, p2.y) - Math.abs(p2.x - p1.x) * 0.25
    };
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.globalAlpha = 0.6;

    // Draw partial path based on progress
    const steps = 60;
    const endStep = Math.floor(steps * progress);
    for (let i = 0; i <= endStep; i++) {
      const t = i / steps;
      const x = (1-t)*(1-t)*p1.x + 2*(1-t)*t*cp.x + t*t*p2.x;
      const y = (1-t)*(1-t)*p1.y + 2*(1-t)*t*cp.y + t*t*p2.y;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1.0;
  }

  // ── Render Destinations ──
  function renderDestinations() {
    const grid = document.getElementById('explorer-dest-grid');
    if (!grid) return;
    const origin = COUNTRIES.find(c => c.id === state.origin);
    const availableKm = getAvailableKm();

    let list = COUNTRIES.filter(c => c.id !== state.origin);

    if (state.currentFilter === 'reachable') {
      list = list.filter(c => {
        const dist = origin ? getDistance(origin, c) : 9999;
        return dist <= availableKm && !state.unlockedCountries.includes(c.id);
      });
      list.sort((a,b) => getDistance(origin,a) - getDistance(origin,b));
    } else if (state.currentFilter === 'unlocked') {
      list = list.filter(c => state.unlockedCountries.includes(c.id));
    } else {
      list.sort((a,b) => {
        const da = origin ? getDistance(origin,a) : 0;
        const db = origin ? getDistance(origin,b) : 0;
        return da - db;
      });
    }

    grid.innerHTML = '';

    if (list.length === 0) {
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:2rem;font-size:0.88rem;">
        ${state.currentFilter === 'reachable' ? '✈️ Study more to unlock new destinations!' : 
          state.currentFilter === 'unlocked' ? '🌍 No countries unlocked yet. Start exploring!' : 
          'No countries found.'}
      </div>`;
      return;
    }

    list.forEach(c => {
      const dist = origin ? getDistance(origin, c) : c.km;
      const isUnlocked = state.unlockedCountries.includes(c.id);
      const isReachable = dist <= availableKm;
      const isSelected = c.id === state.selectedDest;

      const card = document.createElement('div');
      card.className = `dest-card ${isUnlocked ? 'dest-unlocked' : !isReachable ? 'dest-locked' : ''} ${isSelected ? 'dest-selected' : ''}`;
      if (isSelected) card.style.borderColor = 'var(--accent)';

      card.innerHTML = `
        ${isUnlocked ? '<div class="dest-badge">✓ Done</div>' : ''}
        <div class="dest-flag">${c.flag}</div>
        <div class="dest-name">${c.name}</div>
        <div class="dest-km">${dist.toLocaleString()} km</div>
        ${!isReachable && !isUnlocked ? `<div style="font-size:0.65rem;color:var(--accent);">Need ${(dist - availableKm).toLocaleString()}km more</div>` : ''}
      `;

      if ((isReachable || isUnlocked) && !card.classList.contains('dest-locked')) {
        card.addEventListener('click', () => selectDestination(c.id));
      }
      grid.appendChild(card);
    });
  }

  function selectDestination(id) {
    if (state.isFlying) return;
    state.selectedDest = id;
    drawMap();
    renderDestinations();

    // Show fly button prompt
    const dest = COUNTRIES.find(c => c.id === id);
    const origin = COUNTRIES.find(c => c.id === state.origin);
    if (!dest || !origin) return;

    const isUnlocked = state.unlockedCountries.includes(id);
    if (isUnlocked) {
      // Just show info
      showArrivalModal(dest, getDistance(origin, dest), false);
      return;
    }

    // Confirm fly
    const dist = getDistance(origin, dest);
    const subtitle = document.getElementById('explorer-dest-subtitle');
    if (subtitle) {
      subtitle.innerHTML = `
        <span>${origin.flag} → ${dest.flag} ${dest.name} — ${dist.toLocaleString()} km</span>
        <button class="btn btn-primary" id="btn-confirm-fly" style="margin-left:10px;height:30px;padding:0 14px;font-size:0.82rem;border-radius:8px;">
          ✈️ Fly Now!
        </button>
      `;
      document.getElementById('btn-confirm-fly')?.addEventListener('click', () => startFlight(dest));
    }
  }

  // ── Flight Animation ──
  function startFlight(dest) {
    if (state.isFlying) return;
    const origin = COUNTRIES.find(c => c.id === state.origin);
    if (!origin) return;

    const dist = getDistance(origin, dest);
    state.isFlying = true;

    // Show flight overlay
    const overlay = document.getElementById('explorer-flight-overlay');
    if (overlay) overlay.style.display = 'block';
    document.getElementById('flight-flag').textContent = dest.flag;
    document.getElementById('flight-route').textContent = `${origin.flag} ${origin.name} → ${dest.flag} ${dest.name}`;
    document.getElementById('flight-distance').textContent = `${dist.toLocaleString()} km`;

    const fill = document.getElementById('flight-progress-fill');
    const plane = document.getElementById('flight-plane-icon');
    const canvas = document.getElementById('explorer-map');
    const ctx = canvas?.getContext('2d');

    let progress = 0;
    const duration = 3000; // 3 second animation
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      progress = Math.min(elapsed / duration, 1);

      if (fill) fill.style.width = `${progress * 100}%`;
      if (plane) plane.style.left = `${progress * 96}%`;

      // Redraw map with animated path
      if (ctx) {
        const canvas2 = document.getElementById('explorer-map');
        ctx.clearRect(0, 0, MAP_W, MAP_H);
        ctx.fillStyle = '#0a1628';
        ctx.fillRect(0, 0, MAP_W, MAP_H);

        // Redraw grid
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 0.5;
        for (let lat = -90; lat <= 90; lat += 30) {
          const y = (90 - lat) / 180 * MAP_H;
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(MAP_W, y); ctx.stroke();
        }
        drawFlightPath(ctx, origin, dest, progress, '#4ecdc4');

        // Draw plane position on map
        const p1 = project(origin.lat, origin.lng);
        const p2 = project(dest.lat, dest.lng);
        const cp = { x:(p1.x+p2.x)/2, y:Math.min(p1.y,p2.y)-Math.abs(p2.x-p1.x)*0.25 };
        const t = progress;
        const px = (1-t)*(1-t)*p1.x + 2*(1-t)*t*cp.x + t*t*p2.x;
        const py = (1-t)*(1-t)*p1.y + 2*(1-t)*t*cp.y + t*t*p2.y;
        ctx.font = '16px serif';
        ctx.textAlign = 'center';
        ctx.fillText('✈️', px, py);

        // Redraw dots
        COUNTRIES.forEach(c => {
          const pp = project(c.lat, c.lng);
          const isOriginC = c.id === state.origin;
          const isUnlocked = state.unlockedCountries.includes(c.id);
          let r = 5, col = 'rgba(255,255,255,0.12)';
          if (isOriginC) { r = 9; col = '#ff6b6b'; }
          else if (isUnlocked) { r = 7; col = '#64ff96'; }
          else if (c.id === dest.id) { r = 8; col = '#4ecdc4'; }
          ctx.beginPath(); ctx.arc(pp.x, pp.y, r, 0, Math.PI*2);
          ctx.fillStyle = col; ctx.fill();
        });
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Flight complete
        setTimeout(() => {
          state.isFlying = false;
          if (overlay) overlay.style.display = 'none';
          unlockCountry(dest);
        }, 400);
      }
    };

    requestAnimationFrame(animate);
  }

  function unlockCountry(dest) {
    if (!state.unlockedCountries.includes(dest.id)) {
      state.unlockedCountries.push(dest.id);
    }
    state.selectedDest = null;
    saveState();
    drawMap();
    renderDestinations();
    updateTopbar();
    showArrivalModal(dest, getDistance(COUNTRIES.find(c=>c.id===state.origin), dest), true);

    // Award XP to main app
    if (window.app && window.app.addXp) {
      window.app.addXp(Math.floor(getDistance(COUNTRIES.find(c=>c.id===state.origin), dest) / 100));
    }
  }

  // ── Arrival Modal ──
  function showArrivalModal(dest, dist, isNew) {
    const modal = document.getElementById('explorer-arrival-modal');
    if (!modal) return;
    document.getElementById('arrival-flag').textContent = dest.flag;
    document.getElementById('arrival-title').textContent = isNew ? `Welcome to ${dest.name}!` : `${dest.name}`;
    document.getElementById('arrival-distance').textContent = dist.toLocaleString();
    document.getElementById('arrival-capital').textContent = dest.capital;
    document.getElementById('arrival-population').textContent = dest.pop;
    document.getElementById('arrival-fact-text').textContent = dest.fact;
    const xp = Math.floor(dist / 100);
    document.getElementById('arrival-xp').textContent = isNew ? `+${xp}` : '✓';
    const origin = COUNTRIES.find(c => c.id === state.origin);
    const mins = origin ? Math.ceil(dist / 15) : 0;
    document.getElementById('arrival-time').textContent = mins;

    // Confetti
    if (isNew) {
      const conf = document.getElementById('arrival-confetti');
      if (conf) {
        conf.innerHTML = '';
        for (let i = 0; i < 20; i++) {
          const p = document.createElement('div');
          p.style.cssText = `position:absolute;width:8px;height:8px;border-radius:2px;
            background:${['#ff6b6b','#4ecdc4','#ffca28','#a78bfa'][i%4]};
            left:${Math.random()*100}%;top:-10px;
            animation:conf-fall ${1+Math.random()}s ease forwards ${Math.random()*0.5}s;`;
          conf.appendChild(p);
        }
      }
    }

    modal.style.display = 'flex';

    document.getElementById('btn-arrival-set-origin').onclick = () => {
      state.origin = dest.id;
      if (!state.unlockedCountries.includes(dest.id)) state.unlockedCountries.push(dest.id);
      saveState();
      modal.style.display = 'none';
      showMainUI();
    };
    document.getElementById('btn-arrival-close').onclick = () => {
      modal.style.display = 'none';
    };
  }

  // ── Bind Events ──
  function bindEvents() {
    document.getElementById('btn-set-origin')?.addEventListener('click', () => {
      const sel = document.getElementById('explorer-origin-select');
      if (sel) {
        state.origin = sel.value;
        if (!state.unlockedCountries.includes(state.origin)) {
          state.unlockedCountries.push(state.origin);
        }
        saveState();
        showMainUI();
      }
    });

    document.getElementById('btn-change-origin')?.addEventListener('click', () => {
      document.getElementById('explorer-origin-picker').style.display = 'flex';
      document.getElementById('explorer-main').style.display = 'none';
    });

    document.querySelectorAll('.explorer-dest-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.explorer-dest-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.currentFilter = btn.dataset.filter;
        renderDestinations();
      });
    });

    // Canvas click
    const canvas = document.getElementById('explorer-map');
    if (canvas) {
      canvas.addEventListener('click', e => {
        if (state.isFlying) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = MAP_W / rect.width;
        const scaleY = MAP_H / rect.height;
        const mx = (e.clientX - rect.left) * scaleX;
        const my = (e.clientY - rect.top) * scaleY;

        let closest = null, minDist = 20;
        COUNTRIES.forEach(c => {
          const p = project(c.lat, c.lng);
          const d = Math.sqrt((p.x-mx)**2 + (p.y-my)**2);
          if (d < minDist && c.id !== state.origin) { minDist = d; closest = c; }
        });
        if (closest) selectDestination(closest.id);
      });
    }
  }

  // ── Public: called when tab is switched to Explorer ──
  function onTabOpen() {
    if (state.origin) {
      updateTopbar();
      drawMap();
      renderDestinations();
    }
  }

  // ── CSS for confetti animation ──
  const style = document.createElement('style');
  style.textContent = `
    @keyframes conf-fall {
      to { transform: translateY(400px) rotate(720deg); opacity: 0; }
    }
    .dest-selected { box-shadow: 0 0 0 2px var(--accent); }
  `;
  document.head.appendChild(style);

  return { init, onTabOpen, state, COUNTRIES, getDistance, getAvailableKm };
})();

// Auto-init when DOM ready
document.addEventListener('DOMContentLoaded', () => {
  ExplorerModule.init();
});
