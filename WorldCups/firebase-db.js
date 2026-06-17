// ============================================================================
// MY OWN PERMANENT DATABASE & SYNC SYSTEM
// ============================================================================
// This script connects to YOUR Firebase Realtime Database.
// It fetches World Cup data from a free, CORS-friendly API, saves it directly 
// to YOUR database, and then loads it from YOUR database. 
// Once saved, the data belongs to you permanently.
// ============================================================================

// Assumes Firebase SDK is imported in your HTML.
// Make sure you initialize your Firebase app in firebase-auth.js or similar!
// e.g., const database = firebase.database();

const DATABASE_PATHS = {
  teams: "worldcup/teams",
  lastSync: "worldcup/lastSync"
};

/**
 * 1. FETCHES directly from the free CORS-friendly API (TheSportsDB)
 */
async function fetchTeamsFromAPI() {
  const url = "https://www.thesportsdb.com/api/v1/json/3/search_all_teams.php?s=Soccer&c=International";
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("API request failed");
    const data = await res.json();
    return data.teams || [];
  } catch (err) {
    console.error("Could not fetch from API:", err);
    return null;
  }
}

/**
 * 2. SAVES the data permanently to YOUR own Firebase Database
 */
async function saveToMyDatabase(teams) {
  if (!window.database) {
    console.warn("Firebase Database is not initialized yet. Skipping permanent save.");
    return false;
  }

  try {
    // Save the raw team list to your own Google Cloud database
    await window.database.ref(DATABASE_PATHS.teams).set(teams);
    // Mark the timestamp of your local copy
    await window.database.ref(DATABASE_PATHS.lastSync).set(Date.now());
    console.log("Success! Data successfully captured and saved to YOUR permanent database.");
    return true;
  } catch (err) {
    console.error("Failed to save data to your Firebase database:", err);
    return false;
  }
}

/**
 * 3. LOADS the data directly from YOUR Firebase (fully owned by you)
 */
async function loadFromMyDatabase() {
  if (!window.database) return null;
  try {
    const snapshot = await window.database.ref(DATABASE_PATHS.teams).once("value");
    return snapshot.val();
  } catch (err) {
    console.error("Error loading from your database:", err);
    return null;
  }
}

/**
 * 4. THE MASTER SYNC ENGINE
 * Runs automatically. If your database is empty, it grabs the data from the 
 * API, saves it to your database, and thereafter serves it exclusively from YOU.
 */
async function getMyWorldCupData() {
  // First, try to read the data you already own from your database
  let myData = await loadFromMyDatabase();

  if (myData && myData.length > 0) {
    console.log("Loading data from YOUR database (No external API calls needed!).");
    return myData;
  }

  // If your database is completely empty (first run), grab the data to own it
  console.log("Your database is empty. Sourcing data from public API to claim it...");
  const freshData = await fetchTeamsFromAPI();
  
  if (freshData) {
    // Write it to your permanent cloud storage
    await saveToMyDatabase(freshData);
    return freshData;
  }

  return [];
}

// Attach to window so index.html can call it
window.MyPermanentDB = {
  getMyWorldCupData,
  saveToMyDatabase,
  fetchTeamsFromAPI
};