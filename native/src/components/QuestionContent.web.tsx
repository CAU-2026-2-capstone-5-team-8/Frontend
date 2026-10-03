import { useEffect, useMemo } from "react";
import { renderQuestionContent } from "../lib/questionContent";
import { questionContentStyles } from "../lib/questionContentStyles";
import { katexStyles } from "../lib/katexStyles";
import { colors } from "../theme/tokens";
import type { QuestionContentProps } from "./QuestionContent.types";

export function QuestionContent({
  source,
  variant = "body",
}: QuestionContentProps) {
  const content = useMemo(() => renderQuestionContent(source), [source]);
  useEffect(() => {
    if (document.getElementById("question-content-styles")) return;
    const style = document.createElement("style");
    style.id = "question-content-styles";
    style.textContent = katexStyles + questionContentStyles;
    document.head.appendChild(style);
  }, []);
  return (
    <div style={{ flex: 1, minWidth: 0, width: "100%" }}>
      <div
        className={`question-content${variant === "title" ? " question-content-title" : ""}`}
        data-math-errors={content.mathErrors.length}
        dangerouslySetInnerHTML={{ __html: content.html }}
      />
      {!!content.mathErrors.length && (
        <small style={{ color: colors.danger }}>
          수식 표기를 확인해 주세요.
        </small>
      )}
    </div>
  );
}
