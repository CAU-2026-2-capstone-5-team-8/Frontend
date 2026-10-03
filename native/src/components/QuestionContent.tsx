import { useMemo, useState } from "react";
import { Text, View, useWindowDimensions } from "react-native";
import { WebView } from "react-native-webview";
import { renderQuestionContent } from "../lib/questionContent";
import { questionContentStyles } from "../lib/questionContentStyles";
import { katexStyles } from "../lib/katexStyles";
import { colors } from "../theme/tokens";
import type { QuestionContentProps } from "./QuestionContent.types";

// Only this fixed script executes; generated Markdown/TeX is rendered and escaped first.
const heightScript = `
function reportHeight() { window.ReactNativeWebView.postMessage(JSON.stringify({height:document.getElementById('content').getBoundingClientRect().height})); }
new ResizeObserver(reportHeight).observe(document.getElementById('content'));
document.fonts.ready.then(reportHeight); window.addEventListener('load',reportHeight); reportHeight();
`;

export function QuestionContent({
  source,
  variant = "body",
  interactive = true,
}: QuestionContentProps) {
  const [height, setHeight] = useState(60);
  const [failed, setFailed] = useState(false);
  const { fontScale } = useWindowDimensions();
  const content = useMemo(() => renderQuestionContent(source), [source]);
  const html = useMemo(
    () => `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; font-src data:; script-src 'unsafe-inline'">
<style>${katexStyles}${questionContentStyles}html,body{margin:0;background:transparent;}#content{padding:2px 0;}.question-content{font-size:${14 * fontScale}px;}.question-content-title{font-size:${18 * fontScale}px;}</style>
</head><body><div id="content" class="question-content${variant === "title" ? " question-content-title" : ""}">${content.html}</div><script>${heightScript}</script></body></html>`,
    [content.html, variant, fontScale],
  );
  // Plain questions need no embedded browser; preserve native text scaling and selection.
  if (failed || !/\\[([\]]|\$|[*_`#]|^\s*[-+]\s|^\s*\d+\.\s/m.test(source))
    return (
      <Text
        style={{
          color: colors.ink,
          fontSize: variant === "title" ? 18 : 14,
          lineHeight: variant === "title" ? 29 : 23,
          fontWeight: variant === "title" ? "600" : "400",
          flexShrink: 1,
          width: "100%",
        }}
        selectable={interactive}
      >
        {source}
      </Text>
    );
  return (
    <View
      style={{ flexShrink: 1, width: "100%", minWidth: 0 }}
      pointerEvents={interactive ? "auto" : "none"}
    >
      <WebView
        source={{ html }}
        originWhitelist={["*"]}
        style={{ height, backgroundColor: "transparent", flex: 0 }}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        textZoom={100}
        setSupportMultipleWindows={false}
        onShouldStartLoadWithRequest={(request) =>
          request.url === "about:blank"
        }
        onError={() => setFailed(true)}
        onMessage={(event) => {
          try {
            const next = JSON.parse(event.nativeEvent.data).height;
            if (
              typeof next === "number" &&
              Number.isFinite(next) &&
              next > 0 &&
              next < 100_000
            )
              setHeight(Math.ceil(next) + 2);
          } catch {
            /* Ignore messages that do not match the fixed height script. */
          }
        }}
      />
      {!!content.mathErrors.length && (
        <Text style={{ color: colors.danger, fontSize: 12 }}>
          수식 표기를 확인해 주세요.
        </Text>
      )}
    </View>
  );
}
