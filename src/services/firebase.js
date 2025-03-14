 // src/services/firebase.js
 import { initializeApp } from "firebase/app";
 import { getFirestore } from "firebase/firestore";
 import { getAuth } from "firebase/auth";
 import { getStorage } from "firebase/storage";
 
 const firebaseConfig = {
   apiKey: "AIzaSyDLQaZQHRO5zEUzwWbr1vCP8NTLznwwNKI",
   authDomain: "angel-8a2b8.firebaseapp.com",
   projectId: "angel-8a2b8",
   storageBucket: "angel-8a2b8.appspot.com",
   messagingSenderId: "737996680106",
   appId: "1:737996680106:web:67d5825e2b2c49f58659d3"
 };
 
 const firebaseApp = initializeApp(firebaseConfig);
 const db = getFirestore(firebaseApp);
 const auth = getAuth(firebaseApp);
 const storage = getStorage(firebaseApp);
 
 export { db, auth, storage };
 