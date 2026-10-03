import { colors } from "../theme/tokens";

export const questionContentStyles = `
.question-content { color:${colors.ink}; font:14px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; overflow-wrap:anywhere; min-width:0; max-width:100%; }
.question-content-title { font-size:18px; font-weight:600; line-height:1.6; letter-spacing:-.35px; }
.question-content p { margin:0 0 .8em; }
.question-content > :last-child { margin-bottom:0; }
.question-content ul,.question-content ol { padding-left:1.6em; margin:.5em 0; }
.question-content li + li { margin-top:.35em; }
.question-content pre { white-space:pre-wrap; }
.question-content code { font-family:ui-monospace,monospace; font-size:.92em; }
.question-content .katex { font-size:1.12em; letter-spacing:normal; font-weight:normal; }
.question-math { display:inline-block; max-width:100%; overflow-x:auto; overflow-y:hidden; vertical-align:middle; padding:3px 0; }
.question-math-block { display:block; margin:.7em 0; }
.question-math-block .katex-display { margin:.3em 0; text-align:left; }
.question-math-error { color:${colors.danger}; background:${colors.dangerSoft}; white-space:pre-wrap; }
`;
