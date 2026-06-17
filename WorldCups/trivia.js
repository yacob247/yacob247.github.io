// ============================================================================
// TRIVIA QUESTION BANK — every question is based on a verified real fact
// from the 2022 World Cup dataset (see data/wc2022.js). No invented stats.
// ============================================================================

const TRIVIA_QUESTIONS = [
  {
    q: "Who won the 2022 FIFA World Cup?",
    options: ["France", "Argentina", "Croatia", "Morocco"],
    answer: "Argentina",
    fact: "Argentina beat France 3-3 (4-2 on penalties) in one of the greatest finals ever played.",
  },
  {
    q: "Who scored a hat-trick in the 2022 World Cup final?",
    options: ["Lionel Messi", "Kylian Mbappé", "Julián Álvarez", "Olivier Giroud"],
    answer: "Kylian Mbappé",
    fact: "Mbappé became the first player since Geoff Hurst (1966) to score a hat-trick in a World Cup final — yet still lost.",
  },
  {
    q: "Who won the Golden Ball (best player) at the 2022 World Cup?",
    options: ["Kylian Mbappé", "Lionel Messi", "Luka Modrić", "Achraf Hakimi"],
    answer: "Lionel Messi",
    fact: "Messi became the first player ever to score in every round of a single World Cup.",
  },
  {
    q: "Who won the Golden Boot (top scorer) at the 2022 World Cup, despite his team losing the final?",
    options: ["Lionel Messi", "Olivier Giroud", "Kylian Mbappé", "Julián Álvarez"],
    answer: "Kylian Mbappé",
    fact: "Mbappé finished with 8 goals, one more than Messi's 7 — decided right in the final itself.",
  },
  {
    q: "Which team finished third at the 2022 World Cup?",
    options: ["Morocco", "Croatia", "Netherlands", "England"],
    answer: "Croatia",
    fact: "Croatia beat Morocco 2-1 in the third place playoff.",
  },
  {
    q: "Which team became the first African nation to reach a World Cup semi-final?",
    options: ["Senegal", "Cameroon", "Ghana", "Morocco"],
    answer: "Morocco",
    fact: "Morocco beat Portugal in the quarter-finals before losing to France in the semis, finishing 4th overall.",
  },
  {
    q: "Host nation Qatar's result in the group stage was:",
    options: ["Won 1, drew 2", "Lost all 3 matches", "Drew all 3 matches", "Won 2, lost 1"],
    answer: "Lost all 3 matches",
    fact: "Qatar became the first host nation in World Cup history to lose all three group games.",
  },
  {
    q: "Who won the Golden Glove (best goalkeeper) at the 2022 World Cup?",
    options: ["Emiliano Martínez", "Hugo Lloris", "Yassine Bounou", "Dominik Livaković"],
    answer: "Emiliano Martínez",
    fact: "Martínez saved a penalty in the final's shootout and a crucial late chance from Kolo Muani in extra time.",
  },
  {
    q: "Saudi Arabia pulled off one of the tournament's biggest shocks by beating which eventual champion in the group stage?",
    options: ["France", "Brazil", "Argentina", "Spain"],
    answer: "Argentina",
    fact: "Saudi Arabia beat Argentina 2-1 in the group stage — Argentina went on to win the entire tournament.",
  },
  {
    q: "Which team won Group E despite Spain hammering Costa Rica 7-0?",
    options: ["Spain", "Germany", "Japan", "Costa Rica"],
    answer: "Japan",
    fact: "Japan finished top of Group E on 6 points, ahead of Spain on goal difference rules, eliminating Germany.",
  },
  {
    q: "Who scored the most goals for England at the 2022 World Cup?",
    options: ["Harry Kane", "Marcus Rashford and Bukayo Saka (tied)", "Jude Bellingham", "Raheem Sterling"],
    answer: "Marcus Rashford and Bukayo Saka (tied)",
    fact: "Rashford and Saka each scored 3 goals for England in Qatar.",
  },
  {
    q: "Which match did England win 6-2 in the group stage?",
    options: ["England vs Wales", "England vs Iran", "England vs USA", "England vs Senegal"],
    answer: "England vs Iran",
    fact: "England opened the tournament with a 6-2 win over Iran, including a Bukayo Saka double.",
  },
  {
    q: "Who won the Young Player Award at the 2022 World Cup?",
    options: ["Enzo Fernández", "Jude Bellingham", "Gavi", "Pedri"],
    answer: "Enzo Fernández",
    fact: "Fernández started on the bench for Argentina's first two matches before becoming a key midfielder.",
  },
  {
    q: "Which team won the FIFA Fair Play Award at the 2022 World Cup?",
    options: ["Japan", "England", "Brazil", "Morocco"],
    answer: "England",
    fact: "England had the best disciplinary record across the tournament.",
  },
  {
    q: "In the round of 16, which match went to penalties after a 1-1 draw, with the surprise team winning 3-1 on kicks?",
    options: ["Japan vs Croatia", "Morocco vs Spain", "Argentina vs Netherlands", "Brazil vs South Korea"],
    answer: "Japan vs Croatia",
    fact: "Croatia won the shootout 3-1 over Japan and went on to reach the semi-finals.",
  },
  {
    q: "Morocco eliminated Spain in the round of 16 — what was the score after extra time?",
    options: ["1-1, won on penalties", "0-0, won on penalties", "2-1", "1-0"],
    answer: "0-0, won on penalties",
    fact: "Morocco won the shootout 3-0 without conceding a single penalty.",
  },
  {
    q: "Which two teams played out a thrilling 3-3 draw in the 2022 final before penalties?",
    options: ["Argentina and France", "Argentina and Croatia", "France and Morocco", "France and England"],
    answer: "Argentina and France",
    fact: "After 90 and then 120 minutes finished 3-3, Argentina won the shootout 4-2.",
  },
  {
    q: "Which team finished bottom of Group G after a wild 3-3 draw with Cameroon?",
    options: ["Switzerland", "Brazil", "Serbia", "Cameroon"],
    answer: "Serbia",
    fact: "Serbia finished 4th in Group G with just 1 point from three matches.",
  },
  {
    q: "South Korea advanced from the group stage on the very last matchday by beating which team?",
    options: ["Uruguay", "Portugal", "Ghana", "Brazil"],
    answer: "Portugal",
    fact: "South Korea beat Portugal 2-1, edging out Uruguay for second place in Group H on goals scored.",
  },
  {
    q: "Olivier Giroud won the Bronze Boot with 4 goals, also breaking which record during the tournament?",
    options: ["France's all-time top scorer", "Most assists at a single World Cup", "Oldest World Cup goalscorer", "Most World Cups played"],
    answer: "France's all-time top scorer",
    fact: "Giroud passed Thierry Henry's tally to become France's record international goalscorer.",
  },
];

if (typeof module !== "undefined") module.exports = TRIVIA_QUESTIONS;
