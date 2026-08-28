/*
  THE COMPLETE ENCYCLOPEDIA OF WORLD CIVILIZATIONS
  Shared interactive JavaScript:
    1. Key-term highlighting with hover/click tooltip definitions
    2. Interactive flashcards for timeline dates (click to flip)
    3. Region + period filtering on hub pages
    4. Lightbox for the image gallery
*/

/* ==========================================================
   1. KEY-TERM TOOLTIPS
   Every <span class="term"> in the HTML is a key term.
   Definitions live in the TERMS dictionary below. Each entry
   is written by hand from the cited research — see the Sources
   sections on each page. No term is left undefined.
   ========================================================== */

var TERMS = {
  /* ---- Mesoamerica: Aztec ---- */
  "Tenochtitlan": "Tenochtitlan was the capital of the Aztec (Mexica) Empire, founded in 1325 on an island in Lake Texcoco in the Valley of Mexico. At its height it held some 200,000–300,000 people, making it one of the largest cities in the world at the time. It was largely destroyed by the Spanish in 1521 and today lies beneath modern Mexico City.",
  "Texcoco": "Lake Texcoco was the great central lake of the Valley of Mexico. Tenochtitlan stood on an island within it. The Aztecs built chinampas (floating gardens), canals and causeways to farm and move around the lake.",
  "altépetl": "Altépetl (Nahuatl: 'water-mountain') was the term for a city-state or local polity in central Mexico. Each altépetl had its own ruler (tlatoani) and territory; dozens of them competed for power in the Valley of Mexico before Aztec dominance.",
  "tlatoani": "Tlatoani (Nahuatl: 'he who speaks') was the title of the ruler of an Aztec city-state. The ruler of Tenochtitlan became the Huey Tlatoani, the 'great speaker' or supreme emperor of the Aztec Empire.",
  "Huey Tlatoani": "Huey Tlatoani means 'Great Speaker' and was the title of the supreme Aztec emperor seated at Tenochtitlan. Famous Huey Tlatoque include Motecuhzoma II and Cuauhtemoc.",
  "huey tlatoque": "Huey tlatoque is the plural form of Huey Tlatoani, the supreme emperors of the Aztec Empire. The line of Mexican rulers ran from Acamapichtli (1376–1395) to Cuauhtemoc (1520–1521).",
  "Motecuhzoma II": "Motecuhzoma II (also spelled Montezuma, reigned 1502–1520) was the ninth Huey Tlatoani of Tenochtitlan. He ruled at the height of the Aztec Empire and was the emperor whom Hernán Cortés encountered in 1519. He died during the Spanish occupation of the city.",
  "Montezuma": "Montezuma is the common anglicized spelling of Motecuhzoma II, the Aztec emperor who ruled from 1502 to 1520 and faced the Spanish invasion led by Hernán Cortés.",
  "Cuauhtemoc": "Cuauhtemoc (reigned 1520–1521) was the last Aztec Huey Tlatoani. He led the defence of Tenochtitlan against Cortés and was captured on 13 August 1521, then later executed by the Spanish in 1525.",
  "Acamapichtli": "Acamapichtli (reigned c. 1376–1395) was the first tlatoani ('speaker') of Tenochtitlan. Chosen by the Mexica nobles after the city's founding, he was half-Culhua and helped legitimise the new ruling line by marrying into the noble families of the valley.",
  "Huitzilihuitl": "Huitzilihuitl (reigned c. 1396–1417) was the second tlatoani of Tenochtitlan. His reign was marked by diplomacy with the powerful Tepanec state of Azcapotzalco and by marriage alliances that brought weaving and cacao tribute to the Mexica.",
  "Chimalpopoca": "Chimalpopoca (reigned c. 1417–1427) was the third tlatoani of Tenochtitlan. A loyal vassal of the Tepanec ruler Tezozomoc, his death in a dynastic crisis helped provoke the Mexica revolt that led to Aztec independence.",
  "Itzcoatl": "Itzcoatl (reigned 1427–1440) was the fourth tlatoani of Tenochtitlan and one of the empire's true founders. He allied with Texcoco and Tlacopan to crush the Tepanecs in 1428, forming the Triple Alliance, and sponsored a sweeping rewriting of Mexica history.",
  "Motecuhzoma I": "Motecuhzoma I Ilhuicamina (reigned 1440–1469) was the fifth tlatoani, the grandson of Itzcoatl's line and one of the greatest Aztec conquerors. He greatly expanded the empire and built a major stone aqueduct to bring fresh water to Tenochtitlan.",
  "Axayacatl": "Axayacatl (reigned 1469–1481) was the sixth tlatoani of Tenochtitlan, son of a princess and grandson of Motecuhzoma I. He conquered the rival city of Tlatelolco in 1473 and fought the mighty Tarascans to the west.",
  "Tizoc": "Tizoc (reigned 1481–1486) was the seventh tlatoani of Tenochtitlan. His short reign saw few conquests, and he is chiefly remembered today for the great carved sacrificial stone, the Stone of Tizoc, that bears his name.",
  "Ahuitzotl": "Ahuitzotl (reigned 1486–1502) was the eighth and one of the most feared and expansionist tlatoque of Tenochtitlan. He rededicated the Templo Mayor in 1487, extended the empire deep into Oaxaca, and built a second great aqueduct. He was the uncle of Motecuhzoma II.",
  "Nezahualcoyotl": "Nezahualcoyotl (1402–1472, literally 'Hungry Coyote' or 'Fasting Coyote') was the philosopher-king of Texcoco and a supreme figure of the Aztec Triple Alliance. Exiled in his youth, he regained his throne by 1431, built great engineering works and palaces, composed poetry, and brought a humanistic law to his city.",
  "tlacaelel": "Tlacaelel (1397–1487) was the supreme advisor (cihuacoatl) of four Tenochtitlan tlatoque and the ideological engine of the Aztec empire. He is credited with reshaping Mexica religion to elevate Huitzilopochtli and with institutionalising the Flower Wars and the doctrine of mass sacrifice.",
  "Coronation War": "The Coronation War was an Aztec practice in which each new tlatoani had to lead a war to capture prisoners for his coronation sacrifice. It both legitimised the new ruler and kept the imperial army constantly active.",
  "Acolhua": "The Acolhua were the Nahua people who lived on the eastern shores of Lake Texcoco, with their capital at Texcoco. Under Nezahualcoyotl they were equal partners in the Aztec Triple Alliance.",
  "Tepanec": "The Tepanecs were a powerful Nahua people of the western Valley of Mexico, ruled from their capital at Azcapotzalco. They dominated the valley for much of the 14th-15th century before being crushed by the Triple Alliance in 1428.",
  "Azcapotzalco": "Azcapotzalco was the capital of the Tepanec empire in the west of the Valley of Mexico. Long the dominant power over the Mexica, it was defeated by the Triple Alliance in the Tepanec War of 1428.",
  "Tepanec War": "The Tepanec War (1428) was the decisive conflict in which the city-states of Tenochtitlan, Texcoco and Tlacopan united to overthrow the Tepanec empire of Azcapotzalco, giving birth to the Aztec Triple Alliance.",
  "Culhua": "The Culhua (or Culhuacan) were a Nahua people of the southern Valley of Mexico who, as descendants of the old Toltec civilisation, were regarded as the most cultured and prestigious of the valley peoples. The Mexica claimed descent from them to legitimise their own rule.",
  "cihuacoatl": "The cihuacoatl ('snake woman') was the supreme advisor and co-ruler to the Aztec tlatoani, effectively the second-highest office in Tenochtitlan. Tlacaelel held this office through four reigns.",
  "Tlatelolco": "Tlatelolco was a great sister-city of Tenochtitlan on the same lake island, famous as the largest marketplace in the Aztec world. It was conquered and absorbed by Tenochtitlan under Axayacatl in 1473.",
  "Tarascans": "The Tarascans (Purépecha) were an independent empire to the west of the Aztecs in modern Michoacán. Their armies repeatedly stopped Aztec expansion, and their frontier remained the one major place the Aztecs could not conquer.",
  "Chapultepec": "Chapultepec ('Grasshopper Hill') was a forested hill west of Tenochtitlan, the site of the main freshwater springs. Aztec rulers built gardens and palaces there and brought its water to the capital by aqueduct.",
  "coyote": "The coyote was a symbol of cunning and resilience in Nahuatl thought. Nezahualiztl a name meaning 'Coyote' was chosen to reflect his cunning survival during his years of exile.",
  "Cortes": "Hernán Cortés (1485–1547) was the Spanish conquistador who led the expedition that conquered the Aztec Empire between 1519 and 1521, with the help of thousands of indigenous allies.",
  "Hernan Cortes": "Hernán Cortés (1485–1547) was the Spanish conquistador who overthrew the Aztec Empire. He was the governor of New Spain until 1526.",
  "Mexico": "Mexico as a name comes from the Mexica, the Nahuatl-speaking people who founded Tenochtitlan. The modern country takes its name from them.",
  "Mexica": "The Mexica were the Nahuatl-speaking people who founded Tenochtitlan in 1325 and built the Aztec Empire. The name 'Aztec' is a later, broader term for the Mexica and their allies.",
  "Nahuatl": "Nahuatl is the Uto-Aztecan language spoken by the Aztecs. It is still spoken by over a million people in Mexico today. Many English words come from it — avocado, chocolate, tomato, coyote.",
  "Aztlan": "Aztlan ('Place of the White Herons') was the legendary homeland of the Mexica, located somewhere to the north-west. The Mexica migration from Aztlan to the Valley of Mexico is told in the founding myth of Tenochtitlan.",
  "Huitzilopochtli": "Huitzilopochtli ('Left-handed Hummingbird') was the Aztec god of war and the sun, and the patron god of the Mexica. His temple stood atop the Templo Mayor in Tenochtitlan.",
  "Tlaloc": "Tlaloc was the Aztec god of rain, thunder and fertility. He shared the double temple on top of the Templo Mayor with Huitzilopochtli.",
  "Quetzalcoatl": "Quetzalcoatl ('Feathered Serpent') was an ancient Mesoamerican god of wind, knowledge, creation and the planet Venus. He was worshipped across many cultures, including the Aztecs, long before Tenochtitlan existed.",
  "Tezcatlipoca": "Tezcatlipoca ('Smoking Mirror') was a major Aztec god of the night sky, sorcery, fate and the underworld — a dark counterpart to Quetzalcoatl.",
  "Xipe Totec": "Xipe Totec ('Our Lord the Flayed One') was the Aztec god of spring, agriculture and renewal, associated with the vernal sowing and the new year.",
  "Xiuhtecuhtli": "Xiuhtecuhtli was the Aztec god of fire, heat and time. His turquoise mosaic mask is one of the most famous surviving Aztec artworks.",
  "Xochipilli": "Xochipilli ('Flower Prince') was the Aztec god of flowers, summertime, music, dance and pleasure.",
  "Ometeotl": "Ometeotl was the Aztec high god, the 'Lord of Duality' — the creator deity who combined male and female principles.",
  "Mictlantecuhtli": "Mictlantecuhtli was the Aztec god of the dead, ruling over Mictlan, the underworld. He appears in the famous Codex Borgia.",
  "Coatlicue": "Coatlicue ('She of the Serpent Skirt') was the Aztec earth-mother goddess, mother of Huitzilopochtli. A colossal statue of her survives and is in the National Museum of Anthropology in Mexico City.",
  "chi": "The Chinese word 'qi' (also spelled chi) is the vital energy or life force believed to flow through all living things in traditional Chinese thought; the same concept appears in Aztec thought as 'teotl.'",
  "Templo Mayor": "The Templo Mayor was the great double pyramid at the heart of Tenochtitlan. Twin shrines on the summit honoured Huitzilopochtli (war/sun) and Tlaloc (rain). Its ruins are today in the centre of Mexico City.",
  "chinampa": "Chinampas were Aztec 'floating gardens' — long, narrow, artificial islands built in the shallow lakes of the Valley of Mexico to grow maize, beans, squash and flowers. They were one of the most productive farming systems of the ancient world.",
  "castell": "From Spanish 'castillo' — a castle. The Spaniards misnamed the Templo Mayor, and by extension many Mesoamerican pyramids, 'castles.'",
  "chimalli": "Chimalli was the Nahuatl word for a shield, carried by Aztec warriors. High-status warriors also wore elaborate feathered back-displays (e.g. the 'tlahuiztli').",
  "macuahuitl": "The macuahuitl was an Aztec melee weapon: a flat wooden club edged with razor-sharp obsidian blades. It could sever a horse's head. It was the standard weapon of elite Aztec warriors.",
  "atlatl": "The atlatl was a spear-thrower (a wooden launching rod) used by Aztec warriors and many Mesoamerican cultures to hurl darts with great force and accuracy.",
  "tlahuiztli": "Tlahuiztli was a highly decorated Aztec warrior costume, often representing a specific animal or god, worn by elite Eagle and Jaguar warriors to mark their rank.",
  "Eagle warriors": "Eagle Warriors were an elite Aztec military order who wore eagle costumes. They were a key force in the Aztec army's power and were famed for their bravery.",
  "Jaguar warriors": "Jaguar Warriors were an elite Aztec military order who wore jaguar skins. Alongside the Eagle Warriors, they formed the shock troops of the Aztec empire.",
  "eagle on a cactus": "The eagle perched on a cactus is the central symbol of the Aztec founding myth. According to the legend, Huitzilopochtli told the Mexica to build their city where they saw an eagle eating a snake on a prickly pear cactus. That image today is the national emblem of Mexico.",
  "cactus": "The prickly pear cactus (nopal) is the plant on which, in the founding myth of Tenochtitlan, the eagle alighted. The image of an eagle on a cactus, eating a snake, forms the centre of the Mexican flag.",
  "cactus serpent eagle": "The eagle, cactus and serpent form the sign that, according to Aztec myth, marked the site of Tenochtitlan. It is now the central motif of the Mexican flag (still used today).",
  "Flowery Wars": "The 'Flower Wars' were ceremonial conflicts fought between the Aztecs and their enemies (especially Tlaxcala) for the specific purpose of capturing prisoners for sacrifice, rather than for conquest. They were also a way of testing warriors.",
  "Tlaxcala": "Tlaxcala was a powerful confederation of independent city-states east of the Aztec Empire that never submitted to Aztec rule. The Tlaxcalans allied with Hernán Cortés and were crucial to the Spanish conquest of Tenochtitlan in 1521.",
  "sacrifice": "Human sacrifice was a central part of Aztec religion: the people believed the gods needed 'blood, the precious water' to keep the sun moving and the world in balance. Victims, usually prisoners of war, had their hearts removed or were otherwise ritually offered.",
  "Cholula": "Cholula was a major city in central Mexico famous for its enormous pyramid (the Great Pyramid of Cholula, the largest monument by volume in the world) and for its finely painted 'Cholula ware' pottery.",
  "Coatlicue statue": "The colossal statue of the goddess Coatlicue, found beneath Mexico City, is one of the greatest surviving Aztec sculptures. It depicts a fearsome mother-goddess with a skirt of serpents and a head of two fanged serpents.",
  "Sun Stone": "The Sun Stone (the 'Aztec Calendar Stone') is a massive carved basalt disc, 3.6 metres across, that presents the Aztec cosmological cycles — the five suns (eras of creation), the 260-day ritual calendar and the 365-day solar calendar. It is in the National Museum of Anthropology.",
  "Stone of Tizoc": "The Stone of Tizoc is a carved Aztec monument depicting the victories of the emperor Tizoc (ruled 1481–1486). It is a large cylindrical sacrificial stone.",
  "Throne of Motecuhzoma II": "The throne of Motecuhzoma II is a finely carved stone seat decorated with the emperor's name glyph, symbolising his authority and the cosmic right of the tlatoani to rule.",
  "coatepec": "Coatepec ('Snake Mountain') was a sacred mountain in Aztec mythology where, in one story, Huitzilopochtli was born and defeated his jealous siblings. The Templo Mayor was meant to represent it.",
  "Mexico City": "Mexico City, the capital of modern Mexico, was built directly on the ruins of Tenochtitlan after the Spanish conquest of 1521. Its historic centre sits over the Aztec capital.",
  "Cuitlahuac": "Cuitlahuac was the Aztec tlatoani who briefly succeeded Motecuhzoma II in 1520 and died of smallpox — one of the first major outbreaks of European disease in the Americas.",
  "Noche Triste": "The 'Noche Triste' ('Sad Night') of 30 June 1520 was the night Cortés and his forces fled Tenochtitlan after a disastrous retreat, losing hundreds of Spanish soldiers and thousands of allies.",
  "Triple Alliance": "The Triple Alliance (1428) was the political union of Tenochtitlan, Texcoco and Tlacopan that became the core of the Aztec Empire. Over time Tenochtitlan came to dominate it.",
  "Tlacopan": "Tlacopan was one of the three cities of the Aztec Triple Alliance, alongside Tenochtitlan and Texcoco. It was a junior partner in the alliance.",
  "Mesoamerica": "Mesoamerica is the cultural region of central and southern Mexico and Central America where the Olmec, Maya, Teotihuacan, Toltec, Zapotec and Aztec civilizations developed, sharing common features such as the calendar, ballgame, and maize agriculture.",
  "Olmec": "The Olmec (c. 1500–400 BC) were the earliest great civilization of Mesoamerica, known for their colossal stone heads and the groundwork for later Mesoamerican cultures. They are often called the 'mother culture'.",
  "Maya": "The Maya were a great Mesoamerican civilization (c. 2000 BC–AD 1500) of southeastern Mexico, Guatemala, Belize, Honduras and El Salvador, famous for their writing system, mathematics, calendar, astronomy, cities such as Tikal and Chichen Itza, and stunning art and architecture.",
  "Inca": "The Inca were the largest empire in pre-Columbian America, centred at Cuzco in Peru and stretching along the Andes from Ecuador to Chile. They built Machu Picchu, a vast road system (Qhapaq Nan), and brilliant stone masonry, and were conquered by Francisco Pizarro in the 1530s.",
  "Teotihuacan": "Teotihuacan was a huge ancient city in Mexico (c. 100 BC–AD 650), the largest city in the Americas before the Aztec era, famed for its Avenue of the Dead and the Pyramid of the Sun.",
  "Tarascan": "The Tarascan (Purépecha) civilization of western Mexico was one of the few states that successfully resisted Aztec conquest, which is why it sometimes appears as a hostile neighbour on the empire's western frontier.",
  "Pizarro": "Francisco Pizarro (c. 1475–1541) was the Spanish conquistador who conquered the Inca Empire in the 1530s, establishing the Spanish colony of Peru.",
  "Tenochtitlan conquest": "The fall of Tenochtitlan in 1521 was the decisive event of the Aztec Empire's destruction, brought about by a combination of Spanish steel, guns, horses, siege tactics, ally armies, and Native-European diseases (especially smallpox).",
  "New Spain": "New Spain was the Spanish colonial territory established after the conquest of the Aztec Empire. Its capital was Mexico City, built on the ruins of Tenochtitlan.",
  "conquistador": "Conquistador ('conqueror' in Spanish) refers to the Spanish soldiers, adventurers and explorers who conquered much of the Americas in the 16th century — including Cortés in Mexico and Pizarro in Peru.",
  "Quetzalcoatl legend": "A famous (but now largely discredited) story says that the Aztecs mistook Cortés for the returning god Quetzalcoatl. Most historians believe this story was invented later by the Spanish to explain their easy victory; the real causes were disease, siege and indigenous alliance.",
  "Aztlan legend": "Aztlan was the ancestral homeland in Aztec myth. The Mexica's great migration from there to Lake Texcoco, guided by Huitzilopochtli, is the founding story of Tenochtitlan and of the Aztec people.",
  "obsidian": "Obsidian is natural volcanic glass, which the Aztecs and other Mesoamerican peoples used to make razor-sharp knives, mirrors, blades and weapons such as the macuahuitl.",
  "cacao": "Cacao (from the Nahuatl 'cacahuatl') was an Aztec drink — a bitter chocolate beverage flavoured with chilli and vanilla. The beans were also used as a form of currency.",
  "tortilla": "Tortilla is a flat maize- or flour-based bread, originally made from nixtamalized maize. It was a staple of Aztec and Mesoamerican daily food, eaten with beans and chilli.",
  "nixtamalization": "Nixtamalization is the process of soaking and cooking maize in lime in water to make it more nutritious and easy to grind. It was invented by Mesoamerican peoples and is still used to make tortillas and masa today.",
  "maize": "Maize (corn) was the central crop of Mesoamerican civilization. It was domesticated in Mexico thousands of years ago and was the staple of the Aztec diet. Many Aztec myths centre on maize, including the story of the Hero Twins.",
  "beans": "Beans were a key component of the Mesoamerican diet alongside maize and squash. The Aztec people grew beans in chinampas and fields.",
  "squash": "Squash was one of the three 'sisters' of Mesoamerican agriculture (maize, beans, squash). It provided nutritious food and its leaves shaded the maize roots.",
  "chile": "Chile (chilli) was an essential Aztec seasoning, added to almost everything, including the chocolate drink. The Aztecs recognised dozens of varieties.",
  "amaranth": "Amaranth was an Aztec grain crop high in protein, used for food and in religious rituals. The Spanish, seeing its ritual use, later banned its cultivation, but it is grown again today.",
  "Turquoise": "Turquoise was a precious stone highly prized by the Aztecs, used in mosaic masks and ornaments. Its colour was associated with water and the heavens.",
  "codices": "The Aztec codices were painted books (folded bark-paper or deerskin) that recorded history, tribute, calendars, rituals and genealogies. Very few survive; most were destroyed by the Spanish.",
  "Aztec calendar": "The Aztec calendar had two interlocking cycles — a 260-day ritual cycle and a 365-day solar year. Together they produced a 52-year 'calendar round'.",
  "260-day calendar": "The tonalpohualli ('count of days') was the 260-day Aztec ritual calendar, divided into 20 'weeks' of 13 days. It was used to divine fortunes and set the timing of ceremonies.",
  "solar calendar": "The Aztec solar year (xiuhpohualli) had 18 months of 20 days, plus 5 'unlucky' leftover days (nemontemi). It governed agriculture and the annual festival cycle.",
  "52-year cycle": "The 52-year cycle (calendar round) was the period after which the 260-day ritual calendar and the 365-day solar calendar returned to the same starting point. At the end of each cycle, the Aztecs held the high ceremony of the New Fire.",
  "New Fire Ceremony": "The New Fire Ceremony was held once every 52 years, at the close of the Aztec calendar round. All fires were extinguished, and a new fire was kindled on a mountain top; if it failed, the world was thought to end.",
  "olamaliztli": "Olamaliztli was the Nahuatl name for the Mesoamerican ballgame, played with a rubber ball in a stone court. The game had deep ritual significance for the Aztecs and other Mesoamerican peoples.",
  "Codex Borgia": "The Codex Borgia is one of the few surviving pre-Columbian Aztec ritual codices, containing divinatory tables, depictions of gods and ceremonies.",
  "Calendar Stone": "The 'Aztec Calendar Stone' (the Sun Stone) is a 24-tonne carved disc that shows Aztec cosmology. It was buried beneath the Zócalo in Mexico City and excavated in 1790.",
  "Templo Mayor excavation": "The excavation of the Templo Mayor, begun in 1978 after workers struck the giant Coyolxauhqui relief, has uncovered thousands of Aztec objects under the centre of modern Mexico City.",
  "Coyolxauhqui": "Coyolxauhqui ('Golden Bells') was the Aztec goddess of the moon, killed and dismembered by her brother Huitzilopochtli. A famous carved stone of her body was found at the Templo Mayor in 1978.",
  "Aztec art": "Aztec art is eclectic and monumental — from turquoise mosaics and gold ornaments to colossal stone reliefs. A great deal of it expressed religion, imperial power and cosmology.",
  "Aztec empire": "The Aztec Empire (c. 1345–1521) controlled most of central Mexico by the early 1500s, covering some 135,000 square kilometres and ruling around 5–11 million people. It fell to Spain in 1521.",
  "Valley of Mexico": "The Valley of Mexico is the highland basin where Tenochtitlan and the Aztec Empire rose. It was originally a large lake system, drained over the centuries after the Spanish conquest.",
  "Persia": "Persia (the Achaemenid Empire, c. 550–330 BC) was the largest empire of the ancient world at its height, founded by Cyrus the Great, built by Darius I and Xerxes. Its capital was Persepolis.",
  "Mesopotamia": "Mesopotamia ('the land between the rivers' — the Tigris and Euphrates) in modern Iraq is often called the 'cradle of civilization'. The Sumerians, Akkadians, Babylonians and Assyrians all arose there, inventing writing, the wheel, law codes and cities.",
  "Babylon": "Babylon was a great ancient city in Mesopotamia, especially famous under Hammurabi (who issued the famous law code) and Nebuchadnezzar II (who built the legendary Hanging Gardens).",
  "Assyria": "Assyria was a mighty Mesopotamian empire (c. 2500–609 BC), based around the cities of Ashur and Nineveh, famed for its military, iron weapons, and siege warfare. It fell in 609 BC to the Babylonians and Medes.",
  "Sumer": "Sumer was the earliest civilization of Mesopotamia (c. 4500–1900 BC), in southern Iraq. The Sumerians invented cuneiform writing, the wheel, irrigation, mathematics and urban life.",
  "Egypt": "Ancient Egypt was one of the greatest civilizations of the ancient world, on the Nile, lasting some 3,000 years (c. 3100 BC–AD 30). It is famed for the pyramids, the great pharaohs, hieroglyphs and its monumental architecture.",
  "Indus Valley": "The Indus Valley (Harappan) Civilization (c. 2500–1900 BC), in modern Pakistan and north-west India, was one of the world's earliest urban societies, known for the planned cities of Mohenjo-daro and Harappa, drainage, seals and a not-yet-deciphered writing system.",
  "China": "China is one of the world's oldest civilizations, with history stretching back 5,000+ years. Major dynasties include Shang, Zhou, Qin, Han, Tang, Song, Yuan, Ming and Qing. China invented paper, printing, gunpowder, the compass, silk and more.",
  "Shang": "The Shang Dynasty (c. 1600–1046 BC) was the first historically documented Chinese dynasty, known for bronze casting, oracle-bone divination and the city of Anyang.",
  "Zhou": "The Zhou Dynasty (1046–256 BC) founded the concept of the 'Mandate of Heaven'. It included the Spring and Autumn and Warring States periods, and the age of Confucius and Laozi.",
  "Qin": "The Qin Dynasty (221–206 BC) was the first imperial dynasty of China, founded by Qin Shi Huang, who united China, standardised writing and measures, and built the first Great Wall and the Terracotta Army.",
  "Han": "The Han Dynasty (206 BC–AD 220) was one of the greatest eras of China, famed for the Silk Road, paper, the Han culture and a long civil service. The name 'Han' still refers to the majority ethnic group in China.",
  "Tang": "The Tang Dynasty (AD 618–907) was a golden age of Chinese culture, poetry, trade and technology, with the capital at Chang'an possibly the largest city in the world at the time.",
  "Song": "The Song Dynasty (AD 960–1279) was a period of great economic and technological innovation in China — printing, gunpowder, the compass and paper money — and of the invention of movable type.",
  "Ming": "The Ming Dynasty (1368–1644) built much of the present Great Wall, the Forbidden City, and sent Admiral Zheng He's treasure fleets across the Indian Ocean. It fell to the Manchus in 1644.",
  "Korea": "Korean history is old and rich. Three Kingdoms (Goguryeo, Silla, Baekje), the Goryeo (Koryo) and Joseon dynasties are key eras. Korea invented metal movable type earlier than Europe, and the Hangul alphabet (1443).",
  "Japan": "Japan has a long history of imperial rule, samurai, and culture. Key eras: Yamato, Nara, Heian (with The Tale of Genji), Kamakura and the shogunates, and feudal Japan. Japan's isolation before 1853 shaped its unique culture.",
  "Khmer": "The Khmer Empire (c. AD 802–1431) ruled much of Southeast Asia, with its capital at Angkor. It built Angkor Wat, the largest religious monument in the world.",
  "Vikings": "The Vikings were Norse raiders, traders and explorers from Scandinavia (c. AD 793–1066). They reached Greenland and Newfoundland (Leif Erikson), raided Europe, settled Normandy and Russia, and founded the city of Dublin.",
  "Mongols": "The Mongol Empire (founded by Genghis Khan in 1206) became the largest contiguous land empire in history, stretching from the Pacific to the Danube and the Persian Gulf.",
  "Mughal": "The Mughal Empire (1526–1857) ruled most of the Indian subcontinent. Founded by Babur, its greatest emperors included Akbar and Aurangzeb; it built the Taj Mahal.",
  "Aksum": "The Kingdom of Aksum (c. AD 100–c. 900) was a powerful trading empire in modern Ethiopia and Eritrea, one of the four great powers of the ancient world along with Rome, Persia and China. It was among the first states to adopt Christianity as its official religion.",
  "Mali": "The Mali Empire (c. 1235–c. 1600) was a great West African empire, famed for Mansa Musa (perhaps the richest man in history, who went on pilgrimage to Mecca carrying huge gold) and for the learning centre at Timbuktu.",
  "Great Zimbabwe": "Great Zimbabwe (c. AD 1100–1500) was a powerful kingdom in south-eastern Africa, whose capital was a huge stone-walled city. It is the name-source of modern Zimbabwe.",
  "Songhai": "The Songhai Empire (c. 1464–1591) was a West African empire that succeeded Mali, centred on the city of Gao and the great intellectual centre of Timbuktu. It fell to the Moroccian invasion in 1591.",
  "Ghana": "The Kingdom of Ghana (Wagadu, c. 300–1240) was a great West African trading empire (no relation to modern Ghana) that controlled the gold-salt trade across the Sahara.",
  "Nubia": "Nubia was an ancient African kingdom along the Nile in close contact with Egypt, including the Kingdom of Kush. Its capital cities were Napata and Meroë; it gave Egypt its 'black pharaohs' (25th dynasty)."
};

