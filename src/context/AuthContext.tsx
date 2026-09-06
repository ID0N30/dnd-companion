"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  User, onAuthStateChanged, signOut, GoogleAuthProvider, linkWithCredential, signInWithCredential, sendEmailVerification
} from "firebase/auth";
import { 
  collection, query, where, getDocs, doc, setDoc, serverTimestamp 
} from "firebase/firestore";
import { 
  auth, db, googleProvider, loginWithGoogle, loginAnonymously, isFirebaseConfigured,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile
} from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isGuest: boolean;
  isLoggedIn: boolean;
  isFirebaseReady: boolean;
  signInGoogle: () => Promise<User | null>;
  signUpWithEmail: (email: string, pass: string, displayName: string) => Promise<User | null>;
  signInWithEmail: (email: string, pass: string) => Promise<User | null>;
  signInAsGuest: () => Promise<User | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isGuest: false,
  isLoggedIn: false,
  isFirebaseReady: false,
  signInGoogle: async () => null,
  signUpWithEmail: async () => null,
  signInWithEmail: async () => null,
  signInAsGuest: async () => null,
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser && db && !currentUser.isAnonymous) {
        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          await setDoc(userDocRef, {
            uid: currentUser.uid,
            email: currentUser.email || "",
            displayName: currentUser.displayName || currentUser.email || "Jugador",
            displayNameLower: (currentUser.displayName || currentUser.email || "Jugador").toLowerCase(),
            updatedAt: serverTimestamp()
          }, { merge: true });
        } catch (e) {
          console.warn("No se pudo registrar perfil en Firestore:", e);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const signInGoogle = async () => {
    if (!auth) return null;
    try {
      const result = await loginWithGoogle();
      if (user && user.isAnonymous && result.user) {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential) {
          try {
            await linkWithCredential(user, credential);
          } catch (linkError: any) {
            if (linkError.code === 'auth/credential-already-in-use' || linkError.code === 'auth/email-already-in-use') {
              const signInRes = await signInWithCredential(auth, credential);
              return signInRes.user;
            }
          }
        }
      }
      return result.user;
    } catch (error: any) {
      console.error("Error al iniciar sesión con Google:", error);
      return auth.currentUser;
    }
  };

  const signUpWithEmail = async (email: string, pass: string, displayName: string): Promise<User | null> => {
    if (!auth) throw new Error("Firebase Auth no está disponible.");
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = displayName.trim();
    const lowerName = cleanName.toLowerCase();

    if (!cleanEmail || !pass || !cleanName) {
      throw new Error("Por favor completa todos los campos requeridos.");
    }

    // Password validation: minimum 8 characters, at least one letter and one number
    if (pass.length < 8) {
      throw new Error("⚠️ La contraseña debe tener al menos 8 caracteres para mayor seguridad.");
    }
    if (!/[A-Za-z]/.test(pass) || !/[0-9]/.test(pass)) {
      throw new Error("⚠️ La contraseña debe incluir al menos una letra y un número.");
    }

    // 1. Enforce unique username check across Firestore users collection
    if (db) {
      try {
        const q = query(collection(db, "users"), where("displayNameLower", "==", lowerName));
        const snap = await getDocs(q);
        if (!snap.empty) {
          throw new Error(`⚠️ El nombre de usuario "${cleanName}" ya está en uso. Por favor elige otro nombre de usuario.`);
        }
      } catch (e: any) {
        if (e.message?.includes("ya está en uso")) throw e;
        console.warn("Verificación de nombre de usuario omitida:", e);
      }
    }

    // 2. Create User in Firebase Auth (Enforces unique email: auth/email-already-in-use)
    try {
      const res = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
      if (res.user) {
        await updateProfile(res.user, { displayName: cleanName });
        
        // Send email verification to the user
        try {
          await sendEmailVerification(res.user);
        } catch (emailErr) {
          console.warn("No se pudo enviar correo de verificación:", emailErr);
        }

        if (db) {
          await setDoc(doc(db, "users", res.user.uid), {
            uid: res.user.uid,
            email: cleanEmail,
            displayName: cleanName,
            displayNameLower: lowerName,
            createdAt: serverTimestamp()
          });
        }
      }
      return res.user;
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        throw new Error(`⚠️ El correo "${cleanEmail}" ya pertenece a otra cuenta existente. Por favor inicia sesión o usa otro correo.`);
      }
      if (error.code === 'auth/weak-password') {
        throw new Error("⚠️ La contraseña debe tener al menos 8 caracteres.");
      }
      if (error.code === 'auth/invalid-email') {
        throw new Error("⚠️ El formato del correo electrónico no es válido.");
      }
      throw error;
    }
  };

  const signInWithEmail = async (email: string, pass: string): Promise<User | null> => {
    if (!auth) throw new Error("Firebase Auth no está disponible.");
    try {
      const res = await signInWithEmailAndPassword(auth, email.trim(), pass);
      return res.user;
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        throw new Error("⚠️ Correo o contraseña incorrectos. Por favor verifica tus credenciales.");
      }
      throw error;
    }
  };

  const signInAsGuest = async () => {
    if (!auth) return null;
    try {
      const res = await loginAnonymously();
      return res.user;
    } catch (error) {
      console.error("Error al ingresar como invitado:", error);
      return null;
    }
  };

  const logout = async () => {
    if (!auth) return;
    try {
      const { useStore } = await import("@/store/useStore");
      useStore.setState({ activePlayerId: "", players: [] });
    } catch (e) {
      console.error(e);
    }
    await signOut(auth);
  };

  const isGuest = Boolean(user && user.isAnonymous);
  const isLoggedIn = Boolean(user && !user.isAnonymous);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isGuest,
      isLoggedIn,
      isFirebaseReady: isFirebaseConfigured,
      signInGoogle,
      signUpWithEmail,
      signInWithEmail,
      signInAsGuest,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
