// ─────────────────────────────────────────────────────────────────────────────
// Universal Geo Database
// Contains countries + major cities with platform-specific IDs pre-mapped.
// Sources: Meta Geolocation API, Google Ads Geo Targets, TikTok Regions,
//          LinkedIn Geo URNs, Twitter WOEIDs, ISO 3166-1 alpha-2 codes.
// ─────────────────────────────────────────────────────────────────────────────

const locations = [

  // ── AFRICA ──────────────────────────────────────────────────────────────────
  { name:'Cameroon', type:'country', region:'Africa',
    meta:{ key:'CM', type:'country' }, google:{ criterionId:2120 },
    tiktok:'CM', linkedin:'urn:li:geo:105646813', twitter:{ woeid:23424785 }, snapchat:'CM', iso:'CM' },

  { name:'Douala', country:'Cameroon', type:'city', region:'Africa',
    meta:{ key:'1967538', type:'city' }, google:{ criterionId:1007265 },
    tiktok:'CM', linkedin:'urn:li:geo:105646813', twitter:{ woeid:1528335 }, snapchat:'CM', iso:'CM' },

  { name:'Yaoundé', country:'Cameroon', type:'city', region:'Africa',
    meta:{ key:'1967539', type:'city' }, google:{ criterionId:1007266 },
    tiktok:'CM', linkedin:'urn:li:geo:105646813', twitter:{ woeid:1528336 }, snapchat:'CM', iso:'CM' },

  { name:'Nigeria', type:'country', region:'Africa',
    meta:{ key:'NG', type:'country' }, google:{ criterionId:2566 },
    tiktok:'NG', linkedin:'urn:li:geo:101356976', twitter:{ woeid:23424908 }, snapchat:'NG', iso:'NG' },

  { name:'Lagos', country:'Nigeria', type:'city', region:'Africa',
    meta:{ key:'2347283', type:'city' }, google:{ criterionId:1010033 },
    tiktok:'NG', linkedin:'urn:li:geo:106048006', twitter:{ woeid:1398823 }, snapchat:'NG', iso:'NG' },

  { name:'Abuja', country:'Nigeria', type:'city', region:'Africa',
    meta:{ key:'2347248', type:'city' }, google:{ criterionId:1010030 },
    tiktok:'NG', linkedin:'urn:li:geo:101356976', twitter:{ woeid:1398822 }, snapchat:'NG', iso:'NG' },

  { name:'Ghana', type:'country', region:'Africa',
    meta:{ key:'GH', type:'country' }, google:{ criterionId:2288 },
    tiktok:'GH', linkedin:'urn:li:geo:100024907', twitter:{ woeid:23424824 }, snapchat:'GH', iso:'GH' },

  { name:'Accra', country:'Ghana', type:'city', region:'Africa',
    meta:{ key:'2227603', type:'city' }, google:{ criterionId:1007545 },
    tiktok:'GH', linkedin:'urn:li:geo:100024907', twitter:{ woeid:1326006 }, snapchat:'GH', iso:'GH' },

  { name:'Senegal', type:'country', region:'Africa',
    meta:{ key:'SN', type:'country' }, google:{ criterionId:2686 },
    tiktok:'SN', linkedin:'urn:li:geo:104679773', twitter:{ woeid:23424943 }, snapchat:'SN', iso:'SN' },

  { name:'Dakar', country:'Senegal', type:'city', region:'Africa',
    meta:{ key:'2251804', type:'city' }, google:{ criterionId:1007606 },
    tiktok:'SN', linkedin:'urn:li:geo:104679773', twitter:{ woeid:1475464 }, snapchat:'SN', iso:'SN' },

  { name:'Côte d\'Ivoire', type:'country', region:'Africa',
    meta:{ key:'CI', type:'country' }, google:{ criterionId:2384 },
    tiktok:'CI', linkedin:'urn:li:geo:100553468', twitter:{ woeid:23424854 }, snapchat:'CI', iso:'CI' },

  { name:'Abidjan', country:'Côte d\'Ivoire', type:'city', region:'Africa',
    meta:{ key:'2230069', type:'city' }, google:{ criterionId:1007350 },
    tiktok:'CI', linkedin:'urn:li:geo:100553468', twitter:{ woeid:1091257 }, snapchat:'CI', iso:'CI' },

  { name:'Kenya', type:'country', region:'Africa',
    meta:{ key:'KE', type:'country' }, google:{ criterionId:2404 },
    tiktok:'KE', linkedin:'urn:li:geo:101905639', twitter:{ woeid:23424863 }, snapchat:'KE', iso:'KE' },

  { name:'Nairobi', country:'Kenya', type:'city', region:'Africa',
    meta:{ key:'2237071', type:'city' }, google:{ criterionId:1007590 },
    tiktok:'KE', linkedin:'urn:li:geo:101905639', twitter:{ woeid:1528488 }, snapchat:'KE', iso:'KE' },

  { name:'South Africa', type:'country', region:'Africa',
    meta:{ key:'ZA', type:'country' }, google:{ criterionId:2710 },
    tiktok:'ZA', linkedin:'urn:li:geo:104035573', twitter:{ woeid:23424942 }, snapchat:'ZA', iso:'ZA' },

  { name:'Johannesburg', country:'South Africa', type:'city', region:'Africa',
    meta:{ key:'2325073', type:'city' }, google:{ criterionId:1007673 },
    tiktok:'ZA', linkedin:'urn:li:geo:104035573', twitter:{ woeid:1582504 }, snapchat:'ZA', iso:'ZA' },

  { name:'Cape Town', country:'South Africa', type:'city', region:'Africa',
    meta:{ key:'2325071', type:'city' }, google:{ criterionId:1007671 },
    tiktok:'ZA', linkedin:'urn:li:geo:104035573', twitter:{ woeid:1591691 }, snapchat:'ZA', iso:'ZA' },

  { name:'Egypt', type:'country', region:'Africa',
    meta:{ key:'EG', type:'country' }, google:{ criterionId:2818 },
    tiktok:'EG', linkedin:'urn:li:geo:106155005', twitter:{ woeid:23424802 }, snapchat:'EG', iso:'EG' },

  { name:'Cairo', country:'Egypt', type:'city', region:'Africa',
    meta:{ key:'2227612', type:'city' }, google:{ criterionId:1007534 },
    tiktok:'EG', linkedin:'urn:li:geo:106155005', twitter:{ woeid:1521894 }, snapchat:'EG', iso:'EG' },

  { name:'Morocco', type:'country', region:'Africa',
    meta:{ key:'MA', type:'country' }, google:{ criterionId:2504 },
    tiktok:'MA', linkedin:'urn:li:geo:102787409', twitter:{ woeid:23424893 }, snapchat:'MA', iso:'MA' },

  { name:'Casablanca', country:'Morocco', type:'city', region:'Africa',
    meta:{ key:'2242773', type:'city' }, google:{ criterionId:1007577 },
    tiktok:'MA', linkedin:'urn:li:geo:102787409', twitter:{ woeid:1527772 }, snapchat:'MA', iso:'MA' },

  { name:'Ethiopia', type:'country', region:'Africa',
    meta:{ key:'ET', type:'country' }, google:{ criterionId:2231 },
    tiktok:'ET', linkedin:'urn:li:geo:100025718', twitter:{ woeid:23424808 }, snapchat:'ET', iso:'ET' },

  { name:'Tanzania', type:'country', region:'Africa',
    meta:{ key:'TZ', type:'country' }, google:{ criterionId:2834 },
    tiktok:'TZ', linkedin:'urn:li:geo:102586604', twitter:{ woeid:23424973 }, snapchat:'TZ', iso:'TZ' },

  { name:'Uganda', type:'country', region:'Africa',
    meta:{ key:'UG', type:'country' }, google:{ criterionId:2800 },
    tiktok:'UG', linkedin:'urn:li:geo:101439379', twitter:{ woeid:23424974 }, snapchat:'UG', iso:'UG' },

  { name:'Rwanda', type:'country', region:'Africa',
    meta:{ key:'RW', type:'country' }, google:{ criterionId:2646 },
    tiktok:'RW', linkedin:'urn:li:geo:100931898', twitter:{ woeid:23424937 }, snapchat:'RW', iso:'RW' },

  // ── EUROPE ──────────────────────────────────────────────────────────────────
  { name:'France', type:'country', region:'Europe',
    meta:{ key:'FR', type:'country' }, google:{ criterionId:2250 },
    tiktok:'FR', linkedin:'urn:li:geo:105015875', twitter:{ woeid:23424819 }, snapchat:'FR', iso:'FR' },

  { name:'Paris', country:'France', type:'city', region:'Europe',
    meta:{ key:'2987219', type:'city' }, google:{ criterionId:1006094 },
    tiktok:'FR', linkedin:'urn:li:geo:105015875', twitter:{ woeid:615702 }, snapchat:'FR', iso:'FR' },

  { name:'United Kingdom', type:'country', region:'Europe',
    meta:{ key:'GB', type:'country' }, google:{ criterionId:2826 },
    tiktok:'GB', linkedin:'urn:li:geo:101165590', twitter:{ woeid:23424975 }, snapchat:'GB', iso:'GB' },

  { name:'London', country:'United Kingdom', type:'city', region:'Europe',
    meta:{ key:'2643743', type:'city' }, google:{ criterionId:1006886 },
    tiktok:'GB', linkedin:'urn:li:geo:90009496', twitter:{ woeid:44418 }, snapchat:'GB', iso:'GB' },

  { name:'Germany', type:'country', region:'Europe',
    meta:{ key:'DE', type:'country' }, google:{ criterionId:2276 },
    tiktok:'DE', linkedin:'urn:li:geo:101282230', twitter:{ woeid:23424829 }, snapchat:'DE', iso:'DE' },

  { name:'Berlin', country:'Germany', type:'city', region:'Europe',
    meta:{ key:'2950159', type:'city' }, google:{ criterionId:1003854 },
    tiktok:'DE', linkedin:'urn:li:geo:101282230', twitter:{ woeid:638242 }, snapchat:'DE', iso:'DE' },

  { name:'Spain', type:'country', region:'Europe',
    meta:{ key:'ES', type:'country' }, google:{ criterionId:2724 },
    tiktok:'ES', linkedin:'urn:li:geo:105646813', twitter:{ woeid:23424950 }, snapchat:'ES', iso:'ES' },

  { name:'Madrid', country:'Spain', type:'city', region:'Europe',
    meta:{ key:'3117735', type:'city' }, google:{ criterionId:1005449 },
    tiktok:'ES', linkedin:'urn:li:geo:100994331', twitter:{ woeid:766273 }, snapchat:'ES', iso:'ES' },

  { name:'Italy', type:'country', region:'Europe',
    meta:{ key:'IT', type:'country' }, google:{ criterionId:2380 },
    tiktok:'IT', linkedin:'urn:li:geo:103350119', twitter:{ woeid:23424853 }, snapchat:'IT', iso:'IT' },

  { name:'Netherlands', type:'country', region:'Europe',
    meta:{ key:'NL', type:'country' }, google:{ criterionId:2528 },
    tiktok:'NL', linkedin:'urn:li:geo:102890719', twitter:{ woeid:23424909 }, snapchat:'NL', iso:'NL' },

  { name:'Belgium', type:'country', region:'Europe',
    meta:{ key:'BE', type:'country' }, google:{ criterionId:2056 },
    tiktok:'BE', linkedin:'urn:li:geo:100565514', twitter:{ woeid:23424757 }, snapchat:'BE', iso:'BE' },

  { name:'Switzerland', type:'country', region:'Europe',
    meta:{ key:'CH', type:'country' }, google:{ criterionId:2756 },
    tiktok:'CH', linkedin:'urn:li:geo:106693272', twitter:{ woeid:23424957 }, snapchat:'CH', iso:'CH' },

  { name:'Portugal', type:'country', region:'Europe',
    meta:{ key:'PT', type:'country' }, google:{ criterionId:2620 },
    tiktok:'PT', linkedin:'urn:li:geo:100364837', twitter:{ woeid:23424925 }, snapchat:'PT', iso:'PT' },

  // ── NORTH AMERICA ────────────────────────────────────────────────────────────
  { name:'United States', type:'country', region:'North America',
    meta:{ key:'US', type:'country' }, google:{ criterionId:2840 },
    tiktok:'US', linkedin:'urn:li:geo:103644278', twitter:{ woeid:23424977 }, snapchat:'US', iso:'US' },

  { name:'New York', country:'United States', type:'city', region:'North America',
    meta:{ key:'2459115', type:'city' }, google:{ criterionId:1023191 },
    tiktok:'US', linkedin:'urn:li:geo:105080838', twitter:{ woeid:2459115 }, snapchat:'US', iso:'US' },

  { name:'Los Angeles', country:'United States', type:'city', region:'North America',
    meta:{ key:'2442047', type:'city' }, google:{ criterionId:1014221 },
    tiktok:'US', linkedin:'urn:li:geo:102448103', twitter:{ woeid:2442047 }, snapchat:'US', iso:'US' },

  { name:'Chicago', country:'United States', type:'city', region:'North America',
    meta:{ key:'4887398', type:'city' }, google:{ criterionId:1016367 },
    tiktok:'US', linkedin:'urn:li:geo:103112676', twitter:{ woeid:2379574 }, snapchat:'US', iso:'US' },

  { name:'Canada', type:'country', region:'North America',
    meta:{ key:'CA', type:'country' }, google:{ criterionId:2124 },
    tiktok:'CA', linkedin:'urn:li:geo:101174742', twitter:{ woeid:23424775 }, snapchat:'CA', iso:'CA' },

  { name:'Toronto', country:'Canada', type:'city', region:'North America',
    meta:{ key:'6167865', type:'city' }, google:{ criterionId:1002753 },
    tiktok:'CA', linkedin:'urn:li:geo:101174742', twitter:{ woeid:4118 }, snapchat:'CA', iso:'CA' },

  { name:'Mexico', type:'country', region:'North America',
    meta:{ key:'MX', type:'country' }, google:{ criterionId:2484 },
    tiktok:'MX', linkedin:'urn:li:geo:103323778', twitter:{ woeid:23424900 }, snapchat:'MX', iso:'MX' },

  { name:'Mexico City', country:'Mexico', type:'city', region:'North America',
    meta:{ key:'3530597', type:'city' }, google:{ criterionId:1010044 },
    tiktok:'MX', linkedin:'urn:li:geo:103323778', twitter:{ woeid:116545 }, snapchat:'MX', iso:'MX' },

  // ── SOUTH AMERICA ────────────────────────────────────────────────────────────
  { name:'Brazil', type:'country', region:'South America',
    meta:{ key:'BR', type:'country' }, google:{ criterionId:2076 },
    tiktok:'BR', linkedin:'urn:li:geo:106057199', twitter:{ woeid:23424768 }, snapchat:'BR', iso:'BR' },

  { name:'São Paulo', country:'Brazil', type:'city', region:'South America',
    meta:{ key:'3448439', type:'city' }, google:{ criterionId:1001539 },
    tiktok:'BR', linkedin:'urn:li:geo:106057199', twitter:{ woeid:455827 }, snapchat:'BR', iso:'BR' },

  { name:'Argentina', type:'country', region:'South America',
    meta:{ key:'AR', type:'country' }, google:{ criterionId:2032 },
    tiktok:'AR', linkedin:'urn:li:geo:100446943', twitter:{ woeid:23424747 }, snapchat:'AR', iso:'AR' },

  { name:'Colombia', type:'country', region:'South America',
    meta:{ key:'CO', type:'country' }, google:{ criterionId:2170 },
    tiktok:'CO', linkedin:'urn:li:geo:100876405', twitter:{ woeid:23424787 }, snapchat:'CO', iso:'CO' },

  // ── MIDDLE EAST ──────────────────────────────────────────────────────────────
  { name:'United Arab Emirates', type:'country', region:'Middle East',
    meta:{ key:'AE', type:'country' }, google:{ criterionId:2784 },
    tiktok:'AE', linkedin:'urn:li:geo:104305776', twitter:{ woeid:23424738 }, snapchat:'AE', iso:'AE' },

  { name:'Dubai', country:'United Arab Emirates', type:'city', region:'Middle East',
    meta:{ key:'292223', type:'city' }, google:{ criterionId:9006661 },
    tiktok:'AE', linkedin:'urn:li:geo:104305776', twitter:{ woeid:1940645 }, snapchat:'AE', iso:'AE' },

  { name:'Saudi Arabia', type:'country', region:'Middle East',
    meta:{ key:'SA', type:'country' }, google:{ criterionId:2682 },
    tiktok:'SA', linkedin:'urn:li:geo:101363195', twitter:{ woeid:23424938 }, snapchat:'SA', iso:'SA' },

  { name:'Turkey', type:'country', region:'Middle East',
    meta:{ key:'TR', type:'country' }, google:{ criterionId:2792 },
    tiktok:'TR', linkedin:'urn:li:geo:102105699', twitter:{ woeid:23424969 }, snapchat:'TR', iso:'TR' },

  { name:'Istanbul', country:'Turkey', type:'city', region:'Middle East',
    meta:{ key:'745044', type:'city' }, google:{ criterionId:1005765 },
    tiktok:'TR', linkedin:'urn:li:geo:102105699', twitter:{ woeid:1877422 }, snapchat:'TR', iso:'TR' },

  // ── ASIA ─────────────────────────────────────────────────────────────────────
  { name:'India', type:'country', region:'Asia',
    meta:{ key:'IN', type:'country' }, google:{ criterionId:2356 },
    tiktok:'IN', linkedin:'urn:li:geo:102713980', twitter:{ woeid:23424848 }, snapchat:'IN', iso:'IN' },

  { name:'Mumbai', country:'India', type:'city', region:'Asia',
    meta:{ key:'1275339', type:'city' }, google:{ criterionId:1007765 },
    tiktok:'IN', linkedin:'urn:li:geo:102713980', twitter:{ woeid:2295411 }, snapchat:'IN', iso:'IN' },

  { name:'Delhi', country:'India', type:'city', region:'Asia',
    meta:{ key:'1261481', type:'city' }, google:{ criterionId:1007756 },
    tiktok:'IN', linkedin:'urn:li:geo:102713980', twitter:{ woeid:20070458 }, snapchat:'IN', iso:'IN' },

  { name:'China', type:'country', region:'Asia',
    meta:{ key:'CN', type:'country' }, google:{ criterionId:2156 },
    tiktok:'CN', linkedin:'urn:li:geo:102890883', twitter:{ woeid:23424781 }, snapchat:'CN', iso:'CN' },

  { name:'Japan', type:'country', region:'Asia',
    meta:{ key:'JP', type:'country' }, google:{ criterionId:2392 },
    tiktok:'JP', linkedin:'urn:li:geo:101355337', twitter:{ woeid:23424856 }, snapchat:'JP', iso:'JP' },

  { name:'Indonesia', type:'country', region:'Asia',
    meta:{ key:'ID', type:'country' }, google:{ criterionId:2360 },
    tiktok:'ID', linkedin:'urn:li:geo:102478259', twitter:{ woeid:23424846 }, snapchat:'ID', iso:'ID' },

  { name:'Singapore', type:'country', region:'Asia',
    meta:{ key:'SG', type:'country' }, google:{ criterionId:2702 },
    tiktok:'SG', linkedin:'urn:li:geo:102454443', twitter:{ woeid:23424840 }, snapchat:'SG', iso:'SG' },

  { name:'Malaysia', type:'country', region:'Asia',
    meta:{ key:'MY', type:'country' }, google:{ criterionId:2458 },
    tiktok:'MY', linkedin:'urn:li:geo:100578016', twitter:{ woeid:23424901 }, snapchat:'MY', iso:'MY' },

  { name:'Philippines', type:'country', region:'Asia',
    meta:{ key:'PH', type:'country' }, google:{ criterionId:2608 },
    tiktok:'PH', linkedin:'urn:li:geo:103121230', twitter:{ woeid:23424934 }, snapchat:'PH', iso:'PH' },

  { name:'Pakistan', type:'country', region:'Asia',
    meta:{ key:'PK', type:'country' }, google:{ criterionId:2586 },
    tiktok:'PK', linkedin:'urn:li:geo:103093626', twitter:{ woeid:23424922 }, snapchat:'PK', iso:'PK' },

  // ── OCEANIA ──────────────────────────────────────────────────────────────────
  { name:'Australia', type:'country', region:'Oceania',
    meta:{ key:'AU', type:'country' }, google:{ criterionId:2036 },
    tiktok:'AU', linkedin:'urn:li:geo:101452733', twitter:{ woeid:23424748 }, snapchat:'AU', iso:'AU' },

  { name:'Sydney', country:'Australia', type:'city', region:'Oceania',
    meta:{ key:'2147714', type:'city' }, google:{ criterionId:1000825 },
    tiktok:'AU', linkedin:'urn:li:geo:101452733', twitter:{ woeid:1105779 }, snapchat:'AU', iso:'AU' },

  { name:'New Zealand', type:'country', region:'Oceania',
    meta:{ key:'NZ', type:'country' }, google:{ criterionId:2554 },
    tiktok:'NZ', linkedin:'urn:li:geo:105490917', twitter:{ woeid:23424916 }, snapchat:'NZ', iso:'NZ' },
];

module.exports = locations;
