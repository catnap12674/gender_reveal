// かわいい赤ちゃんイラスト（SVG）を生成するユーティリティ。
// 男の子（青系） / 女の子（ピンク系）でパーツの色だけを切り替えている。

function babySvgMarkup(kind) {
  const isBoy = kind === "boy";

  const palette = isBoy
    ? {
        skin: "#FFE3C9",
        cheeks: "#FFB6C9",
        outfit1: "#5FA8FF",
        outfit2: "#8FC3FF",
        hair: "#7A5A46",
        accent: "#FFD86B",
      }
    : {
        skin: "#FFE3C9",
        cheeks: "#FF9FC0",
        outfit1: "#FF7FB0",
        outfit2: "#FFB2D2",
        hair: "#7A5A46",
        accent: "#FFD86B",
      };

  const headAccessory = isBoy
    ? `<path d="M96 70 q10 -22 26 -8" stroke="${palette.hair}" stroke-width="8" stroke-linecap="round" fill="none"/>`
    : `<g>
         <path d="M150 66 c10 -16 34 -14 30 4 c-4 16 -28 18 -30 -4 z" fill="${palette.outfit1}"/>
         <circle cx="150" cy="66" r="6" fill="${palette.accent}"/>
       </g>`;

  return `
  <svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${isBoy ? "男の子" : "女の子"}のイラスト">
    <!-- からだ / うわぎ -->
    <ellipse cx="150" cy="235" rx="92" ry="55" fill="${palette.outfit1}"/>
    <ellipse cx="150" cy="222" rx="70" ry="34" fill="${palette.outfit2}"/>
    <circle cx="150" cy="222" r="9" fill="${palette.accent}"/>

    <!-- ほっぺの赤み演出用の背景まる -->
    <circle cx="150" cy="140" r="86" fill="#FFFFFF" opacity="0.35"/>

    <!-- 顔 -->
    <circle cx="150" cy="140" r="78" fill="${palette.skin}"/>

    <!-- 髪の毛（ふわっと一房） -->
    <path d="M110 78 q40 -34 80 0 q-6 -30 -40 -30 q-34 0 -40 30 z" fill="${palette.hair}"/>
    ${headAccessory}

    <!-- ほっぺ -->
    <ellipse cx="108" cy="152" rx="16" ry="11" fill="${palette.cheeks}" opacity="0.75"/>
    <ellipse cx="192" cy="152" rx="16" ry="11" fill="${palette.cheeks}" opacity="0.75"/>

    <!-- 目 -->
    <circle cx="126" cy="138" r="7.5" fill="#4A4458"/>
    <circle cx="174" cy="138" r="7.5" fill="#4A4458"/>
    <circle cx="128.5" cy="135.5" r="2.2" fill="#fff"/>
    <circle cx="176.5" cy="135.5" r="2.2" fill="#fff"/>

    <!-- まゆげ -->
    <path d="M116 122 q10 -6 20 0" stroke="#4A4458" stroke-width="3" stroke-linecap="round" fill="none"/>
    <path d="M164 122 q10 -6 20 0" stroke="#4A4458" stroke-width="3" stroke-linecap="round" fill="none"/>

    <!-- 口 -->
    <path d="M136 168 q14 14 28 0" stroke="#C2286A" stroke-width="4.5" stroke-linecap="round" fill="none"/>

    <!-- キラキラ装飾 -->
    <g fill="${palette.accent}">
      <path d="M40 60 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4 z"/>
      <path d="M255 100 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 z"/>
      <path d="M250 220 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 z"/>
    </g>
  </svg>`;
}

// ブラウザ / Node どちらから呼んでも使えるように window があれば公開する
if (typeof window !== "undefined") {
  window.babySvgMarkup = babySvgMarkup;
}
