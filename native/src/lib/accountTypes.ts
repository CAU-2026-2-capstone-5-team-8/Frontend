import type { ConceptProfile } from "./types";
export type AvatarKey = "BOOK" | "LEAF" | "MOON" | "SUN";
export type Interest = { id: number; code: string; name: string };
export type AccountProfile = {
  userId: number;
  email: string;
  displayName: string;
  bio: string;
  avatarKey: AvatarKey;
  interests: Interest[];
  createdAt: string;
};
export type AccountUpdate = {
  displayName: string;
  bio: string;
  avatarKey: AvatarKey;
  interestTopicIds: number[];
};
export type ReadinessSnapshot = {
  profileId: number;
  sessionId: number;
  topicId: number;
  topicName: string;
  calculationVersion: string;
  completedAt: string;
  selfReportCount: number;
  multipleChoiceCount: number;
  demoCalculation: boolean;
  evidence: { conceptProfile?: ConceptProfile };
};
export type ReadinessOverview = {
  latestProfiles: ReadinessSnapshot[];
  unassessedInterests: Interest[];
  completedAssessmentCount: number;
  limitations: string[];
};
export type ReadinessHistory = {
  content: ReadinessSnapshot[];
  page: number;
  totalPages: number;
  totalElements: number;
};