/* Show a tooltip when the user hovers or taps a key term. */
(function () {
  var tip = null;

  function ensureTip() {
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'tipbox';
      document.body.appendChild(tip);
    }
    return tip;
  }

  function show(term, el) {
    var t = ensureTip();
    var def = TERMS[term];
    if (!def) {
      def = "This term is still being defined. Please consult the Sources section below or the related individual page.";
    }
    t.innerHTML = '<span class="tip-term">' + term + '</span><br>' + def;
    t.classList.add('term-show');
    var rect = el.getBoundingClientRect();
    var width = t.offsetWidth;
    var height = t.offsetHeight;
    var left = rect.left + (rect.width / 2) - (width / 2);
    var top = rect.top - height - 12;
    if (top < 8) top = rect.bottom + 12;
    if (left < 8) left = 8;
    if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8;
    t.style.left = left + 'px';
    t.style.top = top + 'px';
  }

  function hide() {
    if (tip) tip.classList.remove('term-show');
  }

  document.addEventListener('click', function (e) {
    var termEl = e.target.closest ? e.target.closest('.term') : null;
    if (termEl) {
      e.preventDefault();
      show(termEl.getAttribute('data-term') || termEl.textContent.trim(), termEl);
      return;
    }
    if (tip && !tip.contains(e.target)) hide();
  });

  document.addEventListener('mouseover', function (e) {
    var termEl = e.target.closest ? e.target.closest('.term') : null;
    if (termEl) {
      show(termEl.getAttribute('data-term') || termEl.textContent.trim(), termEl);
    }
  });

  document.addEventListener('mouseout', function (e) {
    var termEl = e.target.closest ? e.target.closest('.term') : null;
    if (termEl) hide();
  });

  window.addEventListener('scroll', hide, true);
  window.addEventListener('resize', hide);
})();

