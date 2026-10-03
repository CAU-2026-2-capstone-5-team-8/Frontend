export type QuestionContentProps = {
  source: string;
  variant?: "body" | "title";
  /** Choice content must let the parent radio button receive taps. */
  interactive?: boolean;
};
