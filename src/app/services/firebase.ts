import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  Auth, 
  onAuthStateChanged, 
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { 
  getFirestore, 
  Firestore, 
  doc, 
  setDoc, 
  getDoc,
  serverTimestamp,
  increment,
  updateDoc
} from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  createdAt: Date | string;
  lastActiveAt: Date | string;
  role: 'student' | 'admin';
  xp: number;
  streak: number;
  completedLessons: string[]; // lessonIds
  bookmarks: string[]; // lessonIds
  quizHighScores: Record<string, number>; // quizId -> score
  challengeAttempts: Record<string, 'NOT_STARTED' | 'ATTEMPTED' | 'PASSED' | 'MASTERED'>;
}

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private platformId = inject(PLATFORM_ID);
  
  // Signals for state
  public currentUser = signal<User | null>(null);
  public userProfile = signal<UserProfile | null>(null);
  public loading = signal<boolean>(true);

  private app: FirebaseApp | null = null;
  public auth: Auth | null = null;
  public db: Firestore | null = null;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.initFirebase();
    } else {
      this.loading.set(false);
    }
  }

  private async initFirebase() {
    const firebaseConfig = {
      apiKey: "AIzaSyA7_usGYBMrTOlP28WkQs5S3LoTLYSTdKo",
      authDomain: "learn-with-rayson.firebaseapp.com",
      projectId: "learn-with-rayson",
      storageBucket: "learn-with-rayson.firebasestorage.app",
      messagingSenderId: "608913776349",
      appId: "1:608913776349:web:7ecb5dd04f962e0bdb0534"
    };

    try {
      if (!getApps().length) {
        this.app = initializeApp(firebaseConfig);
      } else {
        this.app = getApps()[0];
      }
      
      this.auth = getAuth(this.app);
      this.db = getFirestore(this.app);

      // Listen to auth changes
      onAuthStateChanged(this.auth, async (user: User | null) => {
        this.currentUser.set(user);
        if (user) {
          await this.loadUserProfile(user.uid);
        } else {
          this.userProfile.set(null);
          this.loading.set(false);
        }
      });
    } catch (error) {
      console.error("Firebase initialization failed:", error);
      this.loading.set(false);
    }
  }

  private async loadUserProfile(uid: string) {
    if (!this.db) return;
    this.loading.set(true);
    try {
      const userDocRef = doc(this.db, 'users', uid);
      const docSnap = await getDoc(userDocRef);
      
      if (docSnap.exists()) {
        this.userProfile.set(docSnap.data() as UserProfile);
      } else {
        // Create initial profile if missing
        const newProfile: UserProfile = {
          uid,
          displayName: this.currentUser()?.displayName || this.currentUser()?.email?.split('@')[0] || 'Student',
          email: this.currentUser()?.email || '',
          createdAt: new Date(),
          lastActiveAt: new Date(),
          role: 'student',
          xp: 0,
          streak: 1,
          completedLessons: [],
          bookmarks: [],
          quizHighScores: {},
          challengeAttempts: {}
        };
        await setDoc(userDocRef, newProfile);
        this.userProfile.set(newProfile);
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
    } finally {
      this.loading.set(false);
    }
  }

  async signUp(email: string, password: string, name: string) {
    if (!this.auth || !this.db) throw new Error("Auth not initialized");
    const credential = await createUserWithEmailAndPassword(this.auth, email, password);
    await updateProfile(credential.user, { displayName: name });
    
    // Explicitly create user doc
    const newProfile: UserProfile = {
      uid: credential.user.uid,
      displayName: name,
      email: email,
      createdAt: new Date(),
      lastActiveAt: new Date(),
      role: 'student',
      xp: 0,
      streak: 1,
      completedLessons: [],
      bookmarks: [],
      quizHighScores: {},
      challengeAttempts: {}
    };
    await setDoc(doc(this.db, 'users', credential.user.uid), newProfile);
    this.userProfile.set(newProfile);
    return credential.user;
  }

  async login(email: string, password: string) {
    if (!this.auth) throw new Error("Auth not initialized");
    const credential = await signInWithEmailAndPassword(this.auth, email, password);
    return credential.user;
  }

  async loginWithGoogle() {
    if (!this.auth) throw new Error("Auth not initialized");
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(this.auth, provider);
    return credential.user;
  }

  async logout() {
    if (!this.auth) return;
    await signOut(this.auth);
  }

  async updateUserXP(additionalXp: number) {
    const profile = this.userProfile();
    const user = this.currentUser();
    if (!profile || !user || !this.db) {
      // Local storage fallback for guests
      this.updateLocalGuestXP(additionalXp);
      return;
    }

    try {
      const updatedProfile = {
        ...profile,
        xp: profile.xp + additionalXp,
        lastActiveAt: new Date()
      };
      this.userProfile.set(updatedProfile);
      await updateDoc(doc(this.db, 'users', user.uid), {
        xp: increment(additionalXp),
        lastActiveAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error updating XP in database:", error);
    }
  }

  async toggleBookmark(lessonId: string) {
    const profile = this.userProfile();
    const user = this.currentUser();
    if (!profile || !user || !this.db) {
      this.toggleLocalGuestBookmark(lessonId);
      return;
    }

    try {
      const bookmarks = [...profile.bookmarks];
      const idx = bookmarks.indexOf(lessonId);
      if (idx > -1) {
        bookmarks.splice(idx, 1);
      } else {
        bookmarks.push(lessonId);
      }

      const updatedProfile = { ...profile, bookmarks };
      this.userProfile.set(updatedProfile);
      await updateDoc(doc(this.db, 'users', user.uid), { bookmarks });
    } catch (error) {
      console.error("Error toggling bookmark:", error);
    }
  }

  async completeLesson(lessonId: string) {
    const profile = this.userProfile();
    const user = this.currentUser();
    if (!profile || !user || !this.db) {
      this.completeLocalGuestLesson(lessonId);
      return;
    }

    if (profile.completedLessons.includes(lessonId)) return;

    try {
      const completedLessons = [...profile.completedLessons, lessonId];
      const xpReward = 15; // 15 XP for completing a lesson
      const updatedProfile = { 
        ...profile, 
        completedLessons,
        xp: profile.xp + xpReward
      };
      this.userProfile.set(updatedProfile);
      await updateDoc(doc(this.db, 'users', user.uid), { 
        completedLessons,
        xp: increment(xpReward)
      });
    } catch (error) {
      console.error("Error saving lesson completion:", error);
    }
  }

  async saveQuizHighScore(quizId: string, score: number) {
    const profile = this.userProfile();
    const user = this.currentUser();
    if (!profile || !user || !this.db) {
      this.saveLocalGuestQuizScore(quizId, score);
      return;
    }

    const currentBest = profile.quizHighScores[quizId] || 0;
    if (score <= currentBest) return;

    try {
      const quizHighScores = { ...profile.quizHighScores, [quizId]: score };
      const xpReward = 30; // 30 XP for a high score update
      const updatedProfile = {
        ...profile,
        quizHighScores,
        xp: profile.xp + xpReward
      };
      this.userProfile.set(updatedProfile);
      await updateDoc(doc(this.db, 'users', user.uid), {
        quizHighScores,
        xp: increment(xpReward)
      });
    } catch (error) {
      console.error("Error saving quiz score:", error);
    }
  }

  async updateChallengeAttempt(challengeId: string, status: 'NOT_STARTED' | 'ATTEMPTED' | 'PASSED' | 'MASTERED') {
    const profile = this.userProfile();
    const user = this.currentUser();
    if (!profile || !user || !this.db) {
      this.saveLocalGuestChallenge(challengeId, status);
      return;
    }

    try {
      const challengeAttempts = { ...profile.challengeAttempts, [challengeId]: status };
      let xpReward = 0;
      if (status === 'PASSED' && profile.challengeAttempts[challengeId] !== 'PASSED' && profile.challengeAttempts[challengeId] !== 'MASTERED') {
        xpReward = 50; // 50 XP for passing a challenge!
      } else if (status === 'MASTERED' && profile.challengeAttempts[challengeId] !== 'MASTERED') {
        xpReward = 100; // 100 XP for mastering!
      }

      const updatedProfile = {
        ...profile,
        challengeAttempts,
        xp: profile.xp + xpReward
      };
      this.userProfile.set(updatedProfile);
      await updateDoc(doc(this.db, 'users', user.uid), {
        challengeAttempts,
        xp: increment(xpReward)
      });
    } catch (error) {
      console.error("Error saving challenge attempt:", error);
    }
  }

  // --- LOCAL STORAGE GUEST HANDLERS ---
  getLocalGuestProfile(): UserProfile {
    if (!isPlatformBrowser(this.platformId)) {
      return this.emptyProfile();
    }
    const data = localStorage.getItem('guest_profile');
    if (data) {
      try {
        return JSON.parse(data);
      } catch {
        // Ignore parsing error and return empty
      }
    }
    const def = this.emptyProfile();
    localStorage.setItem('guest_profile', JSON.stringify(def));
    return def;
  }

  private emptyProfile(): UserProfile {
    return {
      uid: 'guest',
      displayName: 'Guest Student',
      email: 'guest@platform.local',
      createdAt: new Date(),
      lastActiveAt: new Date(),
      role: 'student',
      xp: 0,
      streak: 1,
      completedLessons: [],
      bookmarks: [],
      quizHighScores: {},
      challengeAttempts: {}
    };
  }

  private saveGuestProfile(prof: UserProfile) {
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.setItem('guest_profile', JSON.stringify(prof));
  }

  private updateLocalGuestXP(additionalXp: number) {
    const prof = this.getLocalGuestProfile();
    prof.xp += additionalXp;
    prof.lastActiveAt = new Date();
    this.saveGuestProfile(prof);
  }

  private toggleLocalGuestBookmark(lessonId: string) {
    const prof = this.getLocalGuestProfile();
    const idx = prof.bookmarks.indexOf(lessonId);
    if (idx > -1) {
      prof.bookmarks.splice(idx, 1);
    } else {
      prof.bookmarks.push(lessonId);
    }
    this.saveGuestProfile(prof);
  }

  private completeLocalGuestLesson(lessonId: string) {
    const prof = this.getLocalGuestProfile();
    if (!prof.completedLessons.includes(lessonId)) {
      prof.completedLessons.push(lessonId);
      prof.xp += 15;
      this.saveGuestProfile(prof);
    }
  }

  private saveLocalGuestQuizScore(quizId: string, score: number) {
    const prof = this.getLocalGuestProfile();
    const cur = prof.quizHighScores[quizId] || 0;
    if (score > cur) {
      prof.quizHighScores[quizId] = score;
      prof.xp += 30;
      this.saveGuestProfile(prof);
    }
  }

  private saveLocalGuestChallenge(challengeId: string, status: 'NOT_STARTED' | 'ATTEMPTED' | 'PASSED' | 'MASTERED') {
    const prof = this.getLocalGuestProfile();
    const prev = prof.challengeAttempts[challengeId];
    prof.challengeAttempts[challengeId] = status;
    if (status === 'PASSED' && prev !== 'PASSED' && prev !== 'MASTERED') {
      prof.xp += 50;
    } else if (status === 'MASTERED' && prev !== 'MASTERED') {
      prof.xp += 100;
    }
    this.saveGuestProfile(prof);
  }
}
