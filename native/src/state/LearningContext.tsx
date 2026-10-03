import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { api, API_BASE, ApiError } from "../lib/api";
import { useAuth } from "./AuthContext";
import { accountStorageKey } from "../lib/authSession";
import type { Profile, Recommendation, Topic } from "../lib/types";

type State = {
  storageKey: (topicId: number, kind: string) => string;
  topics: Topic[];
  topic: Topic | null;
  profile: Profile | null;
  recommendation: Recommendation | null;
  error: string | null;
  loading: boolean;
  selectTopic: (t: Topic) => void;
  refresh: () => Promise<void>;
  saveProfile: (p: Profile) => void;
  saveRecommendation: (r: Recommendation) => Promise<void>;
};
const Context = createContext<State | null>(null);
export function LearningProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const userId = session?.userId ?? null;
  const storageKey = useCallback(
    (topicId: number, kind: string) =>
      accountStorageKey(API_BASE, userId, topicId, kind),
    [userId],
  );
  const [topics, setTopics] = useState<Topic[]>([]),
    [topic, setTopic] = useState<Topic | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null),
    [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [error, setError] = useState<string | null>(null),
    [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    try {
      const all = await api.topics();
      setError(null);
      setTopics(all);
      const saved = await AsyncStorage.getItem(
        accountStorageKey(API_BASE, userId, null, "topic"),
      );
      setTopic(
        (current) =>
          all.find((t) => t.id === (current?.id || Number(saved))) ||
          all.find((t) => t.conceptAssessmentReady) ||
          all.find((t) => t.parentId !== null) ||
          all[0] ||
          null,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [userId]);
  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);
  useEffect(() => {
    if (!topic || !userId) return;
    let active = true;
    void (async () => {
      try {
        const p = await api.profile(topic.id);
        if (!active) return;
        setProfile(p);
        const saved = await AsyncStorage.getItem(
          storageKey(topic.id, "learningRecommendation"),
        );
        if (saved && active) {
          const r = await api.recommendation(Number(saved));
          if (
            active &&
            r.profileId === p.id &&
            r.userId === userId &&
            r.topicId === topic.id
          )
            setRecommendation(r);
        }
      } catch (e) {
        if (active && !(e instanceof ApiError && e.status === 404))
          setError((e as Error).message);
      }
    })();
    return () => {
      active = false;
    };
  }, [topic, userId, storageKey]);
  const selectTopic = useCallback(
    (t: Topic) => {
      setError(null);
      setProfile(null);
      setRecommendation(null);
      setTopic(t);
      void AsyncStorage.setItem(
        accountStorageKey(API_BASE, userId, null, "topic"),
        String(t.id),
      );
    },
    [userId],
  );
  const saveProfile = useCallback((p: Profile) => {
    setProfile(p);
    setRecommendation(null);
  }, []);
  const saveRecommendation = useCallback(
    async (r: Recommendation) => {
      setRecommendation(r);
      await AsyncStorage.setItem(
        storageKey(r.topicId, "learningRecommendation"),
        String(r.id),
      );
    },
    [storageKey],
  );
  return (
    <Context.Provider
      value={{
        storageKey,
        topics,
        topic,
        profile,
        recommendation,
        error,
        loading,
        selectTopic,
        refresh,
        saveProfile,
        saveRecommendation,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useLearning() {
  const state = useContext(Context);
  if (!state) throw Error("LearningProvider missing");
  return state;
}
