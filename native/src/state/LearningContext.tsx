import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { api, API_BASE, ApiError, USER_ID } from "../lib/api";
import type { Profile, Recommendation, Topic } from "../lib/types";

export const storageKey = (topicId: number, kind: string) =>
  `bookpath:${API_BASE}:${USER_ID}:${topicId}:${kind}`;
type State = {
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
        `bookpath:${API_BASE}:${USER_ID}:topic`,
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
  }, []);
  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);
  useEffect(() => {
    if (!topic) return;
    let active = true;
    void (async () => {
      try {
        const p = await api.profile(topic.id);
        if (!active) return;
        setProfile(p);
        const saved = await AsyncStorage.getItem(
          storageKey(topic.id, "learningRecommendation"),
        );
        if (saved) {
          const r = await api.recommendation(Number(saved));
          if (
            active &&
            r.profileId === p.id &&
            r.userId === USER_ID &&
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
  }, [topic]);
  const selectTopic = useCallback((t: Topic) => {
    setError(null);
    setProfile(null);
    setRecommendation(null);
    setTopic(t);
    void AsyncStorage.setItem(
      `bookpath:${API_BASE}:${USER_ID}:topic`,
      String(t.id),
    );
  }, []);
  const saveProfile = useCallback((p: Profile) => {
    setProfile(p);
    setRecommendation(null);
  }, []);
  const saveRecommendation = useCallback(async (r: Recommendation) => {
    setRecommendation(r);
    await AsyncStorage.setItem(
      storageKey(r.topicId, "learningRecommendation"),
      String(r.id),
    );
  }, []);
  return (
    <Context.Provider
      value={{
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
