// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDLeM4MrsA1Q8zq7_QcQfTJKk049vOVOO4",
  authDomain: "envizionwork.firebaseapp.com",
  projectId: "envizionwork",
  storageBucket: "envizionwork.firebasestorage.app",
  messagingSenderId: "706251024837",
  appId: "1:706251024837:web:4c931733d3a9f430a703ac",
  measurementId: "G-9CL929H67Z"
};

window.ENVIZION_FIREBASE_CONFIG = firebaseConfig;

window.normalizeCourseData = function(input){
  if(Array.isArray(input)) return {subjects:input, schoolCodes:[]};
  return {
    subjects:Array.isArray(input?.subjects) ? input.subjects : [],
    schoolCodes:Array.isArray(input?.schoolCodes) ? input.schoolCodes : []
  };
};

window.mergeCourseData = function(baseData, remoteData){
  const base = window.normalizeCourseData(baseData);
  const remote = window.normalizeCourseData(remoteData);
  const subjects = new Map();
  base.subjects.forEach(subject => subject?.slug && subjects.set(subject.slug, subject));
  remote.subjects.forEach(subject => subject?.slug && subjects.set(subject.slug, {...subjects.get(subject.slug), ...subject}));
  return {subjects:Array.from(subjects.values()), schoolCodes:[...base.schoolCodes, ...remote.schoolCodes]};
};

window.loadFirestoreCourseData = async function(getDb){
  const db = await getDb().catch(error => {
    console.warn("Firestore course sync skipped:", error);
    return null;
  });
  if(!db) return;
  let remote = null;
  try {
    const snap = await db.collection("Electroni_course_data").doc("active").get();
    if(snap.exists) {
      const value = snap.data() || {};
      remote = value.data || value.courseData || value;
    }
  } catch(error) {
    console.warn("Course data document sync skipped:", error);
  }
  if(!remote) {
    try {
      const snap = await db.collection("Electroni_subjects").get();
      const subjects = snap.docs.map(doc => ({slug:doc.id, ...doc.data()}));
      if(subjects.length) remote = {subjects};
    } catch(error) {
      console.warn("Course subjects collection sync skipped:", error);
    }
  }
  if(remote) window.Electroni_COURSE_DATA = window.mergeCourseData(window.Electroni_COURSE_DATA, remote);
};
