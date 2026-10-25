// npm install cheerio
// node get-thumbnails.js

const cheerio = require('cheerio');

const games = [
 
  {
    id: 'venge-io',
    name: 'Venge.io',
    category: 'Action',
    subcategory: 'Tactical FPS',
    thumbnail: 'venge-io.jpg',
    embedUrl: 'https://venge.io',
    description: 'Tactical browser FPS with competitive team modes.',
    tags: ['FPS', 'Tactical', 'Multiplayer', '3D'],
    provider: 'Official site'
  },
  {
    id: 'warbrokers-io',
    name: 'War Brokers',
    category: 'Action',
    subcategory: 'FPS Vehicles',
    thumbnail: 'warbrokers-io.jpg',
    embedUrl: 'https://warbrokers.io',
    description: 'Browser FPS with vehicles and combined combat.',
    tags: ['FPS', 'Vehicles', 'Multiplayer', '3D'],
    provider: 'Official site'
  },
  {
    id: 'voxiom-io',
    name: 'Voxiom',
    category: 'Action',
    subcategory: 'Battle Royale Sandbox',
    thumbnail: 'voxiom-io.jpg',
    embedUrl: 'https://voxiom.io',
    description: 'Build and battle in a voxel battle royale game.',
    tags: ['Battle Royale', 'Building', 'Voxel', 'Multiplayer'],
    provider: 'Official site'
  },
  {
    id: 'surviv-io',
    name: 'Surviv.io',
    category: 'Action',
    subcategory: 'Battle Royale',
    thumbnail: 'surviv-io.jpg',
    embedUrl: 'https://surviv.io',
    description: 'Top-down battle royale with solo and squad play.',
    tags: ['Battle Royale', 'Top-Down', 'Squads', 'Multiplayer'],
    provider: 'Official site'
  },
  {
    id: 'zombsroyale-io',
    name: 'Zombs Royale',
    category: 'Action',
    subcategory: 'Battle Royale',
    thumbnail: 'zombsroyale-io.jpg',
    embedUrl: 'https://zombsroyale.io',
    description: 'Fast browser battle royale with many modes.',
    tags: ['Battle Royale', '2D', 'Multiplayer', 'Shooter'],
    provider: 'Official site'
  },
  {
    id: 'deadshot-io',
    name: 'Deadshot.io',
    category: 'Action',
    subcategory: 'Competitive FPS',
    thumbnail: 'deadshot-io.jpg',
    embedUrl: 'https://deadshot.io',
    description: 'Competitive browser FPS focused on fast matches.',
    tags: ['FPS', 'Competitive', 'Multiplayer', '3D'],
    provider: 'Official site'
  },
  {
    id: 'bonk-io',
    name: 'Bonk.io',
    category: 'Action',
    subcategory: 'Physics Fighting',
    thumbnail: 'bonk-io.jpg',
    embedUrl: 'https://bonk.io',
    description: 'Physics fighting game with private rooms.',
    tags: ['Physics', 'Fighting', 'Multiplayer', 'Party'],
    provider: 'Official site'
  },
  {
    id: 'taming-io',
    name: 'Taming.io',
    category: 'Action',
    subcategory: 'Survival Combat',
    thumbnail: 'taming-io.jpg',
    embedUrl: 'https://taming.io',
    description: 'Survival and combat game with pets and building.',
    tags: ['Survival', 'Combat', 'Pets', 'Multiplayer'],
    provider: 'Official site'
  },
  {
    id: 'wormate-io',
    name: 'Wormate.io',
    category: 'Action',
    subcategory: 'Arcade .io',
    thumbnail: 'wormate-io.jpg',
    embedUrl: 'https://wormate.io',
    description: 'Arcade snake-style game with multiplayer growth.',
    tags: ['Arcade', '.io', 'Multiplayer', 'Casual'],
    provider: 'Official site'
  },
  {
    id: 'hole-io',
    name: 'Hole.io',
    category: 'Action',
    subcategory: 'Arcade .io',
    thumbnail: 'hole-io.jpg',
    embedUrl: 'https://hole.io',
    description: 'Grow a hole and swallow the city in arcade matches.',
    tags: ['Arcade', '.io', 'Casual', 'Multiplayer'],
    provider: 'Official site'
  },
  {
    id: 'paper-io',
    name: 'Paper.io',
    category: 'Action',
    subcategory: 'Arcade .io',
    thumbnail: 'paper-io.jpg',
    embedUrl: 'https://paper-io.com',
    description: 'Claim territory in a colorful paper arcade game.',
    tags: ['Arcade', '.io', 'Territory', 'Casual'],
    provider: 'Official site'
  },
  {
    id: 'tetr-io',
    name: 'TETR.IO',
    category: 'Action',
    subcategory: 'Competitive Puzzle',
    thumbnail: 'tetr-io.jpg',
    embedUrl: 'https://tetr.io',
    description: 'Competitive browser Tetris with ranked play.',
    tags: ['Tetris', 'Competitive', 'Puzzle', 'Multiplayer'],
    provider: 'Official site'
  },
  {
    id: 'generals-io',
    name: 'Generals.io',
    category: 'Strategy',
    subcategory: 'Strategy',
    thumbnail: 'generals-io.jpg',
    embedUrl: 'https://generals.io',
    description: 'Fast multiplayer strategy game of territory control.',
    tags: ['Strategy', 'Multiplayer', 'Territory', 'Turn-Based'],
    provider: 'Official site'
  },
  {
    id: 'minecraft-classic',
    name: 'Minecraft Classic',
    category: 'Simulation',
    subcategory: 'Sandbox',
    thumbnail: 'minecraft-classic.jpg',
    embedUrl: 'https://classic.minecraft.net',
    description: 'Official free Minecraft Classic sandbox for up to 10 players.',
    tags: ['Sandbox', 'Building', 'Voxel', 'Multiplayer'],
    provider: 'Official site'
  },
  {
    id: 'geo-fs',
    name: 'GeoFS',
    category: 'Simulation',
    subcategory: 'Flight Simulator',
    thumbnail: 'geo-fs.jpg',
    embedUrl: 'https://www.geo-fs.com',
    description: 'Free browser flight simulator with global scenery.',
    tags: ['Flight', 'Simulation', '3D', 'Open World'],
    provider: 'Official site'
  },
  {
    id: 'cookie-clicker',
    name: 'Cookie Clicker',
    category: 'Simulation',
    subcategory: 'Idle Management',
    thumbnail: 'cookie-clicker.jpg',
    embedUrl: 'https://orteil.dashnet.org/cookieclicker',
    description: 'Idle management game about building a cookie empire.',
    tags: ['Idle', 'Management', 'Clicker', 'Casual'],
    provider: 'Official site'
  },
  {
    id: 'universal-paperclips',
    name: 'Universal Paperclips',
    category: 'Simulation',
    subcategory: 'Business Idle',
    thumbnail: 'universal-paperclips.jpg',
    embedUrl: 'https://www.decisionproblem.com/paperclips',
    description: 'Idle business simulation about making paperclips.',
    tags: ['Idle', 'Business', 'Simulation', 'Strategy'],
    provider: 'Official site'
  },
  {
    id: 'kittens-game',
    name: 'Kittens Game',
    category: 'Simulation',
    subcategory: 'Civilization Builder',
    thumbnail: 'kittens-game.jpg',
    embedUrl: 'https://kittensgame.com',
    description: 'Deep civilization builder with idle progression.',
    tags: ['Idle', 'Civilization', 'Management', 'Strategy'],
    provider: 'Official site'
  },
  {
    id: 'little-alchemy-2',
    name: 'Little Alchemy 2',
    category: 'Simulation',
    subcategory: 'Puzzle Sandbox',
    thumbnail: 'little-alchemy-2.jpg',
    embedUrl: 'https://littlealchemy2.com',
    description: 'Combine elements to discover new items and ideas.',
    tags: ['Puzzle', 'Sandbox', 'Crafting', 'Casual'],
    provider: 'Official site'
  },
  {
    id: 'a-dark-room',
    name: 'A Dark Room',
    category: 'Simulation',
    subcategory: 'Text Survival',
    thumbnail: 'a-dark-room.jpg',
    embedUrl: 'https://adarkroom.doublespeakgames.com',
    description: 'Minimal survival and text simulation with deep progression.',
    tags: ['Survival', 'Text', 'Simulation', 'Strategy'],
    provider: 'Official site'
  },
  {
    id: 'territorial-io',
    name: 'Territorial.io',
    category: 'Strategy',
    subcategory: 'Territory Strategy',
    thumbnail: 'territorial-io.jpg',
    embedUrl: 'https://territorial.io',
    description: 'Territory strategy simulation with multiplayer maps.',
    tags: ['Strategy', 'Territory', 'Simulation', 'Multiplayer'],
    provider: 'Official site'
  },
  {
    id: '1v1-lol',
    name: '1v1.LOL',
    category: 'Action',
    subcategory: 'Shooter Building',
    thumbnail: '1v1-lol.jpg',
    embedUrl: 'https://1v1.lol',
    description: 'Build and shoot in fast browser 1v1 matches.',
    tags: ['Shooter', 'Building', 'Competitive', '3D'],
    provider: 'Official site'
  },
  {
    id: 'kirka-io',
    name: 'Kirka.io',
    category: 'Action',
    subcategory: 'FPS',
    thumbnail: 'kirka-io.jpg',
    embedUrl: 'https://kirka.io',
    description: 'Browser FPS with blocky visuals and multiple modes.',
    tags: ['FPS', 'Multiplayer', '3D', 'Shooter'],
    provider: 'Official site'
  },
  {
    id: 'narrow-one',
    name: 'Narrow One',
    category: 'Action',
    subcategory: 'Archery FPS',
    thumbnail: 'narrow-one.jpg',
    embedUrl: 'https://narrow.one',
    description: 'Medieval browser archery combat with team modes.',
    tags: ['Archery', 'FPS', 'Multiplayer', '3D'],
    provider: 'Official site'
  },
  {
    id: 'ev-io',
    name: 'ev.io',
    category: 'Action',
    subcategory: 'Arena FPS',
    thumbnail: 'ev-io.jpg',
    embedUrl: 'https://ev.io',
    description: 'Arena FPS with abilities and fast movement.',
    tags: ['FPS', 'Arena', 'Multiplayer', '3D'],
    provider: 'Official site'
  },
  {
    id: 'repuls-io',
    name: 'Repuls.io',
    category: 'Action',
    subcategory: 'Arena Shooter',
    thumbnail: 'repuls-io.jpg',
    embedUrl: 'https://repuls.io',
    description: 'Fast arena shooter with sci-fi combat.',
    tags: ['Shooter', 'Arena', 'Multiplayer', '3D'],
    provider: 'Official site'
  },
  {
    id: 'gats-io',
    name: 'Gats.io',
    category: 'Action',
    subcategory: 'Top-Down Shooter',
    thumbnail: 'gats-io.jpg',
    embedUrl: 'https://gats.io',
    description: 'Top-down multiplayer shooter with classes.',
    tags: ['Shooter', 'Top-Down', 'Multiplayer', '.io'],
    provider: 'Official site'
  },
  {
    id: 'wings-io',
    name: 'Wings.io',
    category: 'Action',
    subcategory: 'Dogfight',
    thumbnail: 'wings-io.jpg',
    embedUrl: 'https://wings.io',
    description: 'Multiplayer airplane dogfighting in the browser.',
    tags: ['Flight', 'Combat', 'Multiplayer', 'Arcade'],
    provider: 'Official site'
  },
  {
    id: 'brutal-io',
    name: 'Brutal.io',
    category: 'Action',
    subcategory: 'Arena .io',
    thumbnail: 'brutal-io.jpg',
    embedUrl: 'https://brutal.io',
    description: 'Physics arena combat with multiplayer battles.',
    tags: ['Arena', '.io', 'Combat', 'Multiplayer'],
    provider: 'Official site'
  },
  {
    id: 'starblast-io',
    name: 'Starblast.io',
    category: 'Action',
    subcategory: 'Space Shooter',
    thumbnail: 'starblast-io.jpg',
    embedUrl: 'https://starblast.io',
    description: 'Space mining and combat with multiplayer teams.',
    tags: ['Space', 'Shooter', 'Mining', 'Multiplayer'],
    provider: 'Official site'
  },
  {
    id: 'rocketbot-royale',
    name: 'RocketBot Royale',
    category: 'Action',
    subcategory: 'Vehicle Battle Royale',
    thumbnail: 'rocketbot-royale.jpg',
    embedUrl: 'https://rocketbotroyale.winterpixel.io',
    description: 'Vehicle battle royale with rocket-powered bots.',
    tags: ['Battle Royale', 'Vehicles', 'Multiplayer', '3D'],
    provider: 'Official site'
  },
  {
    id: 'tankionline',
    name: 'Tanki Online',
    category: 'Action',
    subcategory: 'Tank Shooter',
    thumbnail: 'tankionline.jpg',
    embedUrl: 'https://tankionline.com',
    description: 'Multiplayer tank shooter with upgrades and maps.',
    tags: ['Tanks', 'Shooter', 'Multiplayer', '3D'],
    provider: 'Official site'
  },
  {
    id: 'evowars-io',
    name: 'Evowars.io',
    category: 'Action',
    subcategory: 'Evolution Combat',
    thumbnail: 'evowars-io.jpg',
    embedUrl: 'https://evowars.io',
    description: 'Evolve and fight in a multiplayer combat arena.',
    tags: ['Combat', 'Evolution', 'Multiplayer', '.io'],
    provider: 'Official site'
  },
  {
    id: 'buildroyale-io',
    name: 'BuildRoyale.io',
    category: 'Action',
    subcategory: 'Battle Royale Building',
    thumbnail: 'buildroyale-io.jpg',
    embedUrl: 'https://buildroyale.io',
    description: 'Battle royale with building and shooting mechanics.',
    tags: ['Battle Royale', 'Building', 'Shooter', 'Multiplayer'],
    provider: 'Official site'
  },
  {
    id: 'warbot-io',
    name: 'WarBot.io',
    category: 'Action',
    subcategory: 'Robot Combat',
    thumbnail: 'warbot-io.jpg',
    embedUrl: 'https://warbot.io',
    description: 'Robot combat arena with multiplayer battles.',
    tags: ['Robots', 'Combat', 'Multiplayer', '.io'],
    provider: 'Official site'
  },
  {
    id: 'stabfish-io',
    name: 'Stabfish.io',
    category: 'Action',
    subcategory: 'Arena Combat',
    thumbnail: 'stabfish-io.jpg',
    embedUrl: 'https://stabfish.io',
    description: 'Underwater arena combat with fish and weapons.',
    tags: ['Arena', 'Combat', 'Multiplayer', '.io'],
    provider: 'Official site'
  },
  {
    id: 'sploop-io',
    name: 'Sploop.io',
    category: 'Action',
    subcategory: 'Survival Combat',
    thumbnail: 'sploop-io.jpg',
    embedUrl: 'https://sploop.io',
    description: 'Multiplayer survival combat with crafting and bases.',
    tags: ['Survival', 'Combat', 'Crafting', 'Multiplayer'],
    provider: 'Official site'
  },
  {
    id: 'tribals-io',
    name: 'Tribals.io',
    category: 'Action',
    subcategory: 'Survival Combat',
    thumbnail: 'tribals-io.jpg',
    embedUrl: 'https://tribals.io',
    description: 'Tribal survival game with combat and progression.',
    tags: ['Survival', 'Combat', 'Multiplayer', '.io'],
    provider: 'Official site'
  },
  {
    id: 'hordes-io',
    name: 'Hordes.io',
    category: 'Action',
    subcategory: 'MMO Combat',
    thumbnail: 'hordes-io.jpg',
    embedUrl: 'https://hordes.io',
    description: 'Browser MMO with factions and open combat.',
    tags: ['MMO', 'Combat', 'Multiplayer', '3D'],
    provider: 'Official site'
  },
  {
    id: 'wilds-io',
    name: 'Wilds.io',
    category: 'Action',
    subcategory: 'Survival Combat',
    thumbnail: 'wilds-io.jpg',
    embedUrl: 'https://wilds.io',
    description: 'Multiplayer survival and combat in a wild world.',
    tags: ['Survival', 'Combat', 'Multiplayer', '.io'],
    provider: 'Official site'
  },
  {
    id: 'devast-io',
    name: 'Devast.io',
    category: 'Action',
    subcategory: 'Survival',
    thumbnail: 'devast-io.jpg',
    embedUrl: 'https://devast.io',
    description: 'Survival game with crafting and multiplayer danger.',
    tags: ['Survival', 'Crafting', 'Multiplayer', '.io'],
    provider: 'Official site'
  },
  {
    id: 'arras-io',
    name: 'Arras.io',
    category: 'Action',
    subcategory: 'Tank Arena',
    thumbnail: 'arras-io.jpg',
    embedUrl: 'https://arras.io',
    description: 'Tank arena shooter with many upgrade paths.',
    tags: ['Tanks', 'Arena', 'Shooter', 'Multiplayer'],
    provider: 'Official site'
  },
  {
    id: 'evades-io',
    name: 'Evades.io',
    category: 'Action',
    subcategory: 'Co-op Arena',
    thumbnail: 'evades-io.jpg',
    embedUrl: 'https://evades.io',
    description: 'Co-op arena game with heroes and abilities.',
    tags: ['Co-op', 'Arena', 'Multiplayer', '.io'],
    provider: 'Official site'
  },
  {
    id: 'powerline-io',
    name: 'Powerline.io',
    category: 'Action',
    subcategory: 'Snake Arena',
    thumbnail: 'powerline-io.jpg',
    embedUrl: 'https://powerline.io',
    description: 'Snake-style multiplayer arena with powerups.',
    tags: ['Snake', 'Arena', 'Multiplayer', '.io'],
    provider: 'Official site'
  },
  {
    id: 'lordz-io',
    name: 'Lordz.io',
    category: 'Action',
    subcategory: 'Army Strategy',
    thumbnail: 'lordz-io.jpg',
    embedUrl: 'https://lordz.io',
    description: 'Build an army and fight for territory.',
    tags: ['Army', 'Strategy', 'Multiplayer', '.io'],
    provider: 'Official site'
  },
  {
    id: 'haxball',
    name: 'HaxBall',
    category: 'Action',
    subcategory: 'Sports Arcade',
    thumbnail: 'haxball.jpg',
    embedUrl: 'https://haxball.com',
    description: 'Physics-based multiplayer football arcade game.',
    tags: ['Sports', 'Physics', 'Multiplayer', 'Arcade'],
    provider: 'Official site'
  },
  {
    id: 'starve-io',
    name: 'Starve.io',
    category: 'Survival',
    subcategory: 'Survival',
    thumbnail: 'starve-io.jpg',
    embedUrl: 'https://starve.io',
    description: 'Survival game with crafting, hunger, and combat.',
    tags: ['Survival', 'Crafting', 'Multiplayer', '.io'],
    provider: 'Official site'
  },
  {
    id: 'mope-io',
    name: 'Mope.io',
    category: 'Survival',
    subcategory: 'Animal Evolution',
    thumbnail: 'mope-io.jpg',
    embedUrl: 'https://mope.io',
    description: 'Animal survival and evolution in a multiplayer world.',
    tags: ['Survival', 'Animals', 'Evolution', 'Multiplayer'],
    provider: 'Official site'
  },
  {
    id: 'moomoo-io',
    name: 'MooMoo.io',
    category: 'Survival',
    subcategory: 'Survival Combat',
    thumbnail: 'moomoo-io.jpg',
    embedUrl: 'https://moomoo.io',
    description: 'Gather resources and fight in a survival arena.',
    tags: ['Survival', 'Combat', 'Crafting', 'Multiplayer'],
    provider: 'Official site'
  },
  {
    id: 'evoworld-io',
    name: 'Evoworld.io',
    category: 'Survival',
    subcategory: 'Evolution Survival',
    thumbnail: 'evoworld-io.jpg',
    embedUrl: 'https://evoworld.io',
    description: 'Evolve creatures and survive in multiplayer matches.',
    tags: ['Evolution', 'Survival', 'Multiplayer', '.io'],
    provider: 'Official site'
  },
  {
    id: 'florr-io',
    name: 'Florr.io',
    category: 'Survival',
    subcategory: 'Creature Survival',
    thumbnail: 'florr-io.jpg',
    embedUrl: 'https://florr.io',
    description: 'Grow a flower and battle creatures for petals.',
    tags: ['Survival', 'Creatures', 'Multiplayer', '.io'],
    provider: 'Official site'
  },
  {
    id: 'deeeep-io',
    name: 'Deeeep.io',
    category: 'Survival',
    subcategory: 'Ocean Survival',
    thumbnail: 'deeeep-io.jpg',
    embedUrl: 'https://deeeep.io',
    description: 'Ocean animal survival and evolution game.',
    tags: ['Ocean', 'Survival', 'Evolution', 'Multiplayer'],
    provider: 'Official site'
  },
  {
    id: 'splix-io',
    name: 'Splix.io',
    category: 'Survival',
    subcategory: 'Territory Arena',
    thumbnail: 'splix-io.jpg',
    embedUrl: 'https://splix.io',
    description: 'Claim territory in a simple multiplayer arena.',
    tags: ['Territory', 'Arena', 'Multiplayer', '.io'],
    provider: 'Official site'
  },
  {
    id: 'wormax-io',
    name: 'Wormax.io',
    category: 'Survival',
    subcategory: 'Snake Arena',
    thumbnail: 'wormax-io.jpg',
    embedUrl: 'https://wormax.io',
    description: 'Multiplayer snake arena with boosts and skins.',
    tags: ['Snake', 'Arena', 'Multiplayer', '.io'],
    provider: 'Official site'
  },
  {
    id: 'littlebigsnake',
    name: 'Little Big Snake',
    category: 'Survival',
    subcategory: 'Snake Arena',
    thumbnail: 'littlebigsnake.jpg',
    embedUrl: 'https://littlebigsnake.com',
    description: 'Snake arena game with quests and multiplayer growth.',
    tags: ['Snake', 'Arena', 'Multiplayer', 'Casual'],
    provider: 'Official site'
  },
  {
    id: 'aquapark-io',
    name: 'Aquapark.io',
    category: 'Survival',
    subcategory: 'Racing Arcade',
    thumbnail: 'aquapark-io.jpg',
    embedUrl: 'https://aquapark.io',
    description: 'Water slide racing arcade with multiplayer fun.',
    tags: ['Racing', 'Arcade', 'Multiplayer', 'Casual'],
    provider: 'Official site'
  },
  {
    id: 'hextris-io',
    name: 'Hextris',
    category: 'Survival',
    subcategory: 'Puzzle Arcade',
    thumbnail: 'hextris-io.jpg',
    embedUrl: 'https://hextris.io',
    description: 'Hexagonal puzzle arcade inspired by Tetris.',
    tags: ['Puzzle', 'Arcade', 'Casual', 'Hex'],
    provider: 'Official site'
  },
  {
    id: 'survev-io',
    name: 'Survev.io',
    category: 'Survival',
    subcategory: 'Battle Royale',
    thumbnail: 'survev-io.jpg',
    embedUrl: 'https://survev.io',
    description: 'Revival-style top-down battle royale survival game.',
    tags: ['Battle Royale', 'Survival', 'Top-Down', 'Multiplayer'],
    provider: 'Official site'
  },
  {
    id: 'fishington-io',
    name: 'Fishington.io',
    category: 'Survival',
    subcategory: 'Fishing Arcade',
    thumbnail: 'fishington-io.jpg',
    embedUrl: 'https://fishington.io',
    description: 'Multiplayer fishing arcade with upgrades.',
    tags: ['Fishing', 'Arcade', 'Multiplayer', 'Casual'],
    provider: 'Official site'
  },
  {
    id: 'plazmaburst2',
    name: 'Plazma Burst 2',
    category: 'Survival',
    subcategory: 'Platform Shooter',
    thumbnail: 'plazmaburst2.jpg',
    embedUrl: 'https://www.plazmaburst2.com',
    description: 'Side-scrolling platform shooter with multiplayer maps.',
    tags: ['Shooter', 'Platformer', 'Multiplayer', 'Action'],
    provider: 'Official site'
  },
  {
    id: 'kogama',
    name: 'Kogama',
    category: 'Survival',
    subcategory: 'Sandbox Multiplayer',
    thumbnail: 'kogama.jpg',
    embedUrl: 'https://www.kogama.com',
    description: 'User-created 3D multiplayer worlds and games.',
    tags: ['Sandbox', 'Multiplayer', '3D', 'User-Generated'],
    provider: 'Official site'
  },
  {
    id: 'cardgames-io',
    name: 'CardGames.io',
    category: 'Party',
    subcategory: 'Card Games',
    thumbnail: 'cardgames-io.jpg',
    embedUrl: 'https://cardgames.io',
    description: 'Collection of free browser card games.',
    tags: ['Cards', 'Casual', 'Multiplayer', 'Classic'],
    provider: 'Official site'
  },
  {
    id: 'gartic-io',
    name: 'Gartic.io',
    category: 'Party',
    subcategory: 'Drawing Party',
    thumbnail: 'gartic-io.jpg',
    embedUrl: 'https://gartic.io',
    description: 'Multiplayer drawing and guessing party game.',
    tags: ['Drawing', 'Party', 'Multiplayer', 'Guessing'],
    provider: 'Official site'
  },
  {
    id: 'gartic-phone',
    name: 'Gartic Phone',
    category: 'Party',
    subcategory: 'Drawing Party',
    thumbnail: 'gartic-phone.jpg',
    embedUrl: 'https://garticphone.com',
    description: 'Telephone-style drawing and writing party game.',
    tags: ['Drawing', 'Party', 'Multiplayer', 'Funny'],
    provider: 'Official site'
  },
  {
    id: 'drawaria-online',
    name: 'Drawaria Online',
    category: 'Party',
    subcategory: 'Drawing Party',
    thumbnail: 'drawaria-online.jpg',
    embedUrl: 'https://drawaria.online',
    description: 'Draw and guess with other players online.',
    tags: ['Drawing', 'Party', 'Multiplayer', 'Guessing'],
    provider: 'Official site'
  },
  {
    id: 'sketchful-io',
    name: 'Sketchful.io',
    category: 'Party',
    subcategory: 'Drawing Party',
    thumbnail: 'sketchful-io.jpg',
    embedUrl: 'https://sketchful.io',
    description: 'Multiplayer drawing and guessing game.',
    tags: ['Drawing', 'Party', 'Multiplayer', '.io'],
    provider: 'Official site'
  },
  {
    id: 'jklm-fun',
    name: 'JKLM.fun',
    category: 'Party',
    subcategory: 'Party Games',
    thumbnail: 'jklm-fun.jpg',
    embedUrl: 'https://jklm.fun',
    description: 'Collection of multiplayer party games in the browser.',
    tags: ['Party', 'Multiplayer', 'Quiz', 'Casual'],
    provider: 'Official site'
  },
  {
    id: 'colonist-io',
    name: 'Colonist.io',
    category: 'Party',
    subcategory: 'Board Game',
    thumbnail: 'colonist-io.jpg',
    embedUrl: 'https://colonist.io',
    description: 'Online multiplayer board game of settlement and trade.',
    tags: ['Board Game', 'Strategy', 'Multiplayer', 'Trading'],
    provider: 'Official site'
  },
  {
    id: 'playingcards-io',
    name: 'PlayingCards.io',
    category: 'Party',
    subcategory: 'Card Board Games',
    thumbnail: 'playingcards-io.jpg',
    embedUrl: 'https://playingcards.io',
    description: 'Virtual table for cards and board games with friends.',
    tags: ['Cards', 'Board Game', 'Multiplayer', 'Virtual Table'],
    provider: 'Official site'
  },
  {
    id: 'codenames-game',
    name: 'Codenames',
    category: 'Party',
    subcategory: 'Word Party',
    thumbnail: 'codenames-game.jpg',
    embedUrl: 'https://codenames.game',
    description: 'Online word-guessing party game for teams.',
    tags: ['Word', 'Party', 'Multiplayer', 'Teams'],
    provider: 'Official site'
  },
  {
    id: 'boardgamearena',
    name: 'Board Game Arena',
    category: 'Party',
    subcategory: 'Board Games',
    thumbnail: 'boardgamearena.jpg',
    embedUrl: 'https://boardgamearena.com',
    description: 'Large platform for playing board games online.',
    tags: ['Board Games', 'Multiplayer', 'Strategy', 'Casual'],
    provider: 'Official site'
  },
  {
    id: 'playok',
    name: 'PlayOK',
    category: 'Party',
    subcategory: 'Board and Card',
    thumbnail: 'playok.jpg',
    embedUrl: 'https://playok.com',
    description: 'Online board and card games with multiplayer rooms.',
    tags: ['Board Games', 'Cards', 'Multiplayer', 'Classic'],
    provider: 'Official site'
  },
  {
    id: 'lichess',
    name: 'Lichess',
    category: 'Party',
    subcategory: 'Chess',
    thumbnail: 'lichess.jpg',
    embedUrl: 'https://lichess.org',
    description: 'Free and open-source online chess platform.',
    tags: ['Chess', 'Strategy', 'Multiplayer', 'Free'],
    provider: 'Official site'
  },
  {
    id: 'chess-com-play',
    name: 'Chess.com Play',
    category: 'Party',
    subcategory: 'Chess',
    thumbnail: 'chess-com-play.jpg',
    embedUrl: 'https://www.chess.com/play',
    description: 'Play online chess against players worldwide.',
    tags: ['Chess', 'Strategy', 'Multiplayer', 'Competitive'],
    provider: 'Official site'
  },
  {
    id: 'online-go',
    name: 'Online Go',
    category: 'Party',
    subcategory: 'Board Game',
    thumbnail: 'online-go.jpg',
    embedUrl: 'https://online-go.com',
    description: 'Online Go board game server with ranked play.',
    tags: ['Go', 'Board Game', 'Strategy', 'Multiplayer'],
    provider: 'Official site'
  },
  {
    id: 'pokemon-showdown',
    name: 'Pokemon Showdown',
    category: 'Skill',
    subcategory: 'Competitive Battling',
    thumbnail: 'pokemon-showdown.jpg',
    embedUrl: 'https://play.pokemonshowdown.com',
    description: 'Competitive Pokemon battle simulator in the browser.',
    tags: ['Pokemon', 'Strategy', 'Competitive', 'Multiplayer'],
    provider: 'Official site'
  },
  {
    id: 'monkeytype',
    name: 'Monkeytype',
    category: 'Skill',
    subcategory: 'Typing',
    thumbnail: 'monkeytype.jpg',
    embedUrl: 'https://monkeytype.com',
    description: 'Customizable typing speed and accuracy tests.',
    tags: ['Typing', 'Skill', 'Practice', 'Minimal'],
    provider: 'Official site'
  },
  {
    id: 'keybr',
    name: 'Keybr',
    category: 'Skill',
    subcategory: 'Typing',
    thumbnail: 'keybr.jpg',
    embedUrl: 'https://www.keybr.com',
    description: 'Typing practice with adaptive lessons.',
    tags: ['Typing', 'Skill', 'Learning', 'Practice'],
    provider: 'Official site'
  },
  {
    id: 'typeracer',
    name: 'TypeRacer',
    category: 'Skill',
    subcategory: 'Typing Race',
    thumbnail: 'typeracer.jpg',
    embedUrl: 'https://www.typeracer.com',
    description: 'Multiplayer typing races with classic texts.',
    tags: ['Typing', 'Racing', 'Multiplayer', 'Skill'],
    provider: 'Official site'
  },
  {
    id: 'nitrotype',
    name: 'Nitro Type',
    category: 'Skill',
    subcategory: 'Typing Race',
    thumbnail: 'nitrotype.jpg',
    embedUrl: 'https://www.nitrotype.com',
    description: 'Typing races with cars and multiplayer competition.',
    tags: ['Typing', 'Racing', 'Multiplayer', 'Skill'],
    provider: 'Official site'
  },
  {
    id: 'play2048',
    name: '2048',
    category: 'Skill',
    subcategory: 'Puzzle',
    thumbnail: 'play2048.jpg',
    embedUrl: 'https://play2048.co',
    description: 'Slide and merge tiles to reach 2048.',
    tags: ['Puzzle', 'Numbers', 'Casual', 'Logic'],
    provider: 'Official site'
  },
  {
    id: 'zty-pe',
    name: 'ZType',
    category: 'Skill',
    subcategory: 'Typing Shooter',
    thumbnail: 'zty-pe.jpg',
    embedUrl: 'https://zty.pe',
    description: 'Type words to shoot enemies in a space shooter.',
    tags: ['Typing', 'Shooter', 'Arcade', 'Skill'],
    provider: 'Official site'
  },
  {
    id: 'tetris-com-play',
    name: 'Tetris',
    category: 'Skill',
    subcategory: 'Puzzle',
    thumbnail: 'tetris-com-play.jpg',
    embedUrl: 'https://www.tetris.com/play-tetris',
    description: 'Play classic Tetris in the browser.',
    tags: ['Tetris', 'Puzzle', 'Classic', 'Arcade'],
    provider: 'Official site'
  },
  {
    id: 'nytimes-wordle',
    name: 'Wordle',
    category: 'Skill',
    subcategory: 'Word Puzzle',
    thumbnail: 'nytimes-wordle.jpg',
    embedUrl: 'https://www.nytimes.com/games/wordle',
    description: 'Daily word-guessing puzzle from NYTimes Games.',
    tags: ['Word', 'Puzzle', 'Daily', 'Logic'],
    provider: 'Official site'
  },
  {
    id: 'seterra',
    name: 'Seterra',
    category: 'Skill',
    subcategory: 'Geography Quiz',
    thumbnail: 'seterra.jpg',
    embedUrl: 'https://www.seterra.com',
    description: 'Geography map quizzes for countries and regions.',
    tags: ['Geography', 'Quiz', 'Learning', 'Maps'],
    provider: 'Official site'
  },
  {
    id: 'jetpunk',
    name: 'JetPunk',
    category: 'Skill',
    subcategory: 'Quiz',
    thumbnail: 'jetpunk.jpg',
    embedUrl: 'https://www.jetpunk.com',
    description: 'Large collection of trivia and geography quizzes.',
    tags: ['Quiz', 'Trivia', 'Geography', 'Learning'],
    provider: 'Official site'
  },
  {
    id: 'sporcle',
    name: 'Sporcle',
    category: 'Skill',
    subcategory: 'Trivia Quiz',
    thumbnail: 'sporcle.jpg',
    embedUrl: 'https://www.sporcle.com',
    description: 'Trivia quizzes across many topics and categories.',
    tags: ['Trivia', 'Quiz', 'Knowledge', 'Casual'],
    provider: 'Official site'
  },
  {
    id: 'globle-game',
    name: 'Globle',
    category: 'Skill',
    subcategory: 'Geography Puzzle',
    thumbnail: 'globle-game.jpg',
    embedUrl: 'https://globle-game.com',
    description: 'Daily country guessing game with map hints.',
    tags: ['Geography', 'Puzzle', 'Daily', 'Maps'],
    provider: 'Official site'
  },
  {
    id: 'geoguessr',
    name: 'GeoGuessr',
    category: 'Skill',
    subcategory: 'Geography Game',
    thumbnail: 'geoguessr.jpg',
    embedUrl: 'https://www.geoguessr.com',
    description: 'Guess locations from street view imagery with limited free plays.',
    tags: ['Geography', 'Maps', 'Quiz', 'Exploration'],
    provider: 'Official site'
  },
  {
    id: 'battleship-game',
    name: 'Battleship Game',
    category: 'Skill',
    subcategory: 'Classic Strategy',
    thumbnail: 'battleship-game.jpg',
    embedUrl: 'https://www.battleship-game.org',
    description: 'Classic Battleship game against online opponents.',
    tags: ['Battleship', 'Strategy', 'Classic', 'Multiplayer'],
    provider: 'Official site'
  },
  {
    id: 'slowroads-io',
    name: 'Slow Roads',
    category: 'Simulation',
    subcategory: 'Driving Simulator',
    thumbnail: 'slowroads-io.jpg',
    embedUrl: 'https://slowroads.io',
    description: 'Relaxing endless driving simulator in the browser.',
    tags: ['Driving', 'Simulation', 'Relaxing', '3D'],
    provider: 'Official site'
  },
  {
    id: 'neal-fun',
    name: 'Neal.fun',
    category: 'Simulation',
    subcategory: 'Interactive Toys',
    thumbnail: 'neal-fun.jpg',
    embedUrl: 'https://neal.fun',
    description: 'Collection of creative interactive browser toys and simulations.',
    tags: ['Interactive', 'Simulation', 'Creative', 'Casual'],
    provider: 'Official site'
  },
  {
    id: 'infinite-craft',
    name: 'Infinite Craft',
    category: 'Simulation',
    subcategory: 'Crafting Sandbox',
    thumbnail: 'infinite-craft.jpg',
    embedUrl: 'https://neal.fun/infinite-craft',
    description: 'Combine elements to craft infinite new discoveries.',
    tags: ['Crafting', 'Sandbox', 'Puzzle', 'Creative'],
    provider: 'Official site'
  },
  {
    id: 'phet-colorado',
    name: 'PhET Simulations',
    category: 'Simulation',
    subcategory: 'Science Simulations',
    thumbnail: 'phet-colorado.jpg',
    embedUrl: 'https://phet.colorado.edu',
    description: 'Interactive science and math simulations for learning.',
    tags: ['Science', 'Education', 'Simulation', 'Interactive'],
    provider: 'Official site'
  },
  {
    id: 'falstad-circuit',
    name: 'Falstad Circuit Simulator',
    category: 'Simulation',
    subcategory: 'Electronics Simulator',
    thumbnail: 'falstad-circuit.jpg',
    embedUrl: 'https://www.falstad.com/circuit',
    description: 'Interactive electronic circuit simulator in the browser.',
    tags: ['Electronics', 'Simulation', 'Education', 'Interactive'],
    provider: 'Official site'
  },
  {
    id: 'ncase-trust',
    name: 'The Evolution of Trust',
    category: 'Simulation',
    subcategory: 'Game Theory',
    thumbnail: 'ncase-trust.jpg',
    embedUrl: 'https://ncase.me/trust',
    description: 'Interactive game theory simulation about trust and cooperation.',
    tags: ['Game Theory', 'Simulation', 'Interactive', 'Education'],
    provider: 'Official site'
  },
  {
    id: 'ncase-polygons',
    name: 'Parable of the Polygons',
    category: 'Simulation',
    subcategory: 'Social Simulation',
    thumbnail: 'ncase-polygons.jpg',
    embedUrl: 'https://ncase.me/polygons',
    description: 'Interactive simulation about segregation and small biases.',
    tags: ['Simulation', 'Social', 'Interactive', 'Education'],
    provider: 'Official site'
  },
  {
    id: 'shapez-io',
    name: 'shapez.io',
    category: 'Simulation',
    subcategory: 'Factory Builder',
    thumbnail: 'shapez-io.jpg',
    embedUrl: 'https://shapez.io',
    description: 'Factory-building automation game in the browser.',
    tags: ['Factory', 'Automation', 'Sandbox', 'Strategy'],
    provider: 'Official site'
  },
  {
    id: 'bitburner',
    name: 'Bitburner',
    category: 'Simulation',
    subcategory: 'Programming Idle',
    thumbnail: 'bitburner.jpg',
    embedUrl: 'https://bitburner-official.github.io',
    description: 'Programming-based idle game with hacking and automation.',
    tags: ['Programming', 'Idle', 'Hacking', 'Automation'],
    provider: 'Official site'
  },
  {
    id: 'trimps',
    name: 'Trimps',
    category: 'Simulation',
    subcategory: 'Idle Strategy',
    thumbnail: 'trimps.jpg',
    embedUrl: 'https://trimps.github.io',
    description: 'Deep idle strategy game with resource management.',
    tags: ['Idle', 'Strategy', 'Management', 'Progression'],
    provider: 'Official site'
  },
  {
    id: 'swarmsim',
    name: 'Swarm Simulator',
    category: 'Simulation',
    subcategory: 'Idle Strategy',
    thumbnail: 'swarmsim.jpg',
    embedUrl: 'https://swarmsim.github.io',
    description: 'Idle game about growing and upgrading a swarm.',
    tags: ['Idle', 'Strategy', 'Upgrades', 'Progression'],
    provider: 'Official site'
  },
  {
    id: 'candybox2',
    name: 'Candy Box 2',
    category: 'Simulation',
    subcategory: 'Idle Adventure',
    thumbnail: 'candybox2.jpg',
    embedUrl: 'https://candybox2.github.io',
    description: 'Minimalist idle adventure with secrets and progression.',
    tags: ['Idle', 'Adventure', 'Puzzle', 'Retro'],
    provider: 'Official site'
  },
  {
    id: 'little-alchemy',
    name: 'Little Alchemy',
    category: 'Simulation',
    subcategory: 'Puzzle Sandbox',
    thumbnail: 'little-alchemy.jpg',
    embedUrl: 'https://www.littlealchemy.com',
    description: 'Classic element-combining puzzle sandbox.',
    tags: ['Puzzle', 'Sandbox', 'Crafting', 'Casual'],
    provider: 'Official site'
  },
  {
    id: 'mapcrunch',
    name: 'MapCrunch',
    category: 'Simulation',
    subcategory: 'Exploration',
    thumbnail: 'mapcrunch.jpg',
    embedUrl: 'https://www.mapcrunch.com',
    description: 'Random street view exploration around the world.',
    tags: ['Exploration', 'Maps', 'Travel', 'Casual'],
    provider: 'Official site'
  },
  {
    id: 'freerice',
    name: 'FreeRice',
    category: 'Simulation',
    subcategory: 'Educational Quiz',
    thumbnail: 'freerice.jpg',
    embedUrl: 'https://www.freerice.com',
    description: 'Answer quiz questions to support food donation.',
    tags: ['Education', 'Quiz', 'Charity', 'Learning'],
    provider: 'Official site'
  },
  {
    id: 'freeciv',
    name: 'Freeciv',
    category: 'Simulation',
    subcategory: 'Civilization Strategy',
    thumbnail: 'freeciv.jpg',
    embedUrl: 'https://play.freeciv.org',
    description: 'Open-source Civilization-style strategy game in the browser.',
    tags: ['Civilization', 'Strategy', 'Turn-Based', 'Open Source'],
    provider: 'Official site'
  },
  {
    id: 'runescape',
    name: 'RuneScape',
    category: 'Simulation',
    subcategory: 'MMORPG',
    thumbnail: 'runescape.jpg',
    embedUrl: 'https://www.runescape.com',
    description: 'Free-to-play browser MMORPG with skills and quests.',
    tags: ['MMORPG', 'Adventure', 'Skills', 'Multiplayer'],
    provider: 'Official site'
  },
  {
    id: 'warzone',
    name: 'Warzone',
    category: 'Strategy',
    subcategory: 'Turn-Based Strategy',
    thumbnail: 'warzone.jpg',
    embedUrl: 'https://www.warzone.com',
    description: 'Turn-based multiplayer strategy game of world conquest.',
    tags: ['Strategy', 'Turn-Based', 'Multiplayer', 'Conquest'],
    provider: 'Official site'
  },
  {
    id: 'simcompanies',
    name: 'Sim Companies',
    category: 'Strategy',
    subcategory: 'Business Simulation',
    thumbnail: 'simcompanies.jpg',
    embedUrl: 'https://www.simcompanies.com',
    description: 'Business simulation with production and markets.',
    tags: ['Business', 'Simulation', 'Management', 'Multiplayer'],
    provider: 'Official site'
  },
  {
    id: 'nationstates',
    name: 'NationStates',
    category: 'Strategy',
    subcategory: 'Political Simulation',
    thumbnail: 'nationstates.jpg',
    embedUrl: 'https://www.nationstates.net',
    description: 'Political simulation where you run your own nation.',
    tags: ['Politics', 'Simulation', 'Text', 'Strategy'],
    provider: 'Official site'
  },
  {
    id: 'politics-and-war',
    name: 'Politics and War',
    category: 'Strategy',
    subcategory: 'Nation Strategy',
    thumbnail: 'politics-and-war.jpg',
    embedUrl: 'https://www.politicsandwar.com',
    description: 'Online nation-building and war strategy game.',
    tags: ['Politics', 'Strategy', 'Nation', 'Multiplayer'],
    provider: 'Official site'
  },
  {
    id: 'online-soccer-manager',
    name: 'Online Soccer Manager',
    category: 'Strategy',
    subcategory: 'Sports Management',
    thumbnail: 'online-soccer-manager.jpg',
    embedUrl: 'https://www.onlinesoccermanager.com',
    description: 'Manage a football club and compete online.',
    tags: ['Sports', 'Management', 'Football', 'Multiplayer'],
    provider: 'Official site'
  },
  {
    id: 'hattrick',
    name: 'Hattrick',
    category: 'Strategy',
    subcategory: 'Football Management',
    thumbnail: 'hattrick.jpg',
    embedUrl: 'https://www.hattrick.org',
    description: 'Long-running online football management game.',
    tags: ['Football', 'Management', 'Sports', 'Multiplayer'],
    provider: 'Official site'
  },
  {
    id: 'travian',
    name: 'Travian',
    category: 'Strategy',
    subcategory: 'Empire Building',
    thumbnail: 'travian.jpg',
    embedUrl: 'https://www.travian.com',
    description: 'Browser empire-building strategy game with tribes.',
    tags: ['Strategy', 'Empire', 'Building', 'Multiplayer'],
    provider: 'Official site'
  },
  {
    id: 'ogame',
    name: 'OGame',
    category: 'Strategy',
    subcategory: 'Space Strategy',
    thumbnail: 'ogame.jpg',
    embedUrl: 'https://www.ogame.org',
    description: 'Space strategy game about building fleets and empires.',
    tags: ['Space', 'Strategy', 'Empire', 'Multiplayer'],
    provider: 'Official site'
  },
  {
    id: 'forge-of-empires',
    name: 'Forge of Empires',
    category: 'Strategy',
    subcategory: 'City Builder',
    thumbnail: 'forge-of-empires.jpg',
    embedUrl: 'https://www.forgeofempires.com',
    description: 'City-building strategy game across historical eras.',
    tags: ['City Builder', 'Strategy', 'Empire', 'Browser'],
    provider: 'Official site'
  },
  {
    id: 'tribal-wars',
    name: 'Tribal Wars',
    category: 'Strategy',
    subcategory: 'Empire Strategy',
    thumbnail: 'tribal-wars.jpg',
    embedUrl: 'https://www.tribalwars.net',
    description: 'Classic browser strategy game of tribes and conquest.',
    tags: ['Strategy', 'Tribes', 'Conquest', 'Multiplayer'],
    provider: 'Official site'
  },
  {
    id: 'elvenar',
    name: 'Elvenar',
    category: 'Strategy',
    subcategory: 'City Builder',
    thumbnail: 'elvenar.jpg',
    embedUrl: 'https://www.elvenar.com',
    description: 'Fantasy city-building strategy game in the browser.',
    tags: ['Fantasy', 'City Builder', 'Strategy', 'Browser'],
    provider: 'Official site'
  },
  {
    id: 'torn',
    name: 'Torn',
    category: 'Strategy',
    subcategory: 'Crime RPG',
    thumbnail: 'torn.jpg',
    embedUrl: 'https://www.torn.com',
    description: 'Text-based crime RPG with multiplayer city life.',
    tags: ['RPG', 'Crime', 'Text', 'Multiplayer'],
    provider: 'Official site'
  },
  {
    id: 'kingdom-of-loathing',
    name: 'Kingdom of Loathing',
    category: 'Strategy',
    subcategory: 'Comedy RPG',
    thumbnail: 'kingdom-of-loathing.jpg',
    embedUrl: 'https://www.kingdomofloathing.com',
    description: 'Humorous browser RPG with turn-based adventures.',
    tags: ['RPG', 'Comedy', 'Turn-Based', 'Browser'],
    provider: 'Official site'
  },
  {
    id: 'neopets',
    name: 'Neopets',
    category: 'Strategy',
    subcategory: 'Virtual Pet RPG',
    thumbnail: 'neopets.jpg',
    embedUrl: 'https://www.neopets.com',
    description: 'Classic virtual pet and adventure browser game.',
    tags: ['Virtual Pets', 'RPG', 'Adventure', 'Classic'],
    provider: 'Official site'
  },
{
  id: 'papas-pizzeria',
  name: "Papa's Pizzeria",
  category: 'Simulation',
  subcategory: 'Restaurant Management',
  thumbnail: 'papas-pizzeria.jpg',
  embedUrl: 'https://www.coolmathgames.com/0-papas-pizzeria/play',
  description: "Run Papa's pizzeria by taking orders, baking pizzas, and keeping customers happy.",
  tags: ['Restaurant', 'Management', 'Cooking', 'Time Management', 'Casual'],
  provider: 'Coolmath Games'
},

{
  id: 'arcadino-supermarket-simulator',
  name: 'Supermarket Simulator',
  category: 'Simulation',
  subcategory: 'Store Management',
  thumbnail: 'supermarket-simulator.jpg',
  embedUrl: 'https://arcadino.com/wp-content/uploads/games/supermarket-simulator/index.html',
  description: 'Browser supermarket simulation about stocking, selling, and managing a store.',
  tags: ['Simulation', 'Management', 'Supermarket', 'Casual'],
  provider: 'Arcadino'
},

{
  id: 'veck-io',
  name: 'Veck.io',
  category: 'Action',
  subcategory: 'FPS',
  thumbnail: 'veck-io.jpg',
  embedUrl: 'https://veck.io/#MRW5ULX4',
  description: 'Browser multiplayer FPS with room-code matches and fast shooter action.',
  tags: ['FPS', 'Shooter', 'Multiplayer', '3D'],
  provider: 'Official site'
},

{
  id: 'supermarket-simulator-store-manager',
  name: 'Supermarket Simulator: Store Manager',
  category: 'Simulation',
  subcategory: 'Store Management',
  thumbnail: 'supermarket-simulator-store-manager.jpg',
  embedUrl: 'https://games.cdn.famobi.com/html5games/s/supermarket-simulator-store-manager/v020/?fg_domain=play.famobi.com&fg_aid=A-IOCJF&fg_uid=3018d892-2f53-45e2-bd5e-457f92ad768c&fg_pid=725ca73f-aa33-4436-bdac-df8e93e343ae&fg_beat=641&original_ref=https%3A%2F%2Fkbhgames.com%2F',
  description: 'Run and manage a supermarket in this browser store-management simulation.',
  tags: ['Simulation', 'Management', 'Supermarket', 'Casual'],
  provider: 'Famobi / KBH Games'
},

{
  id: 'idle-crafting-empire-tycoon',
  name: 'Idle Crafting Empire Tycoon',
  category: 'Simulation',
  subcategory: 'Idle Crafting',
  thumbnail: 'idle-crafting-empire-tycoon.jpg',
  embedUrl: 'https://idle-crafting-empire-tycoon.game-files.crazygames.com/idle-crafting-empire-tycoon/15/index.html?isNewUser=false&__nextLocale=en-US&czyExpClientGoogleH5=disabled&czyExpClientSuppressFirstDayPreroll_CZY_20818=disabled&czyExpClientAdsDummyAA=enabled&czyExpClientAdsDummyAA50=enabled&czyExpClientVastVideoCache=local_cache_prebid_url&czyExpClientAdsConsentGate2=disabled&czyExpClientAdsIdentity=disabled&czyExpClientLiveIntent=enabled&czyExpClientAmazonBidRoute=prebid&czyExpClientBidBasedPriceFloor_CZY_21335=highest&czyExpClientContentSignals=enabled&czyExpDisableInterstitialsFirst12h_CZY_18471=disabled&czyExpGamePageReco_CZY_19213=disabled&czyExpOfflineMode=enabled&czyExpClientUnityMax1024Wasm_CZY_21177=disabled&czyExpClientUniformLoading_CZY_19437=enabled&czyExpClientFullscreenMobileRendering_CZY_20866=enabled&czyExpClientNoRewardedSurvey=mandatory&czyExpClientArtworkAbTesting_CZY_20701=disabled&czyExpClientDomainProbe_CZY_21425=enabled&czyExpClientModel=V9_cluster_registered_7d&czyExpClientModelRecommended=V9_cluster_registered_7d&czyExpClientModelGamePage=knn_v3',
  description: 'Idle crafting and tycoon management game about building a crafting empire.',
  tags: ['Idle', 'Crafting', 'Tycoon', 'Management', 'Casual'],
  provider: 'CrazyGames'
},

{
  id: 'bloxd-io',
  name: 'Bloxd.io',
  category: 'Simulation',
  subcategory: 'Sandbox Multiplayer',
  thumbnail: 'bloxd-io.jpg',
  embedUrl: 'https://bloxd.io/',
  description: 'Free browser voxel sandbox with building, minigames, and multiplayer worlds.',
  tags: ['Voxel', 'Sandbox', 'Multiplayer', '3D', 'Building'],
  provider: 'Official site'
}
];