/* ==========================================================
   2. INTERACTIVE FLASHCARDS (timeline dates)
   Each .flashcard flips on click to reveal a 200-500 word
   explanation on the back. The back text is authored from the
   cited research on each page.
   ========================================================== */

document.addEventListener('click', function (e) {
  var card = e.target.closest ? e.target.closest('.flashcard') : null;
  if (card) {
    card.classList.toggle('flipped');
  }
});

/* ==========================================================
   3. REGION + PERIOD FILTERING (hub pages)
   Elements with data-region / data-period are filtered by the
   buttons with matching data-filter attributes.
   ========================================================== */

(function () {
  var hub = document.getElementById('hub-filters');
  if (!hub) return;

  var regionBtns = hub.querySelectorAll('[data-region-filter]');
  var periodBtns = hub.querySelectorAll('[data-period-filter]');
  var items = document.querySelectorAll('[data-region][data-period]');
  var activeRegion = 'all';
  var activePeriod = 'all';

  function apply() {
    items.forEach(function (item) {
      var r = item.getAttribute('data-region');
      var p = item.getAttribute('data-period');
      var okR = (activeRegion === 'all') || (r === activeRegion);
      var okP = (activePeriod === 'all') || (p === activePeriod);
      item.style.display = (okR && okP) ? '' : 'none';
    });
  }

  regionBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      activeRegion = btn.getAttribute('data-region-filter');
      regionBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      apply();
    });
  });

  periodBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      activePeriod = btn.getAttribute('data-period-filter');
      periodBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      apply();
    });
  });
})();

/* ==========================================================
   4. LIGHTBOX for the image gallery
   Any <a class="lightbox" href="full-image-url"> opening an
   image shows it full-screen.
   ========================================================== */

(function () {
  var overlay = null;
  var img = null;

  function ensureOverlay() {
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'lightbox-overlay';
      img = document.createElement('img');
      overlay.appendChild(img);
      overlay.addEventListener('click', close);
      document.body.appendChild(overlay);
    }
  }

  function open(src) {
    ensureOverlay();
    img.src = src;
    overlay.classList.add('open');
  }

  function close() {
    if (overlay) overlay.classList.remove('open');
  }

  document.addEventListener('click', function (e) {
    var lb = e.target.closest ? e.target.closest('a.lightbox') : null;
    if (lb && lb.href) {
      e.preventDefault();
      open(lb.href);
      return;
    }
    if (overlay && e.target !== img) close();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') close();
  });
})();
