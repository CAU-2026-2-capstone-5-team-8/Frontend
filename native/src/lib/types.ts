export type Ability = "meaning" | "application" | "reasoning";
export type Topic = {
  id: number;
  code: string;
  name: string;
  mlTopicId: string;
  parentId: number | null;
  assessmentReady: boolean;
  conceptAssessmentReady: boolean;
};
export type Question = {
  id: number;
  conceptId: string | null;
  cognitiveOperation: string | null;
  measurementContext: "prior-knowledge" | "provided-information" | null;
  passage: string | null;
  prompt: string;
  answerMode: "SELF_REPORT" | "MULTIPLE_CHOICE";
  choices: string[];
  knowsConcept: boolean | null;
  selectedChoiceIndex: number | null;
};
export type Session = {
  id: number;
  userId: number;
  topicId: number;
  status: string;
  questions: Question[];
};
export type ConceptAbility = {
  conceptId: string;
  ability: Ability;
  score: number;
  responseCount: number;
  correctCount: number;
  questionIds: string[];
  operations: string[];
};
export type ConceptProfile = {
  version: string;
  abilities: ConceptAbility[];
  providedInformationAbilities?: ConceptAbility[];
  legacyContextAbilities?: ConceptAbility[];
  selfReports: {
    conceptId: string;
    positiveCount: number;
    responseCount: number;
  }[];
  unclassifiedResponseCount: number;
  interpretation: string;
};
export type Profile = {
  id: number;
  sessionId: number;
  userId: number;
  topicId: number;
  calculationVersion: string;
  completedAt: string;
  evidence: { conceptProfile?: ConceptProfile };
};
export type Book = {
  id: number;
  title: string;
  author: string | null;
  description: string | null;
  isbn: string | null;
  topics: {
    id: number;
    name: string;
    tocEntryCount: number | null;
    coveredConceptCount: number | null;
  }[];
};
export type BookPage = {
  content: Book[];
  page: number;
  totalPages: number;
  totalElements: number;
};
export type Graph = {
  topicId: string;
  version: string;
  nodes: { id: string; label: string }[];
  edges: { source: string; target: string }[];
  book?: {
    id: number;
    title: string;
    available: boolean;
    coveredConcepts: string[];
    depthStatus: string;
    sourceArtifactVersion?: string;
  };
};
export type LearningState = {
  conceptId: string;
  state: "correct" | "needs-practice" | "unmeasured";
};
export type RecommendationItem = {
  bookId: number;
  title: string;
  author: string | null;
  rank: number;
  status: "ready-to-explore" | "check-first" | "foundation-gap";
  reviewOnly: boolean;
  foundationStatus: "observed-graph-candidates" | "not-established";
  foundation: LearningState[];
  targets: LearningState[];
  practiceConceptCount: number;
  unmeasuredConceptCount: number;
  coveredConcepts: string[];
  inferredPrerequisites: string[];
  reasons: string[];
};
export type Recommendation = {
  id: number;
  userId: number;
  topicId: number;
  profileId: number;
  ability: Ability;
  modelVersion: string;
  conceptProfileVersion?: string;
  candidateCount: number;
  mappedCandidateCount: number;
  unmappedCandidateCount: number;
  items: RecommendationItem[];
};

export type QuestionPreview = {
  status: "review-pending";
  questions: {
    id: string;
    topicId: string;
    conceptId: string;
    ability: Ability;
    measurementContext: "prior-knowledge";
    objective: string;
    prompt: string;
    choices: string[];
    correctChoiceIndex: number;
    explanation: string;
  }[];
};
