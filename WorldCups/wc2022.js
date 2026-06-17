// ============================================================================
// FIFA WORLD CUP 2022 (QATAR) — COMPLETE VERIFIED HISTORICAL DATASET
// Source-checked: ESPN, FIFA.com, Olympics.com, Goal.com, Al Jazeera, Sky Sports
// Tournament dates: Nov 20 - Dec 18, 2022. Host: Qatar. Winner: Argentina.
// This data is real and final — the tournament is over, nothing here is live.
// ============================================================================

const WC2022 = {
  meta: {
    year: 2022,
    host: "Qatar",
    dates: "November 20 – December 18, 2022",
    teams: 32,
    groups: 8,
    matches: 64,
    champion: "Argentina",
    runnerUp: "France",
    third: "Croatia",
    fourth: "Morocco",
  },

  awards: [
    { award: "Golden Ball (Best Player)", winner: "Lionel Messi", country: "Argentina", detail: "7 goals, 3 assists — first player to score in every round of a World Cup" },
    { award: "Silver Ball", winner: "Kylian Mbappé", country: "France", detail: "8 goals, 2 assists" },
    { award: "Bronze Ball", winner: "Luka Modrić", country: "Croatia", detail: "Midfield engine of Croatia's run to third place" },
    { award: "Golden Boot (Top Scorer)", winner: "Kylian Mbappé", country: "France", detail: "8 goals — including a hat-trick in the final, the first since Geoff Hurst in 1966" },
    { award: "Silver Boot", winner: "Lionel Messi", country: "Argentina", detail: "7 goals, 3 assists" },
    { award: "Bronze Boot", winner: "Olivier Giroud", country: "France", detail: "4 goals — became France's all-time top scorer during the tournament" },
    { award: "Golden Glove (Best Goalkeeper)", winner: "Emiliano Martínez", country: "Argentina", detail: "Saved a penalty in the final shootout and a late chance from Kolo Muani in extra time" },
    { award: "Young Player Award", winner: "Enzo Fernández", country: "Argentina", detail: "Breakout midfielder, started after coming off the bench in the group stage" },
    { award: "FIFA Fair Play Award", winner: "England", country: "England", detail: "Best disciplinary record of the tournament" },
  ],

  // Group stage — every team and final standings (P=played, W=win, D=draw, L=loss, GF=goals for, GA=goals against, GD=goal diff, Pts=points)
  groups: {
    A: {
      teams: [
        { team: "Netherlands", P: 3, W: 2, D: 1, L: 0, GF: 4, GA: 1, GD: 3, Pts: 7, result: "Advanced (1st)" },
        { team: "Senegal", P: 3, W: 2, D: 0, L: 1, GF: 5, GA: 3, GD: 2, Pts: 6, result: "Advanced (2nd)" },
        { team: "Ecuador", P: 3, W: 1, D: 1, L: 1, GF: 4, GA: 3, GD: 1, Pts: 4, result: "Eliminated (3rd)" },
        { team: "Qatar", P: 3, W: 0, D: 0, L: 3, GF: 1, GA: 7, GD: -6, Pts: 0, result: "Eliminated (4th, host)" },
      ],
    },
    B: {
      teams: [
        { team: "England", P: 3, W: 2, D: 1, L: 0, GF: 9, GA: 2, GD: 7, Pts: 7, result: "Advanced (1st)" },
        { team: "United States", P: 3, W: 1, D: 2, L: 0, GF: 2, GA: 1, GD: 1, Pts: 5, result: "Advanced (2nd)" },
        { team: "Iran", P: 3, W: 1, D: 0, L: 2, GF: 4, GA: 7, GD: -3, Pts: 3, result: "Eliminated (3rd)" },
        { team: "Wales", P: 3, W: 0, D: 1, L: 2, GF: 1, GA: 6, GD: -5, Pts: 1, result: "Eliminated (4th)" },
      ],
    },
    C: {
      teams: [
        { team: "Argentina", P: 3, W: 2, D: 0, L: 1, GF: 5, GA: 2, GD: 3, Pts: 6, result: "Advanced (1st)" },
        { team: "Poland", P: 3, W: 1, D: 1, L: 1, GF: 2, GA: 2, GD: 0, Pts: 4, result: "Advanced (2nd)" },
        { team: "Mexico", P: 3, W: 1, D: 1, L: 1, GF: 2, GA: 3, GD: -1, Pts: 4, result: "Eliminated (3rd)" },
        { team: "Saudi Arabia", P: 3, W: 1, D: 0, L: 2, GF: 3, GA: 5, GD: -2, Pts: 3, result: "Eliminated (4th)" },
      ],
    },
    D: {
      teams: [
        { team: "France", P: 3, W: 2, D: 0, L: 1, GF: 6, GA: 3, GD: 3, Pts: 6, result: "Advanced (1st)" },
        { team: "Australia", P: 3, W: 2, D: 0, L: 1, GF: 3, GA: 4, GD: -1, Pts: 6, result: "Advanced (2nd)" },
        { team: "Tunisia", P: 3, W: 1, D: 1, L: 1, GF: 1, GA: 1, GD: 0, Pts: 4, result: "Eliminated (3rd)" },
        { team: "Denmark", P: 3, W: 0, D: 1, L: 2, GF: 1, GA: 3, GD: -2, Pts: 1, result: "Eliminated (4th)" },
      ],
    },
    E: {
      teams: [
        { team: "Japan", P: 3, W: 2, D: 0, L: 1, GF: 4, GA: 3, GD: 1, Pts: 6, result: "Advanced (1st)" },
        { team: "Spain", P: 3, W: 1, D: 1, L: 1, GF: 9, GA: 3, GD: 6, Pts: 4, result: "Advanced (2nd)" },
        { team: "Germany", P: 3, W: 1, D: 1, L: 1, GF: 6, GA: 5, GD: 1, Pts: 4, result: "Eliminated (3rd)" },
        { team: "Costa Rica", P: 3, W: 1, D: 0, L: 2, GF: 3, GA: 11, GD: -8, Pts: 3, result: "Eliminated (4th)" },
      ],
    },
    F: {
      teams: [
        { team: "Morocco", P: 3, W: 2, D: 1, L: 0, GF: 4, GA: 1, GD: 3, Pts: 7, result: "Advanced (1st)" },
        { team: "Croatia", P: 3, W: 1, D: 2, L: 0, GF: 4, GA: 1, GD: 3, Pts: 5, result: "Advanced (2nd)" },
        { team: "Belgium", P: 3, W: 1, D: 1, L: 1, GF: 1, GA: 2, GD: -1, Pts: 4, result: "Eliminated (3rd)" },
        { team: "Canada", P: 3, W: 0, D: 0, L: 3, GF: 2, GA: 7, GD: -5, Pts: 0, result: "Eliminated (4th)" },
      ],
    },
    G: {
      teams: [
        { team: "Brazil", P: 3, W: 2, D: 0, L: 1, GF: 3, GA: 1, GD: 2, Pts: 6, result: "Advanced (1st)" },
        { team: "Switzerland", P: 3, W: 2, D: 0, L: 1, GF: 4, GA: 3, GD: 1, Pts: 6, result: "Advanced (2nd)" },
        { team: "Cameroon", P: 3, W: 1, D: 1, L: 1, GF: 4, GA: 4, GD: 0, Pts: 4, result: "Eliminated (3rd)" },
        { team: "Serbia", P: 3, W: 0, D: 1, L: 2, GF: 5, GA: 8, GD: -3, Pts: 1, result: "Eliminated (4th)" },
      ],
    },
    H: {
      teams: [
        { team: "Portugal", P: 3, W: 2, D: 0, L: 1, GF: 6, GA: 4, GD: 2, Pts: 6, result: "Advanced (1st)" },
        { team: "South Korea", P: 3, W: 1, D: 1, L: 1, GF: 4, GA: 4, GD: 0, Pts: 4, result: "Advanced (2nd)" },
        { team: "Uruguay", P: 3, W: 1, D: 1, L: 1, GF: 2, GA: 2, GD: 0, Pts: 4, result: "Eliminated (3rd, on goals scored)" },
        { team: "Ghana", P: 3, W: 1, D: 0, L: 2, GF: 5, GA: 7, GD: -2, Pts: 3, result: "Eliminated (4th)" },
      ],
    },
  },

  // All 64 matches — group stage + knockout, fully verified scorelines
  matches: [
    // Group A
    { stage: "Group A", date: "2022-11-20", home: "Qatar", away: "Ecuador", homeScore: 0, awayScore: 2, venue: "Al Bayt Stadium" },
    { stage: "Group A", date: "2022-11-21", home: "Senegal", away: "Netherlands", homeScore: 0, awayScore: 1, venue: "Al Thumama Stadium" },
    { stage: "Group A", date: "2022-11-25", home: "Qatar", away: "Senegal", homeScore: 1, awayScore: 3, venue: "Al Thumama Stadium" },
    { stage: "Group A", date: "2022-11-25", home: "Netherlands", away: "Ecuador", homeScore: 1, awayScore: 1, venue: "Khalifa International Stadium" },
    { stage: "Group A", date: "2022-11-29", home: "Netherlands", away: "Qatar", homeScore: 2, awayScore: 0, venue: "Al Bayt Stadium" },
    { stage: "Group A", date: "2022-11-29", home: "Ecuador", away: "Senegal", homeScore: 1, awayScore: 2, venue: "Khalifa International Stadium" },
    // Group B
    { stage: "Group B", date: "2022-11-21", home: "England", away: "Iran", homeScore: 6, awayScore: 2, venue: "Khalifa International Stadium" },
    { stage: "Group B", date: "2022-11-21", home: "United States", away: "Wales", homeScore: 1, awayScore: 1, venue: "Ahmad bin Ali Stadium" },
    { stage: "Group B", date: "2022-11-25", home: "Wales", away: "Iran", homeScore: 0, awayScore: 2, venue: "Ahmad bin Ali Stadium" },
    { stage: "Group B", date: "2022-11-25", home: "England", away: "United States", homeScore: 0, awayScore: 0, venue: "Al Bayt Stadium" },
    { stage: "Group B", date: "2022-11-29", home: "Wales", away: "England", homeScore: 0, awayScore: 3, venue: "Ahmad bin Ali Stadium" },
    { stage: "Group B", date: "2022-11-29", home: "Iran", away: "United States", homeScore: 0, awayScore: 1, venue: "Al Thumama Stadium" },
    // Group C
    { stage: "Group C", date: "2022-11-22", home: "Argentina", away: "Saudi Arabia", homeScore: 1, awayScore: 2, venue: "Lusail Stadium" },
    { stage: "Group C", date: "2022-11-22", home: "Mexico", away: "Poland", homeScore: 0, awayScore: 0, venue: "Stadium 974" },
    { stage: "Group C", date: "2022-11-26", home: "Poland", away: "Saudi Arabia", homeScore: 2, awayScore: 0, venue: "Education City Stadium" },
    { stage: "Group C", date: "2022-11-26", home: "Argentina", away: "Mexico", homeScore: 2, awayScore: 0, venue: "Lusail Stadium" },
    { stage: "Group C", date: "2022-11-30", home: "Poland", away: "Argentina", homeScore: 0, awayScore: 2, venue: "Stadium 974" },
    { stage: "Group C", date: "2022-11-30", home: "Saudi Arabia", away: "Mexico", homeScore: 1, awayScore: 2, venue: "Lusail Stadium" },
    // Group D
    { stage: "Group D", date: "2022-11-22", home: "Denmark", away: "Tunisia", homeScore: 0, awayScore: 0, venue: "Education City Stadium" },
    { stage: "Group D", date: "2022-11-22", home: "France", away: "Australia", homeScore: 4, awayScore: 1, venue: "Al Janoub Stadium" },
    { stage: "Group D", date: "2022-11-26", home: "Tunisia", away: "Australia", homeScore: 0, awayScore: 1, venue: "Al Janoub Stadium" },
    { stage: "Group D", date: "2022-11-26", home: "France", away: "Denmark", homeScore: 2, awayScore: 1, venue: "Stadium 974" },
    { stage: "Group D", date: "2022-11-30", home: "Tunisia", away: "France", homeScore: 1, awayScore: 0, venue: "Education City Stadium" },
    { stage: "Group D", date: "2022-11-30", home: "Australia", away: "Denmark", homeScore: 1, awayScore: 0, venue: "Al Janoub Stadium" },
    // Group E
    { stage: "Group E", date: "2022-11-23", home: "Germany", away: "Japan", homeScore: 1, awayScore: 2, venue: "Khalifa International Stadium" },
    { stage: "Group E", date: "2022-11-23", home: "Spain", away: "Costa Rica", homeScore: 7, awayScore: 0, venue: "Al Thumama Stadium" },
    { stage: "Group E", date: "2022-11-27", home: "Japan", away: "Costa Rica", homeScore: 0, awayScore: 1, venue: "Ahmad bin Ali Stadium" },
    { stage: "Group E", date: "2022-11-27", home: "Spain", away: "Germany", homeScore: 1, awayScore: 1, venue: "Al Bayt Stadium" },
    { stage: "Group E", date: "2022-12-01", home: "Japan", away: "Spain", homeScore: 2, awayScore: 1, venue: "Khalifa International Stadium" },
    { stage: "Group E", date: "2022-12-01", home: "Costa Rica", away: "Germany", homeScore: 2, awayScore: 4, venue: "Al Bayt Stadium" },
    // Group F
    { stage: "Group F", date: "2022-11-23", home: "Morocco", away: "Croatia", homeScore: 0, awayScore: 0, venue: "Al Bayt Stadium" },
    { stage: "Group F", date: "2022-11-23", home: "Belgium", away: "Canada", homeScore: 1, awayScore: 0, venue: "Ahmad bin Ali Stadium" },
    { stage: "Group F", date: "2022-11-27", home: "Belgium", away: "Morocco", homeScore: 0, awayScore: 2, venue: "Al Thumama Stadium" },
    { stage: "Group F", date: "2022-11-27", home: "Croatia", away: "Canada", homeScore: 4, awayScore: 1, venue: "Khalifa International Stadium" },
    { stage: "Group F", date: "2022-12-01", home: "Croatia", away: "Belgium", homeScore: 0, awayScore: 0, venue: "Ahmad bin Ali Stadium" },
    { stage: "Group F", date: "2022-12-01", home: "Canada", away: "Morocco", homeScore: 1, awayScore: 2, venue: "Al Thumama Stadium" },
    // Group G
    { stage: "Group G", date: "2022-11-24", home: "Switzerland", away: "Cameroon", homeScore: 1, awayScore: 0, venue: "Al Janoub Stadium" },
    { stage: "Group G", date: "2022-11-24", home: "Brazil", away: "Serbia", homeScore: 2, awayScore: 0, venue: "Lusail Stadium" },
    { stage: "Group G", date: "2022-11-28", home: "Cameroon", away: "Serbia", homeScore: 3, awayScore: 3, venue: "Al Janoub Stadium" },
    { stage: "Group G", date: "2022-11-28", home: "Brazil", away: "Switzerland", homeScore: 1, awayScore: 0, venue: "Stadium 974" },
    { stage: "Group G", date: "2022-12-02", home: "Cameroon", away: "Brazil", homeScore: 1, awayScore: 0, venue: "Lusail Stadium" },
    { stage: "Group G", date: "2022-12-02", home: "Serbia", away: "Switzerland", homeScore: 2, awayScore: 3, venue: "Stadium 974" },
    // Group H
    { stage: "Group H", date: "2022-11-24", home: "Uruguay", away: "South Korea", homeScore: 0, awayScore: 0, venue: "Education City Stadium" },
    { stage: "Group H", date: "2022-11-24", home: "Portugal", away: "Ghana", homeScore: 3, awayScore: 2, venue: "Stadium 974" },
    { stage: "Group H", date: "2022-11-28", home: "South Korea", away: "Ghana", homeScore: 2, awayScore: 3, venue: "Education City Stadium" },
    { stage: "Group H", date: "2022-11-28", home: "Portugal", away: "Uruguay", homeScore: 2, awayScore: 0, venue: "Lusail Stadium" },
    { stage: "Group H", date: "2022-12-02", home: "South Korea", away: "Portugal", homeScore: 2, awayScore: 1, venue: "Education City Stadium" },
    { stage: "Group H", date: "2022-12-02", home: "Ghana", away: "Uruguay", homeScore: 0, awayScore: 2, venue: "Al Janoub Stadium" },
    // Round of 16
    { stage: "Round of 16", date: "2022-12-03", home: "Netherlands", away: "United States", homeScore: 3, awayScore: 1, venue: "Khalifa International Stadium" },
    { stage: "Round of 16", date: "2022-12-03", home: "Argentina", away: "Australia", homeScore: 2, awayScore: 1, venue: "Ahmad bin Ali Stadium" },
    { stage: "Round of 16", date: "2022-12-04", home: "France", away: "Poland", homeScore: 3, awayScore: 1, venue: "Al Thumama Stadium" },
    { stage: "Round of 16", date: "2022-12-04", home: "England", away: "Senegal", homeScore: 3, awayScore: 0, venue: "Al Bayt Stadium" },
    { stage: "Round of 16", date: "2022-12-05", home: "Japan", away: "Croatia", homeScore: 1, awayScore: 1, penalties: "1-3", venue: "Al Janoub Stadium" },
    { stage: "Round of 16", date: "2022-12-05", home: "Brazil", away: "South Korea", homeScore: 4, awayScore: 1, venue: "Stadium 974" },
    { stage: "Round of 16", date: "2022-12-06", home: "Morocco", away: "Spain", homeScore: 0, awayScore: 0, penalties: "3-0", venue: "Education City Stadium" },
    { stage: "Round of 16", date: "2022-12-06", home: "Portugal", away: "Switzerland", homeScore: 6, awayScore: 1, venue: "Lusail Stadium" },
    // Quarter-finals
    { stage: "Quarter-final", date: "2022-12-09", home: "Croatia", away: "Brazil", homeScore: 1, awayScore: 1, penalties: "4-2", venue: "Education City Stadium" },
    { stage: "Quarter-final", date: "2022-12-09", home: "Netherlands", away: "Argentina", homeScore: 2, awayScore: 2, penalties: "3-4", venue: "Lusail Iconic Stadium" },
    { stage: "Quarter-final", date: "2022-12-10", home: "Morocco", away: "Portugal", homeScore: 1, awayScore: 0, venue: "Al Thumama Stadium" },
    { stage: "Quarter-final", date: "2022-12-10", home: "England", away: "France", homeScore: 1, awayScore: 2, venue: "Al Bayt Stadium" },
    // Semi-finals
    { stage: "Semi-final", date: "2022-12-13", home: "Argentina", away: "Croatia", homeScore: 3, awayScore: 0, venue: "Lusail Iconic Stadium" },
    { stage: "Semi-final", date: "2022-12-14", home: "France", away: "Morocco", homeScore: 2, awayScore: 0, venue: "Al Bayt Stadium" },
    // Third place
    { stage: "Third Place", date: "2022-12-17", home: "Croatia", away: "Morocco", homeScore: 2, awayScore: 1, venue: "Khalifa International Stadium" },
    // Final
    { stage: "Final", date: "2022-12-18", home: "Argentina", away: "France", homeScore: 3, awayScore: 3, penalties: "4-2", venue: "Lusail Iconic Stadium" },
  ],

  // Per-team profile data — confederation, final placing, manager, key facts
  teamProfiles: {
    "Argentina": { confederation: "CONMEBOL", group: "C", finalPlacing: "Champions (1st)", manager: "Lionel Scaloni", topScorerOwnTeam: "Lionel Messi (7)", flag: "🇦🇷" },
    "France": { confederation: "UEFA", group: "D", finalPlacing: "Runners-up (2nd)", manager: "Didier Deschamps", topScorerOwnTeam: "Kylian Mbappé (8)", flag: "🇫🇷" },
    "Croatia": { confederation: "UEFA", group: "F", finalPlacing: "Third place (3rd)", manager: "Zlatko Dalić", topScorerOwnTeam: "Mislav Oršić / Andrej Kramarić (2)", flag: "🇭🇷" },
    "Morocco": { confederation: "CAF", group: "F", finalPlacing: "Fourth place (4th)", manager: "Walid Regragui", topScorerOwnTeam: "Youssef En-Nesyri (3)", flag: "🇲🇦" },
    "Netherlands": { confederation: "UEFA", group: "A", finalPlacing: "Quarter-finals", manager: "Louis van Gaal", topScorerOwnTeam: "Cody Gakpo (3)", flag: "🇳🇱" },
    "Brazil": { confederation: "CONMEBOL", group: "G", finalPlacing: "Quarter-finals", manager: "Tite", topScorerOwnTeam: "Richarlison (3)", flag: "🇧🇷" },
    "England": { confederation: "UEFA", group: "B", finalPlacing: "Quarter-finals", manager: "Gareth Southgate", topScorerOwnTeam: "Marcus Rashford / Bukayo Saka (3)", flag: "🏴" },
    "Portugal": { confederation: "UEFA", group: "H", finalPlacing: "Quarter-finals", manager: "Fernando Santos", topScorerOwnTeam: "Gonçalo Ramos (3)", flag: "🇵🇹" },
    "Senegal": { confederation: "CAF", group: "A", finalPlacing: "Round of 16", manager: "Aliou Cissé", topScorerOwnTeam: "Famara Diédhiou / Ismaïla Sarr (1)", flag: "🇸🇳" },
    "United States": { confederation: "CONCACAF", group: "B", finalPlacing: "Round of 16", manager: "Gregg Berhalter", topScorerOwnTeam: "Haji Wright (1)", flag: "🇺🇸" },
    "Australia": { confederation: "AFC", group: "D", finalPlacing: "Round of 16", manager: "Graham Arnold", topScorerOwnTeam: "Mitchell Duke / Mathew Leckie (1)", flag: "🇦🇺" },
    "Poland": { confederation: "UEFA", group: "C", finalPlacing: "Round of 16", manager: "Czesław Michniewicz", topScorerOwnTeam: "Robert Lewandowski (2)", flag: "🇵🇱" },
    "Japan": { confederation: "AFC", group: "E", finalPlacing: "Round of 16", manager: "Hajime Moriyasu", topScorerOwnTeam: "Daizen Maeda / Ritsu Doan (2)", flag: "🇯🇵" },
    "Spain": { confederation: "UEFA", group: "E", finalPlacing: "Round of 16", manager: "Luis Enrique", topScorerOwnTeam: "Ferran Torres (3)", flag: "🇪🇸" },
    "Switzerland": { confederation: "UEFA", group: "G", finalPlacing: "Round of 16", manager: "Murat Yakin", topScorerOwnTeam: "Xherdan Shaqiri (2)", flag: "🇨🇭" },
    "South Korea": { confederation: "AFC", group: "H", finalPlacing: "Round of 16", manager: "Paulo Bento", topScorerOwnTeam: "Cho Gue-sung (2)", flag: "🇰🇷" },
    "Ecuador": { confederation: "CONMEBOL", group: "A", finalPlacing: "Group stage (3rd)", manager: "Gustavo Alfaro", topScorerOwnTeam: "Enner Valencia (3)", flag: "🇪🇨" },
    "Qatar": { confederation: "AFC", group: "A", finalPlacing: "Group stage (4th, host)", manager: "Félix Sánchez", topScorerOwnTeam: "Mohammed Muntari (1)", flag: "🇶🇦" },
    "Iran": { confederation: "AFC", group: "B", finalPlacing: "Group stage (3rd)", manager: "Carlos Queiroz", topScorerOwnTeam: "Rouzbeh Cheshmi / Ramin Rezaeian (1)", flag: "🇮🇷" },
    "Wales": { confederation: "UEFA", group: "B", finalPlacing: "Group stage (4th)", manager: "Rob Page", topScorerOwnTeam: "Gareth Bale (1)", flag: "🏴" },
    "Mexico": { confederation: "CONCACAF", group: "C", finalPlacing: "Group stage (3rd)", manager: "Gerardo Martino", topScorerOwnTeam: "Henry Martín / Luis Chávez (1)", flag: "🇲🇽" },
    "Saudi Arabia": { confederation: "AFC", group: "C", finalPlacing: "Group stage (4th)", manager: "Hervé Renard", topScorerOwnTeam: "Salem Al-Dawsari (2)", flag: "🇸🇦" },
    "Tunisia": { confederation: "CAF", group: "D", finalPlacing: "Group stage (3rd)", manager: "Jalel Kadri", topScorerOwnTeam: "Wahbi Khazri (1)", flag: "🇹🇳" },
    "Denmark": { confederation: "UEFA", group: "D", finalPlacing: "Group stage (4th)", manager: "Kasper Hjulmand", topScorerOwnTeam: "Andreas Christensen (1)", flag: "🇩🇰" },
    "Germany": { confederation: "UEFA", group: "E", finalPlacing: "Group stage (3rd)", manager: "Hansi Flick", topScorerOwnTeam: "Kai Havertz / Niclas Füllkrug (2)", flag: "🇩🇪" },
    "Costa Rica": { confederation: "CONCACAF", group: "E", finalPlacing: "Group stage (4th)", manager: "Luis Fernando Suárez", topScorerOwnTeam: "Keysher Fuller / Juan Pablo Vargas (1)", flag: "🇨🇷" },
    "Belgium": { confederation: "UEFA", group: "F", finalPlacing: "Group stage (3rd)", manager: "Roberto Martínez", topScorerOwnTeam: "Michy Batshuayi (1)", flag: "🇧🇪" },
    "Canada": { confederation: "CONCACAF", group: "F", finalPlacing: "Group stage (4th)", manager: "John Herdman", topScorerOwnTeam: "Alphonso Davies (1)", flag: "🇨🇦" },
    "Cameroon": { confederation: "CAF", group: "G", finalPlacing: "Group stage (3rd)", manager: "Rigobert Song", topScorerOwnTeam: "Vincent Aboubakar (2)", flag: "🇨🇲" },
    "Serbia": { confederation: "UEFA", group: "G", finalPlacing: "Group stage (4th)", manager: "Dragan Stojković", topScorerOwnTeam: "Dušan Vlahović (2)", flag: "🇷🇸" },
    "Uruguay": { confederation: "CONMEBOL", group: "H", finalPlacing: "Group stage (3rd)", manager: "Diego Alonso", topScorerOwnTeam: "Giorgian de Arrascaeta (1)", flag: "🇺🇾" },
    "Ghana": { confederation: "CAF", group: "H", finalPlacing: "Group stage (4th)", manager: "Otto Addo", topScorerOwnTeam: "Mohammed Kudus (2)", flag: "🇬🇭" },
  },
};

if (typeof module !== "undefined") module.exports = WC2022;