async function getBestImage(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
      },
    });

    if (!res.ok) return null;

    const html = await res.text();
    const $ = cheerio.load(html);

    // 1. Prefer Open Graph image
    const og =
      $('meta[property="og:image"]').attr('content') ||
      $('meta[property="og:image:secure_url"]').attr('content');

    // 2. Fallback to Twitter image
    const twitter =
      $('meta[name="twitter:image"]').attr('content') ||
      $('meta[property="twitter:image"]').attr('content');

    // 3. Fallback to first large-looking image in the page
    let pageImg = null;
    $('img').each((i, el) => {
      const src = $(el).attr('src') || '';
      if (
        !pageImg &&
        src &&
        !src.includes('icon') &&
        !src.includes('logo') &&
        (src.includes('cover') ||
          src.includes('banner') ||
          src.includes('screenshot') ||
          src.endsWith('.jpg') ||
          src.endsWith('.png'))
      ) {
        pageImg = src;
      }
    });

    const img = og || twitter || pageImg;
    if (!img) return null;

    // Make relative URLs absolute
    return new URL(img, url).href;
  } catch (e) {
    return null;
  }
}

async function main() {
  const enriched = [];

  for (const game of games) {
    const realThumb = await getBestImage(game.embedUrl);

    enriched.push({
      ...game,
      thumbnail: realThumb || game.thumbnail, // fallback only if nothing found
    });

    console.log(`${game.name}: ${realThumb || 'NO IMAGE FOUND'}`);
  }

  require('fs').writeFileSync(
    'games-with-real-thumbnails.json',
    JSON.stringify(enriched, null, 2)
  );

  console.log('\nSaved to games-with-real-thumbnails.json');
}

main();