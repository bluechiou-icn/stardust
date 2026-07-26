/* ============================================================
   星塵夢汐 — 水晶模組 Crystals Module
   水晶知識圖鑑（52 種）＋復古礦物版畫風插圖（程序化 SVG）
   ＋ Minéralogie 海報風「虛擬水晶收藏架」＋ 月相×許願搭配。
   功效內容為各文化的民俗與能量傳統整理，供自我紀錄與儀式靈感，
   非科學實證、非醫療建議。想增修水晶，直接編輯 CRYSTAL_DB 即可。
   ============================================================ */

/* ---------- 用途標籤（篩選用；emoji 顯示在 chips） ---------- */
const CRYSTAL_USES = {
  "愛情": "💗", "財富": "💰", "事業": "🚀", "健康": "🌿", "守護": "🛡", "淨化": "🕊",
  "靈性": "🔮", "溝通": "🗣", "創造": "🎨", "平靜": "🌊", "勇氣": "🔥", "睡眠": "🌙",
};

/* ---------- 脈輪 ---------- */
const CHAKRAS = {
  "海底輪": { en: "Root", c: "#c0392b" }, "臍輪": { en: "Sacral", c: "#e67e22" },
  "太陽神經叢": { en: "Solar Plexus", c: "#f1c40f" }, "心輪": { en: "Heart", c: "#27ae60" },
  "喉輪": { en: "Throat", c: "#2980b9" }, "眉心輪": { en: "Third Eye", c: "#5b48a2" },
  "頂輪": { en: "Crown", c: "#9b59b6" }, "全脈輪": { en: "All Chakras", c: "#b8b0d0" },
};

/* ============================================================
   水晶資料庫（52 種國際市場常見水晶礦石）
   form：插圖形態 point 晶柱 / cluster 晶簇 / geode 晶洞 / tumbled 滾石
         cab 蛋面 / slab 切片 / rough 原礦 / cube 立方 / octa 八面體 / blade 板狀
   pal：插圖三色 [主色, 深色, 亮色]；nm/fm：新月/滿月搭配度 0–3
   cleanse：適合的淨化法；avoid：保養禁忌
   ============================================================ */
const CRYSTAL_DB = [
  /* —— 石英家族 Quartz Family —— */
  { id: "clear-quartz", zh: "白水晶", en: "Clear Quartz", alias: "晶王・水晶之母", family: "石英家族",
    form: "cluster", pal: ["#e8e6e0", "#b9bcc4", "#f9f8f4"], chakra: ["頂輪", "全脈輪"], element: "風", hard: "7",
    origin: "巴西・馬達加斯加・喜馬拉雅",
    fx: ["淨化磁場、平衡全身脈輪", "放大其他水晶與意念的能量", "提升專注與思緒清明", "可被「編程」載入個人意圖"],
    uses: ["淨化", "靈性", "守護"], nm: 3, fm: 3,
    moonNote: "萬用百搭：新月握著唸願望可放大任何意圖；滿月月光下淨化充能最經典。",
    cleanse: ["月光", "日光", "流水", "晶簇", "薰香"], avoid: [],
    lore: "石英家族之王。古希臘人以為它是永不融化的冰（krystallos），也是石英錶震盪計時的核心。" },

  { id: "amethyst", zh: "紫水晶", en: "Amethyst", alias: "智慧之石", family: "石英家族",
    form: "geode", pal: ["#8e6bb5", "#5b3a87", "#cbb3e3"], chakra: ["眉心輪", "頂輪"], element: "風", hard: "7",
    origin: "烏拉圭・巴西",
    fx: ["安定心神、化解焦躁", "開發直覺與智慧", "助眠、緩和多夢", "招貴人、增進人際包容"],
    uses: ["靈性", "平靜", "睡眠"], nm: 2, fm: 3,
    moonNote: "滿月夜放窗邊充能；睡前握著做釋放儀式，把煩惱交還月亮。",
    cleanse: ["月光", "晶簇", "薰香"], avoid: ["長時間日曬會褪色"],
    lore: "名字源自希臘文 amethystos「不醉」，古人相信配戴可保持清醒；紫晶洞是招財聚氣的風水擺設。" },

  { id: "rose-quartz", zh: "粉晶", en: "Rose Quartz", alias: "愛情之石", family: "石英家族",
    form: "rough", pal: ["#f0b9c8", "#d38ba4", "#fbe3ea"], chakra: ["心輪"], element: "水", hard: "7",
    origin: "馬達加斯加・巴西",
    fx: ["招人緣與正緣桃花", "療癒情傷、柔軟心防", "學習愛自己與自我接納", "緩和關係中的緊張"],
    uses: ["愛情", "平靜"], nm: 3, fm: 2,
    moonNote: "新月許愛情願望的首選：寫下理想關係的樣子，把紙壓在粉晶下。",
    cleanse: ["月光", "晶簇", "流水"], avoid: ["日曬易褪色"],
    lore: "傳說愛神阿芙蘿黛蒂為救情人被荊棘劃傷，血染白石成粉晶。是全球銷量最高的愛情石。" },

  { id: "citrine", zh: "黃水晶", en: "Citrine", alias: "商人之石", family: "石英家族",
    form: "point", pal: ["#e8b64c", "#b57e1e", "#f7dfa0"], chakra: ["太陽神經叢"], element: "火", hard: "7",
    origin: "巴西・尚比亞",
    fx: ["招正財與偏財", "增強自信與行動力", "活絡事業與店面人氣", "驅散低落情緒、帶來陽光感"],
    uses: ["財富", "事業", "勇氣"], nm: 3, fm: 1,
    moonNote: "新月許財富與事業願望的首選；傳統上黃水晶「不留負能量」，不必常消磁。",
    cleanse: ["月光", "晶簇", "薰香"], avoid: ["日曬會褪色（本身多為熱處理紫晶）"],
    lore: "名字來自法文 citron（檸檬）。天然黃水晶稀少，市售多為紫晶熱處理而成，能量傳統上視為相同太陽頻率。" },

  { id: "smoky-quartz", zh: "煙晶（茶晶）", en: "Smoky Quartz", alias: "接地之石", family: "石英家族",
    form: "point", pal: ["#8a6f52", "#4f3a26", "#c8b294"], chakra: ["海底輪"], element: "土", hard: "7",
    origin: "巴西・瑞士阿爾卑斯",
    fx: ["強力接地、穩定氣場", "吸收轉化負能量", "緩解壓力與過度思考", "增強行動落實力"],
    uses: ["守護", "平靜", "健康"], nm: 1, fm: 3,
    moonNote: "滿月釋放儀式主角：握著它寫下想放下的事，象徵交給大地轉化。",
    cleanse: ["月光", "晶簇", "流水", "埋土"], avoid: ["長時間日曬"],
    lore: "蘇格蘭的國石，凱爾特人視為薩滿之石；顏色來自天然輻照使矽氧結構致色。" },

  { id: "rutilated-quartz", zh: "鈦晶（金髮晶）", en: "Rutilated Quartz", alias: "財富之針", family: "石英家族",
    form: "point", pal: ["#e3c98a", "#a8781f", "#f5e7c0"], chakra: ["太陽神經叢"], element: "火", hard: "7",
    origin: "巴西",
    fx: ["招正財偏財、加速目標實現", "增強領導力與魄力", "防小人、擋煞", "提振低迷能量"],
    uses: ["財富", "事業", "勇氣", "守護"], nm: 3, fm: 1,
    moonNote: "新月事業版圖許願：一針一願，觀想金線把機會牽引到你面前。",
    cleanse: ["月光", "晶簇", "薰香"], avoid: [],
    lore: "晶體內的金色髮絲是金紅石（rutile）針狀包裹體，針越粗密越罕見，是華人市場最搶手的招財晶。" },

  { id: "green-phantom", zh: "綠幽靈", en: "Green Phantom Quartz", alias: "事業水晶", family: "石英家族",
    form: "point", pal: ["#b9d3b4", "#5c8a5a", "#e9f2e5"], chakra: ["心輪"], element: "土", hard: "7",
    origin: "巴西",
    fx: ["招正財、事業穩定成長", "看見機會、突破瓶頸", "沉澱心緒、重整方向", "象徵歷經風雨後的重生"],
    uses: ["財富", "事業"], nm: 3, fm: 1,
    moonNote: "新月替季度目標「種下金字塔」：觀想晶中山景是你一步步登上的事業高峰。",
    cleanse: ["月光", "晶簇", "流水"], avoid: [],
    lore: "晶體生長中斷時覆上綠泥石，再繼續生長包裹成「山」，像被封存的時間切片，故名 phantom（幻影）。" },

  { id: "strawberry-quartz", zh: "草莓晶", en: "Strawberry Quartz", alias: "人緣桃花石", family: "石英家族",
    form: "tumbled", pal: ["#e89aa6", "#b95f72", "#f7d6dc"], chakra: ["心輪"], element: "水", hard: "7",
    origin: "俄羅斯・坦尚尼亞",
    fx: ["招人緣與桃花", "提升個人魅力與親和力", "為感情加溫", "帶來愉悅正向的心情"],
    uses: ["愛情", "平靜"], nm: 2, fm: 1,
    moonNote: "新月社交願望：想拓展圈子、遇見對的人時配戴。",
    cleanse: ["月光", "晶簇"], avoid: ["日曬易褪色"],
    lore: "紅色點點是纖鐵礦或赤鐵礦包裹體，像草莓籽；與「超級七」中的紅髮絲屬同源家族。" },

  { id: "ametrine", zh: "紫黃晶", en: "Ametrine", alias: "智慧與財富的雙生", family: "石英家族",
    form: "point", pal: ["#c39ad0", "#8a5da6", "#ecd9a0"], chakra: ["眉心輪", "太陽神經叢"], element: "風", hard: "7",
    origin: "玻利維亞",
    fx: ["同時匯聚紫晶的智慧與黃晶的財氣", "整合理性與直覺", "化解猶豫、果斷決策", "調和矛盾情緒"],
    uses: ["財富", "靈性", "事業"], nm: 2, fm: 2,
    moonNote: "新月適合「魚與熊掌都想要」的整合型願望；滿月感謝自己內外的平衡。",
    cleanse: ["月光", "晶簇"], avoid: ["日曬褪色"],
    lore: "紫黃雙色天然共生於一顆晶體，主要僅玻利維亞 Anahí 礦區出產，傳說以西班牙征服者與土著公主的聯姻為名。" },

  /* —— 石英隱晶質・瑪瑙玉髓 —— */
  { id: "green-aventurine", zh: "東菱玉（綠東陵）", en: "Green Aventurine", alias: "機會之石", family: "石英家族",
    form: "tumbled", pal: ["#7fae87", "#4a7a54", "#c2dcc6"], chakra: ["心輪"], element: "土", hard: "7",
    origin: "印度・巴西",
    fx: ["招好運與新機會", "溫和招財、適合小資理財", "安撫心輪、樂觀開朗", "支持新的開始"],
    uses: ["財富", "健康", "平靜"], nm: 2, fm: 1,
    moonNote: "新月換工作、開新專案時握著許願，傳統上是「賭運與機會」的幸運石。",
    cleanse: ["月光", "流水", "晶簇"], avoid: [],
    lore: "閃閃發亮的內含物是鉻雲母，義大利文 a ventura 意為「憑運氣」，原指偶然發明的金星玻璃。" },

  { id: "tigers-eye", zh: "虎眼石", en: "Tiger's Eye", alias: "勇氣之眼", family: "石英家族",
    form: "cab", pal: ["#c98f3d", "#6e4a1c", "#ecc37a"], chakra: ["太陽神經叢"], element: "火", hard: "7",
    origin: "南非・澳洲",
    fx: ["增強勇氣、意志與執行力", "招偏財、看準時機", "防小人、抵禦負面言語", "穩定猶豫不決的心"],
    uses: ["勇氣", "財富", "守護"], nm: 2, fm: 1,
    moonNote: "新月替需要「膽識」的願望助攻：談判、比賽、提案前配戴。",
    cleanse: ["月光", "日光", "流水"], avoid: [],
    lore: "絲絹光澤來自石英交代青石棉後保留的纖維結構，轉動時如貓眼流動，羅馬士兵曾佩戴上戰場。" },

  { id: "carnelian", zh: "紅玉髓", en: "Carnelian", alias: "行動之火", family: "石英家族",
    form: "tumbled", pal: ["#d96f45", "#a03a1c", "#f2b795"], chakra: ["臍輪"], element: "火", hard: "7",
    origin: "印度・巴西",
    fx: ["點燃行動力與熱情", "激發創造力與表達", "提升活力、掃除拖延", "增強自信與舞台魅力"],
    uses: ["創造", "勇氣", "事業"], nm: 3, fm: 1,
    moonNote: "新月啟動新計畫的「點火石」：把待辦第一步寫下，壓在紅玉髓下。",
    cleanse: ["月光", "日光", "流水"], avoid: [],
    lore: "古埃及人稱「落日之石」，圖坦卡門面具上就鑲著紅玉髓；也是古代印章戒指最愛用的石材。" },

  { id: "red-jasper", zh: "紅碧玉", en: "Red Jasper", alias: "大地養育者", family: "石英家族",
    form: "tumbled", pal: ["#b04a3a", "#7a2c22", "#d98a76"], chakra: ["海底輪"], element: "土", hard: "7",
    origin: "印度・馬達加斯加",
    fx: ["穩定接地、補充體力", "培養耐力與長期毅力", "在壓力中保持冷靜", "守護遠行者"],
    uses: ["健康", "守護", "勇氣"], nm: 1, fm: 2,
    moonNote: "滿月時感謝身體的付出；長期抗戰型目標的陪跑石。",
    cleanse: ["月光", "流水", "埋土"], avoid: [],
    lore: "Jasper 源自希臘文「斑點石」；北歐傳說屠龍勇士齊格飛的劍柄就鑲著紅碧玉以賦予勇氣。" },

  { id: "agate", zh: "瑪瑙", en: "Agate", alias: "平衡守護石", family: "石英家族",
    form: "slab", pal: ["#b7a9c8", "#6f5f86", "#e6ddf0"], chakra: ["全脈輪"], element: "土", hard: "7",
    origin: "巴西・烏拉圭",
    fx: ["平衡陰陽、穩定情緒起伏", "溫和持久的守護能量", "增強安全感", "依顏色對應不同脈輪"],
    uses: ["守護", "平靜", "健康"], nm: 1, fm: 2,
    moonNote: "滿月感恩儀式的穩定基座；瑪瑙杯墊亦可當其他水晶的充能座。",
    cleanse: ["月光", "流水", "晶簇"], avoid: [],
    lore: "以西西里 Achates 河為名，是人類最早用作護身符的石材之一；同心紋是火山岩氣孔中一層層沉澱的玉髓。" },

  { id: "blue-lace-agate", zh: "藍紋瑪瑙", en: "Blue Lace Agate", alias: "溫柔溝通石", family: "石英家族",
    form: "slab", pal: ["#a9c8e0", "#6f93b5", "#e2eef7"], chakra: ["喉輪"], element: "水", hard: "7",
    origin: "納米比亞",
    fx: ["柔化言語、化解衝突", "支持誠實而溫柔的表達", "安撫焦慮與緊張", "適合演說與面談前配戴"],
    uses: ["溝通", "平靜"], nm: 2, fm: 2,
    moonNote: "新月許「好好說話」的願望：修復關係、面試、告白前的溫柔後援。",
    cleanse: ["月光", "流水", "晶簇"], avoid: ["日曬久了藍色變淡"],
    lore: "淡藍蕾絲花紋幾乎只產於納米比亞，被稱為「天使降落人間留下的裙襬」。" },

  /* —— 長石家族 Feldspar Family —— */
  { id: "moonstone", zh: "月光石", en: "Moonstone", alias: "月亮女神之石", family: "長石家族",
    form: "cab", pal: ["#dfe4ee", "#9aa5c4", "#ffffff"], chakra: ["臍輪", "眉心輪"], element: "水", hard: "6–6.5",
    origin: "斯里蘭卡・印度",
    fx: ["連結月亮週期與直覺", "溫柔滋養女性能量", "安撫情緒潮汐、助眠", "招正緣、守護旅人"],
    uses: ["愛情", "靈性", "睡眠"], nm: 3, fm: 3,
    moonNote: "月亮儀式的靈魂石：新月戴著許願、滿月放月光下充能，與月相 App 天生一對。",
    cleanse: ["月光", "晶簇"], avoid: ["硬度中等避免碰撞"],
    lore: "藍暈（adularescence）是長石層狀結構繞射月色般的光；印度傳說滿月夜含著月光石能預見未來。" },

  { id: "labradorite", zh: "拉長石", en: "Labradorite", alias: "極光之石", family: "長石家族",
    form: "cab", pal: ["#5f7d8c", "#2e4551", "#7fb3a8"], chakra: ["眉心輪"], element: "風", hard: "6–6.5",
    origin: "馬達加斯加・芬蘭",
    fx: ["築起能量防護罩、防能量吸血鬼", "喚醒直覺與潛能", "陪伴人生轉換期", "增添神秘魅力"],
    uses: ["守護", "靈性", "創造"], nm: 2, fm: 2,
    moonNote: "月食、變動月相時的護身石；轉職、搬家等轉變期新月許願。",
    cleanse: ["月光", "晶簇", "薰香"], avoid: [],
    lore: "因紐特傳說極光曾被封在拉布拉多海岸的岩石裡，戰士以矛劈開釋放，留在石中的光成了拉長石暈彩。" },

  { id: "sunstone", zh: "太陽石", en: "Sunstone", alias: "領袖之石", family: "長石家族",
    form: "cab", pal: ["#e0854f", "#ad4f24", "#f5c398"], chakra: ["臍輪", "太陽神經叢"], element: "火", hard: "6–6.5",
    origin: "印度・挪威・美國奧勒岡",
    fx: ["注入樂觀與生命力", "增強領導魅力", "驅散陰霾、抗低潮", "鼓勵自我照顧與說「不」"],
    uses: ["勇氣", "事業", "健康"], nm: 2, fm: 1,
    moonNote: "與月光石成對戴象徵日月平衡；新月替「活出自己」的願望注入太陽能量。",
    cleanse: ["日光", "月光", "流水"], avoid: [],
    lore: "閃耀砂金效應來自赤鐵礦或銅片包裹體；傳說維京人以太陽石在陰天海上定位太陽方向導航。" },

  { id: "amazonite", zh: "天河石", en: "Amazonite", alias: "希望之石", family: "長石家族",
    form: "tumbled", pal: ["#6fbfb0", "#3a8a7d", "#b8e3db"], chakra: ["喉輪", "心輪"], element: "水", hard: "6–6.5",
    origin: "秘魯・莫三比克・俄羅斯",
    fx: ["帶來希望與翻盤的勇氣", "誠實表達內心真話", "舒緩神經緊繃", "傳統上被視為試試手氣的幸運石"],
    uses: ["溝通", "勇氣", "財富"], nm: 2, fm: 1,
    moonNote: "新月替「想再試一次」的願望打氣：重考、復出、東山再起。",
    cleanse: ["月光", "流水", "晶簇"], avoid: [],
    lore: "以亞馬遜河為名（雖然當地並不產）；圖坦卡門的聖甲蟲胸飾與《死者之書》護符都用了天河石。" },

  /* —— 守護接地 Grounding & Protection —— */
  { id: "obsidian", zh: "黑曜石", en: "Obsidian", alias: "黑色鏡面守護", family: "火山玻璃",
    form: "rough", pal: ["#3a3a42", "#17171c", "#6b6b78"], chakra: ["海底輪"], element: "土", hard: "5–5.5",
    origin: "墨西哥・冰島",
    fx: ["強力吸收負能量、擋煞避邪", "斬斷不健康的連結", "照見內在陰影、誠實面對自己", "安定夜行與遠行"],
    uses: ["守護", "淨化"], nm: 1, fm: 3,
    moonNote: "滿月釋放儀式主角：把想斷開的人事物寫下，與黑曜石一起靜置一夜再撕掉。",
    cleanse: ["月光", "晶簇", "薰香"], avoid: ["傳統上建議定期淨化，因吸附力強"],
    lore: "火山熔岩急速冷卻的天然玻璃，斷口鋒利如刀，阿茲提克人用它做鏡子占卜、也做手術刀。" },

  { id: "black-tourmaline", zh: "黑碧璽", en: "Black Tourmaline", alias: "電氣石守衛", family: "碧璽家族",
    form: "blade", pal: ["#2e2e34", "#101013", "#55555f"], chakra: ["海底輪"], element: "土", hard: "7–7.5",
    origin: "巴西・非洲",
    fx: ["護盾級防護、隔絕負面環境", "傳統上認為可緩衝 3C 電磁疲勞", "焦慮時快速接地", "淨化空間角落"],
    uses: ["守護", "淨化", "平靜"], nm: 1, fm: 3,
    moonNote: "滿月夜放家中四角「結界」淨化空間；高敏感人士的日常護身首選。",
    cleanse: ["月光", "流水", "晶簇", "埋土"], avoid: [],
    lore: "碧璽受熱或摩擦會產生電荷（熱電效應），故中文又名「電氣石」，居禮兄弟曾以它研究壓電現象。" },

  { id: "hematite", zh: "赤鐵礦（黑膽石）", en: "Hematite", alias: "鐵之意志", family: "氧化礦物",
    form: "tumbled", pal: ["#7d7f88", "#3f4147", "#b9bbc4"], chakra: ["海底輪"], element: "土", hard: "5–6",
    origin: "巴西・英國",
    fx: ["如錨般接地、集中渙散思緒", "增強意志力與紀律", "考試與深度工作的專注石", "帶來踏實安全感"],
    uses: ["守護", "健康", "事業"], nm: 1, fm: 2,
    moonNote: "滿月時把「想戒掉的習慣」交給它；讀書工作時放桌上鎮定心神。",
    cleanse: ["晶簇", "薰香"], avoid: ["怕水易鏽，勿泡水、勿鹽水"],
    lore: "磨粉即是紅赭石，是人類最古老的顏料——史前洞穴壁畫的紅色多半來自它；火星的紅色同樣是赤鐵礦。" },

  { id: "pyrite", zh: "黃鐵礦", en: "Pyrite", alias: "愚人金", family: "硫化礦物",
    form: "cube", pal: ["#d4af5a", "#8a6a24", "#f0d68e"], chakra: ["太陽神經叢"], element: "火", hard: "6–6.5",
    origin: "西班牙・秘魯",
    fx: ["旺事業財運、聚財氣", "增強自信與魄力", "防漏財、守住資產", "激發實幹精神"],
    uses: ["財富", "事業", "守護"], nm: 3, fm: 0,
    moonNote: "新月放辦公桌或收銀台旁許事業願；金色立方體象徵「財庫」。",
    cleanse: ["晶簇", "薰香"], avoid: ["怕水怕潮，接觸水氣易氧化變色"],
    lore: "天然長成完美立方體，常被淘金客誤認黃金而得名 Fool's Gold；敲擊可生火花，pyr 即希臘文「火」。" },

  { id: "shungite", zh: "次石墨", en: "Shungite", alias: "淨化黑石", family: "碳質礦物",
    form: "rough", pal: ["#33333a", "#141418", "#5a5a66"], chakra: ["海底輪"], element: "土", hard: "3.5–4",
    origin: "俄羅斯卡累利阿",
    fx: ["深度淨化身心與空間", "傳統上認為可中和電磁壓力", "支持排濁與重啟", "現代靈性圈的科技護身石"],
    uses: ["淨化", "守護", "健康"], nm: 1, fm: 2,
    moonNote: "滿月大掃除儀式：搭配打掃居家，象徵把舊能量一併清空。",
    cleanse: ["月光", "日光", "流水"], avoid: ["質地較軟避免碰撞；碰觸後可能留下碳粉"],
    lore: "約 20 億年前形成、含富勒烯（C60）結構的古老碳礦，彼得大帝曾在其礦泉旁建立俄國第一座療養地。" },

  /* —— 寶石級 Beryl・其他 —— */
  { id: "aquamarine", zh: "海藍寶", en: "Aquamarine", alias: "海洋勇氣石", family: "綠柱石家族",
    form: "point", pal: ["#a3cfe0", "#5b96b5", "#dbeef6"], chakra: ["喉輪"], element: "水", hard: "7.5–8",
    origin: "巴西・巴基斯坦",
    fx: ["冷靜表達、化解口舌之爭", "旅行（尤其海上）平安", "洗去累積的情緒鹽分", "給溫柔的人說真話的勇氣"],
    uses: ["溝通", "勇氣", "平靜"], nm: 2, fm: 2,
    moonNote: "水象月份（巨蟹・天蠍・雙魚月）的新月許願特別合拍。",
    cleanse: ["月光", "流水", "晶簇"], avoid: ["長時間日曬"],
    lore: "拉丁文「海水」之意，古羅馬水手帶它出航鎮浪；三月誕生石。" },

  { id: "morganite", zh: "摩根石", en: "Morganite", alias: "承諾之石", family: "綠柱石家族",
    form: "point", pal: ["#f2c4c4", "#d18f9b", "#fce7e5"], chakra: ["心輪"], element: "水", hard: "7.5–8",
    origin: "巴西・馬達加斯加",
    fx: ["滋養成熟穩定的愛", "撫平心輪舊傷", "溫柔而堅定的承諾能量", "增進同理與耐心"],
    uses: ["愛情", "平靜"], nm: 2, fm: 2,
    moonNote: "適合為「走向下一步」的關係許願：同居、求婚、修復信任。",
    cleanse: ["月光", "晶簇"], avoid: ["日曬褪色"],
    lore: "1911 年以銀行家 J.P. Morgan 命名（他是大都會博物館寶石收藏的贊助者），近年是婚戒粉色新寵。" },

  { id: "garnet", zh: "石榴石", en: "Garnet", alias: "女性活力石", family: "石榴石家族",
    form: "rough", pal: ["#a52a3c", "#6b1523", "#d4707f"], chakra: ["海底輪"], element: "火", hard: "6.5–7.5",
    origin: "莫三比克・印度",
    fx: ["補氣血、滋養根基活力", "喚回熱情與生命動力", "華人市場經典「女人石」", "守護長途旅人"],
    uses: ["健康", "愛情", "勇氣"], nm: 2, fm: 1,
    moonNote: "新月替健康作息、規律運動的願望立誓，紅色能量助你撐過前兩週。",
    cleanse: ["月光", "流水", "晶簇"], avoid: [],
    lore: "名字源自拉丁文石榴籽 granatum；傳說諾亞方舟以一顆石榴石為燈，一月誕生石。" },

  { id: "peridot", zh: "橄欖石", en: "Peridot", alias: "太陽寶石", family: "橄欖石",
    form: "rough", pal: ["#a8c545", "#6e8a20", "#d8ea9a"], chakra: ["心輪"], element: "土", hard: "6.5–7",
    origin: "埃及聖約翰島・美國亞利桑那",
    fx: ["放下舊怨與嫉妒、輕盈心輪", "招財富與豐盛（綠色小太陽）", "驅散夜間恐懼", "提振疲憊的心"],
    uses: ["財富", "健康", "平靜"], nm: 2, fm: 2,
    moonNote: "滿月原諒儀式：寫下想放下的怨懟，握橄欖石讀一遍後撕掉。",
    cleanse: ["月光", "晶簇"], avoid: ["怕酸怕高溫，避免香水直噴"],
    lore: "極少數只有單一顏色的寶石；埃及人稱「太陽的寶石」，部分隕石（橄欖隕鐵）中也有宇宙橄欖石。" },

  /* —— 喉輪・藍色系 Blue Stones —— */
  { id: "lapis-lazuli", zh: "青金石", en: "Lapis Lazuli", alias: "帝王之藍", family: "似長石礦物",
    form: "tumbled", pal: ["#2e5aa8", "#1b3468", "#6d8fd0"], chakra: ["眉心輪", "喉輪"], element: "風", hard: "5–6",
    origin: "阿富汗",
    fx: ["開啟智慧與洞察", "說出真話、堅守立場", "古文明的王者護身石", "支持深度學習與研究"],
    uses: ["靈性", "溝通", "事業"], nm: 2, fm: 2,
    moonNote: "新月替學業、考試、著作立願；金色黃鐵礦斑點如夜空星辰。",
    cleanse: ["晶簇", "薰香"], avoid: ["怕水怕汗，久泡會失光澤"],
    lore: "圖坦卡門黃金面具的藍就是青金石；文藝復興畫家將它磨成比黃金昂貴的群青顏料，只捨得畫聖母的袍子。" },

  { id: "sodalite", zh: "蘇打石（方鈉石）", en: "Sodalite", alias: "理性直覺橋樑", family: "似長石礦物",
    form: "tumbled", pal: ["#3d5a9e", "#243a6e", "#8fa3d0"], chakra: ["眉心輪", "喉輪"], element: "風", hard: "5.5–6",
    origin: "巴西・加拿大",
    fx: ["整合邏輯與直覺", "冷靜表達、適合團隊溝通", "減緩資訊焦慮", "支持寫作與思考輸出"],
    uses: ["溝通", "平靜", "創造"], nm: 2, fm: 1,
    moonNote: "新月替寫作計畫、論文、內容創作立願的知性之石。",
    cleanse: ["月光", "晶簇"], avoid: ["避免長時間泡水"],
    lore: "名字直譯「鈉之石」；1901 年英國皇室訪加拿大後大量訂購裝飾宮廷，一度被稱「公主藍」。" },

  { id: "kyanite", zh: "藍晶石", en: "Kyanite", alias: "對齊之刃", family: "矽酸鹽礦物",
    form: "blade", pal: ["#4f7ec0", "#2c5188", "#a8c4e8"], chakra: ["喉輪", "眉心輪"], element: "風", hard: "4.5–7（雙硬度）",
    origin: "尼泊爾・巴西",
    fx: ["快速對齊全身脈輪", "打通表達阻塞", "冥想前的調頻石", "傳統上認為不蓄負能、免消磁"],
    uses: ["溝通", "靈性", "淨化"], nm: 2, fm: 2,
    moonNote: "任何月相儀式前先握藍晶石一分鐘「校準」，如同樂器調音。",
    cleanse: ["傳統上免消磁", "月光"], avoid: ["層狀結構易裂，避免撞擊與泡水"],
    lore: "同一晶體兩個方向硬度不同（順紋 4.5、逆紋 7），地質學家用它判斷變質岩形成的溫壓條件。" },

  { id: "blue-apatite", zh: "藍磷灰石", en: "Blue Apatite", alias: "目標顯化石", family: "磷酸鹽礦物",
    form: "point", pal: ["#2f9ec4", "#186f8e", "#8fd4e8"], chakra: ["喉輪"], element: "風", hard: "5",
    origin: "馬達加斯加・巴西",
    fx: ["聚焦目標、消除雜念", "激發學習與求知欲", "傳統上與健康節食的自律相關", "公開表達的清晰度"],
    uses: ["事業", "溝通", "創造"], nm: 3, fm: 1,
    moonNote: "新月訂目標的顯化清單石：一條目標唸一次，握石觀想完成畫面。",
    cleanse: ["月光", "晶簇"], avoid: ["硬度低怕刮怕鹽，單獨收納"],
    lore: "名字源自希臘文 apate「欺騙」，因外觀常被誤認成其他寶石；你的牙齒與骨骼主要成分就是磷灰石。" },

  { id: "larimar", zh: "拉利瑪（海紋石）", en: "Larimar", alias: "加勒比海之心", family: "針鈉鈣石",
    form: "cab", pal: ["#7cc3d8", "#4090ad", "#d4eef5"], chakra: ["喉輪"], element: "水", hard: "4.5–5",
    origin: "多明尼加（全球唯一礦區）",
    fx: ["如海浪般深層放鬆", "溫柔化解累積的委屈", "支持產後與照顧者的自我療癒", "與海豚能量、亞特蘭提斯傳說連結"],
    uses: ["平靜", "溝通", "健康"], nm: 1, fm: 3,
    moonNote: "滿月泡澡儀式的冥想石（石放旁邊勿入水）：想像月光海洗去疲憊。",
    cleanse: ["月光", "晶簇"], avoid: ["怕曬怕汗，藍色會褪成白"],
    lore: "1974 年才正式發現，發現者以女兒 Larissa ＋西語海洋 mar 命名；全球僅多明尼加一座山出產。" },

  { id: "turquoise", zh: "綠松石（土耳其石）", en: "Turquoise", alias: "天空守護石", family: "磷酸鹽礦物",
    form: "tumbled", pal: ["#4fb5b0", "#2a807c", "#a8ddd8"], chakra: ["喉輪"], element: "風", hard: "5–6",
    origin: "伊朗・美國西南・中國湖北",
    fx: ["旅行平安的古老護身符", "擋災擋煞、代主受過（傳說碎裂即擋災）", "連結天空與大地", "增進友誼與誠信"],
    uses: ["守護", "溝通", "健康"], nm: 1, fm: 2,
    moonNote: "出遠門前的滿月夜替它充能，旅程平安順遂。",
    cleanse: ["薰香", "晶簇"], avoid: ["怕水怕油怕香水，多孔易吸色變色"],
    lore: "人類最早開採的寶石之一（埃及西奈礦區逾七千年）；經土耳其貿易進入歐洲而得名，藏族與美洲原住民皆視為聖石。" },

  { id: "angelite", zh: "天使石", en: "Angelite", alias: "天使的耳語", family: "硫酸鹽礦物",
    form: "tumbled", pal: ["#a9bdd8", "#7590b5", "#dde8f4"], chakra: ["喉輪", "頂輪"], element: "風", hard: "3.5",
    origin: "秘魯",
    fx: ["連結守護天使與指導靈", "撫平悲傷、陪伴告別", "極溫和的安撫頻率", "支持同理與傾聽"],
    uses: ["靈性", "平靜", "睡眠"], nm: 1, fm: 3,
    moonNote: "滿月悼念與感恩儀式：對想念的人說說話，把訊息託給月光。",
    cleanse: ["月光", "晶簇"], avoid: ["怕水！硬石膏遇水會變質"],
    lore: "本質是硬石膏（anhydrite），由古海洋蒸發沉積而成——它真的是「海的記憶」凝結成的石頭。" },

  { id: "celestite", zh: "天青石", en: "Celestite", alias: "天堂之音", family: "硫酸鹽礦物",
    form: "geode", pal: ["#b5cfe8", "#7fa3cc", "#e8f1fa"], chakra: ["喉輪", "頂輪"], element: "風", hard: "3–3.5",
    origin: "馬達加斯加",
    fx: ["深度安眠、緩解夢魘", "臥室的寧靜結界", "連結高我與天使界", "化解累積的精神緊繃"],
    uses: ["睡眠", "靈性", "平靜"], nm: 1, fm: 3,
    moonNote: "放床頭的滿月充能石；與夢境紀錄搭配，睡前握著設定「我會記得夢」。",
    cleanse: ["月光"], avoid: ["怕水怕曬易碎，只適合靜置觀賞"],
    lore: "拉丁文 caelestis「天空的」；鍶元素以它為主要來源——煙火中的紅色正是鍶燃燒的顏色。" },

  /* —— 紫色系・高頻靈性 Spiritual —— */
  { id: "fluorite", zh: "螢石", en: "Fluorite", alias: "天才之石", family: "鹵化礦物",
    form: "octa", pal: ["#8ec9a8", "#7a68b8", "#d6f0e2"], chakra: ["眉心輪"], element: "風", hard: "4",
    origin: "中國・英國・墨西哥",
    fx: ["整理混亂思緒、提升專注", "讀書考試的秩序之石", "吸收學習焦慮", "多色螢石對應多脈輪"],
    uses: ["事業", "平靜", "淨化"], nm: 2, fm: 2,
    moonNote: "新月訂學習計畫；放書桌上當「思緒吸塵器」，記得定期淨化。",
    cleanse: ["月光", "晶簇"], avoid: ["怕曬怕熱怕鹽，硬度低單獨收納"],
    lore: "「螢光 fluorescence」一詞就源自螢石的紫外光反應；天然八面體解理可徒手剝出完美鑽石形。" },

  { id: "charoite", zh: "紫龍晶", en: "Charoite", alias: "轉化之龍", family: "矽酸鹽礦物",
    form: "slab", pal: ["#8a5fb0", "#5a3480", "#c9a8e0"], chakra: ["頂輪"], element: "風", hard: "5–6",
    origin: "俄羅斯查羅河（全球唯一）",
    fx: ["在劇變中保持定力", "把恐懼轉化為前進燃料", "斬斷舊模式、勇敢轉型", "深層的靈性淨化"],
    uses: ["靈性", "勇氣", "淨化"], nm: 2, fm: 2,
    moonNote: "人生轉捩點的新月立願石：離職創業、移居、身份轉換。",
    cleanse: ["月光", "晶簇"], avoid: ["避免長時間泡水"],
    lore: "1978 年才向世界公開的稀有礦，僅產於西伯利亞查羅河流域，紫色絲絹紋路如龍身盤旋。" },

  { id: "sugilite", zh: "舒俱徠石", en: "Sugilite", alias: "愛的紫色盾牌", family: "矽酸鹽礦物",
    form: "slab", pal: ["#a04a9e", "#6e2a70", "#d495d2"], chakra: ["頂輪", "心輪"], element: "風", hard: "5.5–6.5",
    origin: "南非",
    fx: ["身心靈整體療癒的名石", "以愛的頻率包覆負能量", "陪伴病後修復期的心情", "增強慈悲與寬恕"],
    uses: ["健康", "靈性", "守護"], nm: 1, fm: 3,
    moonNote: "滿月自我疼惜儀式：感謝身體一個月來的努力，承諾溫柔以待。",
    cleanse: ["月光", "晶簇"], avoid: ["怕高溫與強酸"],
    lore: "以日本岩石學家杉健一（Sugi Ken-ichi）命名，1944 年發現；深紫「皇家紫」等級在亞洲市場價格逐年攀升。" },

  { id: "lepidolite", zh: "鋰雲母（紫鋰雲母）", en: "Lepidolite", alias: "安定之翼", family: "雲母家族",
    form: "rough", pal: ["#c0a0c8", "#8f6f9e", "#e8d5ec"], chakra: ["心輪", "頂輪"], element: "水", hard: "2.5–3",
    origin: "巴西・辛巴威",
    fx: ["深層放鬆、緩解焦慮迴圈", "支持戒斷與習慣重塑", "睡前思緒剎車", "情緒過載時的緩衝墊"],
    uses: ["平靜", "睡眠", "健康"], nm: 1, fm: 3,
    moonNote: "滿月釋放焦慮：把「擔心但無法控制的事」清單讀給月亮聽。",
    cleanse: ["月光", "晶簇"], avoid: ["怕水！雲母層遇水剝落"],
    lore: "天然含鋰——與情緒穩定藥物同一種元素，因此被暱稱「大自然的鎮定劑」；鱗片閃光即雲母薄層。" },

  { id: "kunzite", zh: "紫鋰輝石（孔賽石）", en: "Kunzite", alias: "無條件的愛", family: "輝石家族",
    form: "blade", pal: ["#eeb3cc", "#c87ba0", "#fadde9"], chakra: ["心輪"], element: "水", hard: "6.5–7",
    origin: "阿富汗・巴西",
    fx: ["敞開心輪、練習無條件的愛", "療癒童年與依附傷口", "柔化防衛、重新信任", "陪伴高敏感者"],
    uses: ["愛情", "平靜", "健康"], nm: 2, fm: 2,
    moonNote: "巨蟹・雙魚滿月的溫柔釋放石；寫一封不寄出的信，握著它讀完。",
    cleanse: ["月光", "晶簇"], avoid: ["怕曬！粉色極易褪，也怕撞擊"],
    lore: "1902 年以 Tiffany 首席寶石學家 G.F. Kunz 命名；同礦物含鉻呈綠色時叫「翠綠鋰輝石」，價格翻倍。" },

  { id: "selenite", zh: "透石膏", en: "Selenite", alias: "月神之光", family: "石膏家族",
    form: "blade", pal: ["#f2f0ea", "#cfcabb", "#ffffff"], chakra: ["頂輪"], element: "風", hard: "2",
    origin: "摩洛哥・墨西哥",
    fx: ["自身不蓄負能，還能淨化其他水晶", "打開頂輪、連結高我", "掃除空間沉滯能量", "冥想白光柱的具象化"],
    uses: ["淨化", "靈性", "平靜"], nm: 2, fm: 3,
    moonNote: "水晶們的「充電座」：把其他晶石放透石膏板上過夜即完成淨化；月神 Selene 之石與滿月最合。",
    cleanse: ["免消磁（本身即淨化器）"], avoid: ["怕水！遇水溶解，硬度僅 2 極易刮傷"],
    lore: "以希臘月神 Selene 命名；墨西哥奈卡水晶洞中的透石膏巨柱長逾 11 公尺，是地球最大晶體。" },

  { id: "howlite", zh: "白紋石", en: "Howlite", alias: "耐心之石", family: "硼酸鹽礦物",
    form: "tumbled", pal: ["#eceae4", "#b9b6ad", "#ffffff"], chakra: ["頂輪"], element: "風", hard: "3.5",
    origin: "加拿大・美國",
    fx: ["磨平急躁與怒氣", "深層助眠、安撫失眠翻騰", "練習延遲滿足與耐心", "吸收過載情緒"],
    uses: ["睡眠", "平靜"], nm: 1, fm: 2,
    moonNote: "放枕邊的睡前石；滿月夜把「太急著要答案的事」交給時間。",
    cleanse: ["月光", "晶簇"], avoid: ["怕水，多孔易吸汙；市售藍色多為染色仿綠松石"],
    lore: "灰色蛛網紋常被染成藍色冒充綠松石，反而讓它以「百變仿妝石」聞名；以加拿大化學家 Henry How 命名。" },

  /* —— 綠色系・心輪 Heart Stones —— */
  { id: "malachite", zh: "孔雀石", en: "Malachite", alias: "轉化守護者", family: "碳酸鹽礦物",
    form: "slab", pal: ["#2f8a57", "#145232", "#7cc99a"], chakra: ["心輪"], element: "土", hard: "3.5–4",
    origin: "剛果・俄羅斯",
    fx: ["強力吸附負能量與病氣（傳統說法）", "揭示並打破重複的舊模式", "守護旅途與心輪", "深綠同心紋如守護之眼"],
    uses: ["守護", "健康", "淨化"], nm: 1, fm: 3,
    moonNote: "滿月「斷捨離」儀式石：檢視這個月想終止的循環。",
    cleanse: ["晶簇", "薰香"], avoid: ["怕水怕酸！含銅有毒勿磨粉勿泡水，戴後洗手"],
    lore: "古埃及人磨它做綠色眼影兼防蚊；俄國沙皇冬宮有整座孔雀石廳，數噸礦石貼出的綠色大廳。" },

  { id: "prehnite", zh: "葡萄石", en: "Prehnite", alias: "預言家之石", family: "矽酸鹽礦物",
    form: "tumbled", pal: ["#bcd48f", "#8aa855", "#e6f0cc"], chakra: ["心輪"], element: "土", hard: "6–6.5",
    origin: "澳洲・中國・馬利",
    fx: ["連結直覺與預感", "療癒者與助人工作者的護持石", "溫潤招財（果凍綠如葡萄）", "安撫噩夢與擔憂"],
    uses: ["財富", "靈性", "平靜"], nm: 2, fm: 2,
    moonNote: "新月替助人志業與副業許願；夢工作者的枕邊石。",
    cleanse: ["月光", "流水", "晶簇"], avoid: [],
    lore: "第一個以人名命名的礦物（荷蘭上校 Hendrik von Prehn）；頂級冰種果凍體在亞洲市場稱「翡翠色的月光」。" },

  { id: "jade", zh: "翡翠（玉）", en: "Jade / Jadeite", alias: "東方平安石", family: "輝石家族",
    form: "cab", pal: ["#5ba86f", "#2e7346", "#a8d8b4"], chakra: ["心輪"], element: "土", hard: "6.5–7",
    origin: "緬甸・瓜地馬拉",
    fx: ["保平安、擋災（碎裂代主擋劫之說）", "招財納福、世代傳承", "養德潤心，君子比德於玉", "溫和滋養健康"],
    uses: ["守護", "財富", "健康"], nm: 2, fm: 2,
    moonNote: "傳家與長輩緣的許願石；新月替家庭和樂立願。",
    cleanse: ["流水", "月光"], avoid: ["避高溫乾燥，人養玉、玉養人需常佩戴"],
    lore: "華人文化五德之石（仁義智勇潔）；馬雅與毛利文化同樣視玉為聖石——三大古文明不約而同的選擇。" },

  /* —— 粉色系・愛與療癒 —— */
  { id: "rhodochrosite", zh: "紅紋石（菱錳礦）", en: "Rhodochrosite", alias: "印加玫瑰", family: "碳酸鹽礦物",
    form: "slab", pal: ["#e87f96", "#c04a66", "#f7ccd6"], chakra: ["心輪"], element: "火", hard: "3.5–4",
    origin: "阿根廷・秘魯",
    fx: ["招正緣的名石", "修復自我價值感", "翻開塵封的情感記憶並釋放", "喚回對生活的熱情"],
    uses: ["愛情", "健康", "勇氣"], nm: 3, fm: 2,
    moonNote: "新月正緣許願第一名：具體寫下理想伴侶的相處樣貌（而非條件清單）。",
    cleanse: ["月光", "晶簇"], avoid: ["怕水怕汗怕酸，玫瑰紋會霧化，單獨輕放"],
    lore: "阿根廷國石「印加玫瑰」，傳說是印加帝王與王后的血凝成；13 號洞穴的鐘乳石紅紋石切片如玫瑰年輪。" },

  { id: "rhodonite", zh: "薔薇輝石", en: "Rhodonite", alias: "情緒急救石", family: "輝石家族",
    form: "tumbled", pal: ["#d87a8a", "#a84656", "#f0c2ca"], chakra: ["心輪"], element: "火", hard: "5.5–6.5",
    origin: "俄羅斯・澳洲",
    fx: ["情緒創傷的急救繃帶", "練習原諒（他人與自己）", "黑色錳紋象徵傷疤化成智慧", "穩住暴怒與恐慌瞬間"],
    uses: ["平靜", "愛情", "健康"], nm: 1, fm: 3,
    moonNote: "滿月和解儀式：對一段關係說「我先放過自己」。",
    cleanse: ["月光", "晶簇"], avoid: ["避免長時間泡水"],
    lore: "俄羅斯烏拉山名石，沙皇時代用作嬰兒護身石放搖籃邊；粉底黑紋是氧化錳樹枝晶。" },

  { id: "opal", zh: "蛋白石（歐泊）", en: "Opal", alias: "繆思之石", family: "含水二氧化矽",
    form: "cab", pal: ["#e8e0f0", "#9ab8d8", "#f5c8d8"], chakra: ["全脈輪"], element: "水", hard: "5.5–6.5",
    origin: "澳洲・衣索比亞",
    fx: ["激發創造力與靈感", "放大當下的情緒（心誠則靈）", "增添個人光彩與戲劇性魅力", "藝術工作者的繆思"],
    uses: ["創造", "靈性", "愛情"], nm: 2, fm: 2,
    moonNote: "新月替創作計畫許願：作品集、個展、新歌、新書。",
    cleanse: ["月光"], avoid: ["怕乾怕熱怕撞（含水 6–10%），久放乾燥箱會裂"],
    lore: "游彩來自奈米二氧化矽小球的光柵繞射；羅馬人視為集所有寶石之美於一身，澳洲產量佔全球九成。" },

  /* —— 隕石・高頻 High Vibration —— */
  { id: "moldavite", zh: "捷克隕石（莫爾道玻隕石）", en: "Moldavite", alias: "星際轉化石", family: "玻隕石",
    form: "rough", pal: ["#5f7a2e", "#39511a", "#9ab55e"], chakra: ["心輪", "眉心輪"], element: "風＋火", hard: "5.5",
    origin: "捷克莫爾道河流域",
    fx: ["高頻加速轉化（傳說戴上會「暈晶」）", "快速鬆動卡住的人生", "連結星際與宇宙意識", "打開靈性覺醒的開關"],
    uses: ["靈性", "淨化", "勇氣"], nm: 2, fm: 2,
    moonNote: "只給準備好劇烈改變的人：新月許「請宇宙重新洗牌」的願要小心成真。",
    cleanse: ["月光", "晶簇"], avoid: ["市面偽品極多（綠玻璃），認明褶皺紋理與證書"],
    lore: "約 1,500 萬年前隕石撞擊巴伐利亞，熔融飛濺物冷凝成綠色玻璃雨落在捷克；TikTok 帶動全球缺貨與價格飆漲。" },

  { id: "super-seven", zh: "超級七（三輪骨幹）", en: "Super Seven", alias: "七合一聖石", family: "石英家族",
    form: "point", pal: ["#9a7ab0", "#6a4a80", "#d0b8e0"], chakra: ["全脈輪"], element: "風", hard: "7",
    origin: "巴西 Espírito Santo",
    fx: ["七種共生礦物的複合能量", "一石平衡所有脈輪", "身心靈全面升級", "傳統上認為免消磁且可淨化他石"],
    uses: ["靈性", "淨化", "守護", "健康"], nm: 3, fm: 3,
    moonNote: "新月滿月皆宜的全能選手；不知道帶哪顆時就帶它。",
    cleanse: ["傳統上免消磁", "月光"], avoid: ["認明內含物層次，市售常以紫髮晶充數"],
    lore: "白晶＋紫晶＋煙晶＋金紅石＋纖鐵礦＋針鐵礦＋鱗鐵礦七礦共生，由靈性作家 Melody 命名後風靡全球。" },

  { id: "herkimer", zh: "閃靈鑽（赫基蒙鑽石）", en: "Herkimer Diamond", alias: "夢之水晶", family: "石英家族",
    form: "octa", pal: ["#eef0f4", "#c0c6d4", "#ffffff"], chakra: ["頂輪", "眉心輪"], element: "風", hard: "7.5",
    origin: "美國紐約州 Herkimer 郡",
    fx: ["增強夢境清晰度與記夢能力", "傳統的清明夢與星光體之石", "雙尖結構雙向傳導能量", "小體積高頻率的放大器"],
    uses: ["睡眠", "靈性", "淨化"], nm: 2, fm: 3,
    moonNote: "與夢境日記是天作之合：睡前握著說「我會記得今晚的夢」，醒來立刻記錄。",
    cleanse: ["月光", "晶簇"], avoid: [],
    lore: "五億年前海底白雲岩孔洞中緩慢長成的天然雙尖水晶，透亮如鑽而得名；是夢工作者的第一聖品。" },
];

/* 快速索引 */
const CRYSTAL_BY_ID = Object.fromEntries(CRYSTAL_DB.map(c => [c.id, c]));

/* ============================================================
   復古礦物版畫風插圖（程序化 SVG）
   模仿 19 世紀 Minéralogie 博物圖鑑：墨線輪廓＋分面填色＋斜線陰影
   ============================================================ */
const INK = "#4a3a2c"; /* 版畫墨線色 */
let _svgSeq = 0;

/* 以字串種子產生確定性亂數（同一顆水晶每次長一樣） */
function crystalRng(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
const _pts = a => a.map(p => p.join(",")).join(" ");
function _poly(pts, fill, extra = "") { return `<polygon points="${_pts(pts)}" fill="${fill}" ${extra}/>`; }

/* 單根晶柱（六方柱＋錐頂的側視三面）；供 point/cluster 重用 */
function _pointAt(cx, baseY, h, w, pal, rot = 0, needles = 0, rng = Math.random) {
  const topY = baseY - h, shY = topY + h * 0.28; /* 錐頂肩線 */
  const L = cx - w / 2, R = cx + w / 2, l = cx - w / 6, r = cx + w / 6;
  const faces =
    _poly([[L, baseY], [L, shY], [cx, topY], [l, shY - h * 0.06], [l, baseY]], pal[1]) +
    _poly([[l, baseY], [l, shY - h * 0.06], [cx, topY], [r, shY - h * 0.06], [r, baseY]], pal[0]) +
    _poly([[r, baseY], [r, shY - h * 0.06], [cx, topY], [R, shY], [R, baseY]], pal[2]) +
    `<line x1="${l}" y1="${shY - h * 0.06}" x2="${l}" y2="${baseY}" stroke="${INK}" stroke-width=".5" opacity=".5"/>` +
    `<line x1="${r}" y1="${shY - h * 0.06}" x2="${r}" y2="${baseY}" stroke="${INK}" stroke-width=".5" opacity=".5"/>`;
  let needleLines = "";
  for (let i = 0; i < needles; i++) {
    const nx = L + w * (0.15 + rng() * 0.7), ny = baseY - h * (0.1 + rng() * 0.3);
    needleLines += `<line x1="${nx}" y1="${ny}" x2="${nx + (rng() - 0.3) * w * 0.5}" y2="${ny - h * (0.3 + rng() * 0.35)}" stroke="#b8860b" stroke-width="1" opacity=".8"/>`;
  }
  return `<g transform="rotate(${rot} ${cx} ${baseY})">${faces}${needleLines}</g>`;
}

/* 底部圍岩基座 */
function _matrix(rng, y = 100, wide = 66) {
  const cx = 60, pts = [];
  const n = 8;
  for (let i = 0; i <= n; i++) {
    const x = cx - wide / 2 + (wide / n) * i;
    pts.push([x, y - (i === 0 || i === n ? 0 : 4 + rng() * 7)]);
  }
  pts.push([cx + wide / 2, y + 6], [cx - wide / 2, y + 6]);
  return _poly(pts, "#8c7f6d", `stroke="${INK}" stroke-width="1"`) +
    `<ellipse cx="60" cy="${y + 7}" rx="${wide / 2 + 4}" ry="3.5" fill="${INK}" opacity=".14"/>`;
}

const CRYSTAL_FORMS = {
  point(pal, rng) {
    return _matrix(rng) + _pointAt(60, 101, 66, 30, pal, (rng() - 0.5) * 8) +
      _pointAt(41, 101, 30, 15, pal, -16 - rng() * 6) + _pointAt(80, 101, 26, 13, pal, 15 + rng() * 6);
  },
  cluster(pal, rng) {
    let s = _matrix(rng, 100, 78);
    const spots = [[32, -30], [46, -14], [60, 0], [74, 12], [88, 28], [53, -22], [67, 20]];
    for (const [x, rot] of spots) {
      const h = 26 + rng() * 30, w = 9 + rng() * 9;
      s += _pointAt(x, 97, h, w, pal, rot * 0.8 + (rng() - 0.5) * 10);
    }
    return s;
  },
  geode(pal, rng) {
    const teeth = [];
    const n = 15, cx = 60, cy = 66, R = 40;
    let inner = "";
    for (let i = 0; i <= n; i++) {
      const a = Math.PI + (i / n) * Math.PI; /* 上半弧 */
      const x1 = cx + Math.cos(a) * R * 0.78, y1 = cy + Math.sin(a) * R * 0.72;
      const a2 = Math.PI + ((i + 0.5) / n) * Math.PI;
      const x2 = cx + Math.cos(a2) * R * 0.45, y2 = cy + Math.sin(a2) * R * 0.42;
      const a3 = Math.PI + ((i + 1) / n) * Math.PI;
      const x3 = cx + Math.cos(a3) * R * 0.78, y3 = cy + Math.sin(a3) * R * 0.72;
      inner += _poly([[x1, y1], [x2, y2], [x3, y3]], i % 2 ? pal[0] : pal[2], `stroke="${INK}" stroke-width=".4"`);
      teeth.push(0);
    }
    return `<ellipse cx="${cx}" cy="${cy + 32}" rx="46" ry="4" fill="${INK}" opacity=".14"/>
      <path d="M ${cx - R} ${cy} A ${R} ${R * 0.92} 0 0 1 ${cx + R} ${cy} L ${cx + R} ${cy + 26} A ${R} ${R * 0.3} 0 0 1 ${cx - R} ${cy + 26} Z" fill="#9a8d7c" stroke="${INK}" stroke-width="1.2"/>
      <path d="M ${cx - R * 0.86} ${cy} A ${R * 0.86} ${R * 0.8} 0 0 1 ${cx + R * 0.86} ${cy} L ${cx - R * 0.86} ${cy} Z" fill="${pal[1]}"/>
      ${inner}
      <path d="M ${cx - R} ${cy} L ${cx + R} ${cy}" stroke="${INK}" stroke-width="1"/>`;
  },
  tumbled(pal, rng) {
    let speck = "";
    for (let i = 0; i < 16; i++) {
      const a = rng() * Math.PI * 2, r = rng() * 26;
      speck += `<circle cx="${60 + Math.cos(a) * r * 1.15}" cy="${62 + Math.sin(a) * r * 0.78}" r="${0.7 + rng() * 1.4}" fill="${i % 3 ? pal[1] : pal[2]}" opacity=".8"/>`;
    }
    return `<ellipse cx="60" cy="97" rx="38" ry="4.5" fill="${INK}" opacity=".14"/>
      <path d="M 26 62 C 26 38, 44 28, 62 29 C 84 30, 95 44, 94 63 C 93 82, 78 93, 58 92 C 38 91, 26 80, 26 62 Z"
        fill="${pal[0]}" stroke="${INK}" stroke-width="1.3"/>
      ${speck}
      <path d="M 36 48 C 42 38, 54 34, 64 35" fill="none" stroke="${pal[2]}" stroke-width="3.5" stroke-linecap="round" opacity=".7"/>`;
  },
  cab(pal, rng) {
    return `<ellipse cx="60" cy="96" rx="36" ry="4.5" fill="${INK}" opacity=".14"/>
      <ellipse cx="60" cy="62" rx="34" ry="30" fill="${pal[0]}" stroke="${INK}" stroke-width="1.3"/>
      <ellipse cx="60" cy="62" rx="34" ry="30" fill="url(#cabgrad${_svgSeq})"/>
      <path d="M 34 55 C 44 40, 70 36, 84 48" fill="none" stroke="${pal[2]}" stroke-width="4.5" stroke-linecap="round" opacity=".85"/>
      <path d="M 40 74 C 52 82, 72 80, 80 70" fill="none" stroke="${pal[1]}" stroke-width="3" stroke-linecap="round" opacity=".5"/>
      <defs><radialGradient id="cabgrad${_svgSeq}" cx="38%" cy="32%" r="80%">
        <stop offset="0%" stop-color="${pal[2]}" stop-opacity=".9"/><stop offset="55%" stop-color="${pal[0]}" stop-opacity="0"/>
        <stop offset="100%" stop-color="${pal[1]}" stop-opacity=".55"/></radialGradient></defs>`;
  },
  slab(pal, rng) {
    const shape = "M 24 66 C 22 44, 38 30, 62 30 C 86 30, 98 44, 96 64 C 94 84, 80 94, 56 93 C 34 92, 26 82, 24 66 Z";
    let bands = "";
    for (let i = 0; i < 5; i++) {
      const y = 38 + i * 12, wob = () => (rng() - 0.5) * 8;
      bands += `<path d="M 20 ${y} C 45 ${y + wob()}, 75 ${y + wob()}, 100 ${y + (rng() - 0.5) * 6}
        L 100 ${y + 7} C 75 ${y + 7 + wob()}, 45 ${y + 7 + wob()}, 20 ${y + 7} Z"
        fill="${[pal[2], pal[0], pal[1]][i % 3]}" clip-path="url(#slabclip${_svgSeq})"/>`;
    }
    return `<ellipse cx="60" cy="97" rx="38" ry="4.5" fill="${INK}" opacity=".14"/>
      <defs><clipPath id="slabclip${_svgSeq}"><path d="${shape}"/></clipPath></defs>
      <path d="${shape}" fill="${pal[0]}"/>${bands}
      <path d="${shape}" fill="none" stroke="${INK}" stroke-width="1.3"/>`;
  },
  rough(pal, rng) {
    const cx = 60, cy = 62, pts = [];
    const n = 8;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2, r = 26 + rng() * 12;
      pts.push([cx + Math.cos(a) * r * 1.15, cy + Math.sin(a) * r * 0.95]);
    }
    const facets = pts.map((p, i) =>
      _poly([[cx, cy], p, pts[(i + 1) % n]], [pal[0], pal[2], pal[1]][i % 3], `stroke="${INK}" stroke-width=".45" stroke-opacity=".6"`)).join("");
    return `<ellipse cx="60" cy="98" rx="36" ry="4.5" fill="${INK}" opacity=".14"/>${facets}
      <polygon points="${_pts(pts)}" fill="none" stroke="${INK}" stroke-width="1.3"/>`;
  },
  cube(pal, rng) {
    const cube = (x, y, s) => `
      <polygon points="${x},${y} ${x + s},${y - s * 0.4} ${x + s * 2},${y} ${x + s},${y + s * 0.4}" fill="${pal[2]}" stroke="${INK}" stroke-width="1"/>
      <polygon points="${x},${y} ${x + s},${y + s * 0.4} ${x + s},${y + s * 1.5} ${x},${y + s * 1.1}" fill="${pal[1]}" stroke="${INK}" stroke-width="1"/>
      <polygon points="${x + s},${y + s * 0.4} ${x + s * 2},${y} ${x + s * 2},${y + s * 1.1} ${x + s},${y + s * 1.5}" fill="${pal[0]}" stroke="${INK}" stroke-width="1"/>
      ${[0.35, 0.6, 0.85].map(q => `<line x1="${x + s + 2}" y1="${y + s * 0.4 + (s * 1.1) * q}" x2="${x + s * 2 - 2}" y2="${y + (s * 1.1) * q}" stroke="${INK}" stroke-width=".5" opacity=".45"/>`).join("")}`;
    return _matrix(rng, 102, 72) + cube(30, 62, 17) + cube(56, 48, 22) + cube(50, 80, 12);
  },
  octa(pal, rng) {
    const cx = 60, top = 22, bot = 96, mid = 59, w = 33;
    return `<ellipse cx="60" cy="99" rx="30" ry="4" fill="${INK}" opacity=".14"/>
      ${_poly([[cx, top], [cx - w, mid], [cx, bot]], pal[1])}
      ${_poly([[cx, top], [cx + w, mid], [cx, bot]], pal[0])}
      ${_poly([[cx, top], [cx - w * 0.28, mid + 4], [cx, bot]], pal[2], `opacity=".85"`)}
      <line x1="${cx - w}" y1="${mid}" x2="${cx + w}" y2="${mid}" stroke="${INK}" stroke-width=".7" opacity=".6"/>
      <polygon points="${_pts([[cx, top], [cx - w, mid], [cx, bot], [cx + w, mid]])}" fill="none" stroke="${INK}" stroke-width="1.3"/>`;
  },
  blade(pal, rng) {
    const blade = (x, y, len, w, rot) => `<g transform="rotate(${rot} ${x} ${y})">
      <polygon points="${x},${y} ${x + w},${y - 4} ${x + w},${y - len} ${x},${y - len + 6}" fill="${pal[0]}" stroke="${INK}" stroke-width="1.1"/>
      <polygon points="${x + w},${y - 4} ${x + w + 5},${y - 8} ${x + w + 5},${y - len - 3} ${x + w},${y - len}" fill="${pal[1]}" stroke="${INK}" stroke-width="1.1"/>
      ${[0.3, 0.55, 0.8].map(q => `<line x1="${x + w * q}" y1="${y - 2 - q * 3}" x2="${x + w * q}" y2="${y - len + 5 - q * 2}" stroke="${pal[2]}" stroke-width="1.2" opacity=".7"/>`).join("")}
    </g>`;
    return _matrix(rng, 102, 62) +
      blade(42, 100, 62, 15, -10 + rng() * 4) + blade(64, 100, 46, 12, 12 + rng() * 5);
  },
};

/* 產生一張復古插圖 SVG（含斜線陰影 overlay） */
function crystalSVG(c, cls = "") {
  const rng = crystalRng(c.id);
  const seq = ++_svgSeq;
  const body = (CRYSTAL_FORMS[c.form] || CRYSTAL_FORMS.tumbled)(c.pal, rng);
  return `<svg class="${cls}" viewBox="0 0 120 120" role="img" aria-label="${esc(c.zh)}插圖" stroke-linejoin="round">
    <defs><pattern id="hatch${seq}" width="4" height="4" patternTransform="rotate(38)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="4" stroke="${INK}" stroke-width=".55"/></pattern></defs>
    ${body}
    <rect x="0" y="0" width="120" height="120" fill="url(#hatch${seq})" opacity=".13" style="mix-blend-mode:multiply"/>
  </svg>`;
}

/* ============================================================
   月相 × 水晶搭配
   ============================================================ */
function crystalsForMoon(kind, limit = 6) {
  const key = kind === "new" ? "nm" : "fm";
  return [...CRYSTAL_DB].sort((a, b) => b[key] - a[key] || a.zh.localeCompare(b.zh)).filter(c => c[key] >= 2).slice(0, limit);
}
function crystalOfTheDay() {
  const now = new Date();
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  return CRYSTAL_DB[(dayOfYear * 7 + now.getFullYear()) % CRYSTAL_DB.length];
}
/* 顯化儀式裡的水晶建議（app.js 的 openManifestRitual 會呼叫） */
function crystalRitualHintHTML() {
  const info = moonInfo(new Date());
  const isWaxing = info.age <= SYNODIC / 2; /* 新月→滿月屬「種下」，滿月→新月屬「釋放感恩」 */
  const picks = crystalsForMoon(isWaxing ? "new" : "full", 3);
  return `<p class="muted small">${info.e} ${esc(info.n)}・適合搭配的水晶：${picks.map(c =>
    `<a href="#" class="crystal-hint-link" data-cid="${c.id}">${esc(c.zh)}</a>`).join("・")}
    <br>手邊若有，握在左手（傳統上左進右出）一起進行儀式。</p>`;
}

/* ============================================================
   許願 × 水晶儀式教學
   ============================================================ */
const CRYSTAL_RITUALS = {
  newmoon: { icon: "🌑", name: "新月許願 × 水晶", when: "新月當天起 48 小時內",
    crystals: ["citrine", "green-phantom", "rose-quartz", "rhodochrosite", "clear-quartz", "blue-apatite"],
    steps: [
      "淨化空間與水晶（薰香繞三圈，或提前一晚放晶簇上）",
      "依願望挑水晶：財富事業＝黃水晶／綠幽靈；感情＝粉晶／紅紋石；目標清單＝藍磷灰石；不確定就用白水晶",
      "在紙上寫下 2～10 個願望，用現在式肯定句（「我正在……」「我已經……」）",
      "把水晶壓在願望紙上，握手成杯狀罩著它，閉眼觀想每個願望實現的畫面各 30 秒",
      "說「這個或更好的，正以最高善的方式來到我身上」，把紙折好與水晶一起放到下個滿月",
    ] },
  fullmoon: { icon: "🌕", name: "滿月感恩・釋放 × 水晶", when: "滿月前後各一天",
    crystals: ["moonstone", "obsidian", "smoky-quartz", "black-tourmaline", "labradorite", "lepidolite"],
    steps: [
      "回顧上個新月的願望紙：實現的說謝謝，未實現的問自己「還想要嗎？」",
      "拿一顆釋放系水晶（黑曜石／煙晶／黑碧璽），寫下想放下的人事物或情緒",
      "握著水晶把清單讀一遍，深呼吸三次，想像它們隨吐氣離開身體",
      "把清單撕掉丟棄；水晶用月光淨化一夜，象徵一起歸零",
      "結尾寫三件感恩的事——滿月是收成，感恩讓豐盛循環",
    ] },
  charge: { icon: "🌝", name: "滿月消磁・充能月光浴", when: "滿月夜（陰天也有效，月光穿雲）",
    crystals: ["clear-quartz", "moonstone", "selenite", "amethyst", "super-seven", "herkimer"],
    steps: [
      "把常戴的水晶取下，用軟布輕拭灰塵與皮脂",
      "檢查禁忌：怕水的（透石膏／孔雀石／黃鐵礦／天使石）跳過流水，直接月光",
      "放在窗台或陽台（玻璃內側也可），托盤鋪白布或放透石膏板上加乘",
      "月光浴一夜；日出前收回（怕曬的紫晶粉晶避開晨光直射）",
      "收回時握在手心說一句感謝，重新設定它接下來一個月的任務（意圖）",
    ] },
  grid: { icon: "✨", name: "顯化水晶陣 Crystal Grid", when: "任何想加強顯化的時刻，新月尤佳",
    crystals: ["clear-quartz", "citrine", "rutilated-quartz", "rose-quartz", "amethyst", "green-aventurine"],
    steps: [
      "選一個主題（財富／愛情／健康），中心放一顆主水晶（晶柱最佳，能量向上）",
      "外圈以 6 或 8 顆小水晶對稱圍繞（幾何對稱＝意圖聚焦），可墊神聖幾何陣布",
      "把寫好的願望紙折小放在主水晶下方",
      "用一根白水晶柱從外圈依序「畫線」連到中心，像接通電路",
      "放在不受打擾的角落至少一個月相週期（約 29.5 天），每逢新滿月靜心一分鐘重新觀想",
    ] },
};

/* ============================================================
   主畫面：水晶分頁
   ============================================================ */
let _crystalFilter = { use: "", moon: "", q: "" };

function renderCrystal() {
  const el = $("#view-crystal");
  const cod = crystalOfTheDay();
  const info = moonInfo(new Date());
  const isWaxing = info.age <= SYNODIC / 2;
  const moonPicks = crystalsForMoon(isWaxing ? "new" : "full", 4);
  const col = store.data.crystals || [];

  el.innerHTML = `
    <div class="card">
      <h2>💎 今日水晶 <span class="sub">${info.e} ${esc(info.n)}・月亮 ${info.illum}%</span></h2>
      <button type="button" class="cod-row" data-cid="${cod.id}">
        <div class="cod-fig">${crystalSVG(cod)}</div>
        <div class="cod-txt">
          <b>${esc(cod.zh)}</b> <span class="cod-en">${esc(cod.en)}</span>
          <p class="muted small">${esc(cod.fx[0])}・${esc(cod.fx[1] || "")}</p>
          <p class="small cod-lore">${esc(cod.lore)}</p>
        </div>
      </button>
      <p class="muted small" style="margin-top:8px">${info.e} ${isWaxing ? "月亮漸盈，適合「種下意圖」的水晶：" : "月亮漸虧，適合「感恩釋放・充能」的水晶："}
        ${moonPicks.map(c => `<a href="#" class="crystal-hint-link" data-cid="${c.id}">${esc(c.zh)}</a>`).join("・")}</p>
    </div>

    <div class="card bracelet-card">
      <h2>💫 訂製你的專屬水晶手鍊</h2>
      <p class="muted small">由 Crystibee 1:1 客製化，依你的命盤五行設計最適合你的水晶飾品。</p>
      <div class="btn-row">
        <a class="btn bracelet-btn" href="https://crystibee.cashier.ecpay.com.tw/product/000000000562210" target="_blank" rel="noopener">✨ 前往 Crystibee 訂製</a>
      </div>
    </div>

    <div class="card">
      <h2>🗄 我的水晶收藏架 <span class="sub">${col.length} 顆</span></h2>
      <p class="muted small">拍下你買回家的水晶，記錄日期・地點・價格，蒐集成一張自己的博物圖鑑海報。</p>
      <div id="crystal-shelf"></div>
      <div class="btn-row">
        <button class="btn" id="col-add">📷 收藏一顆新水晶</button>
        ${col.length ? `<button class="btn secondary" id="col-stats">📊 收藏統計</button>` : ""}
      </div>
    </div>

    <div class="card">
      <h2>📖 水晶圖鑑 <span class="sub">Minéralogie・${CRYSTAL_DB.length} 種</span></h2>
      <input type="search" id="cf-q" placeholder="搜尋中英文名稱、功效…" value="${esc(_crystalFilter.q)}">
      <div class="crystal-filters" id="cf-use">
        ${Object.entries(CRYSTAL_USES).map(([k, e]) => `<button type="button" class="chip ${_crystalFilter.use === k ? "on" : ""}" data-v="${k}">${e} ${k}</button>`).join("")}
      </div>
      <div class="crystal-filters" id="cf-moon">
        <button type="button" class="chip ${_crystalFilter.moon === "new" ? "on" : ""}" data-v="new">🌑 新月許願</button>
        <button type="button" class="chip ${_crystalFilter.moon === "full" ? "on" : ""}" data-v="full">🌕 滿月釋放充能</button>
      </div>
      <div id="crystal-poster"></div>
    </div>

    <div class="card">
      <h2>🕯 許願 × 水晶教學</h2>
      <p class="muted small">跟著月亮的呼吸使用水晶：新月種下、滿月收成與放下。</p>
      <div class="btn-col">
        ${Object.entries(CRYSTAL_RITUALS).map(([k, r]) =>
          `<button class="btn secondary ritual-open" data-rk="${k}">${r.icon} ${esc(r.name)}</button>`).join("")}
      </div>
    </div>

    <p class="disclaimer">水晶功效為各文化民俗與能量傳統之整理，屬心靈儀式與自我紀錄用途，非科學實證、不能替代醫療。</p>`;

  renderCrystalShelf();
  renderCrystalPoster();

  $(".cod-row", el).addEventListener("click", () => openCrystalDetail(cod.id));
  $("#col-add", el).addEventListener("click", () => openCollectForm({}));
  $("#col-stats", el)?.addEventListener("click", openCollectionStats);
  $("#cf-q", el).addEventListener("input", e => { _crystalFilter.q = e.target.value.trim(); renderCrystalPoster(); });
  $("#cf-use", el).addEventListener("click", e => {
    const b = e.target.closest(".chip"); if (!b) return;
    _crystalFilter.use = _crystalFilter.use === b.dataset.v ? "" : b.dataset.v;
    $$(".chip", $("#cf-use", el)).forEach(c => c.classList.toggle("on", c.dataset.v === _crystalFilter.use));
    renderCrystalPoster();
  });
  $("#cf-moon", el).addEventListener("click", e => {
    const b = e.target.closest(".chip"); if (!b) return;
    _crystalFilter.moon = _crystalFilter.moon === b.dataset.v ? "" : b.dataset.v;
    $$(".chip", $("#cf-moon", el)).forEach(c => c.classList.toggle("on", c.dataset.v === _crystalFilter.moon));
    renderCrystalPoster();
  });
  $$(".ritual-open", el).forEach(b => b.addEventListener("click", () => openCrystalRitual(b.dataset.rk)));
}

/* 圖鑑海報（Minéralogie 復古排版） */
function filteredCrystals() {
  const { use, moon, q } = _crystalFilter;
  return CRYSTAL_DB.filter(c => {
    if (use && !c.uses.includes(use)) return false;
    if (moon === "new" && c.nm < 2) return false;
    if (moon === "full" && c.fm < 2) return false;
    if (q) {
      const hay = [c.zh, c.en, c.alias, c.family, ...c.fx, ...c.uses].join(" ").toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });
}
function renderCrystalPoster() {
  const box = $("#crystal-poster");
  if (!box) return;
  const list = filteredCrystals();
  const showSuggest = !_crystalFilter.q && !_crystalFilter.use && !_crystalFilter.moon;
  box.innerHTML = `
    <div class="mineral-poster">
      <div class="mp-title">MINÉRALOGIE</div>
      <div class="mp-subtitle">— 水晶礦石圖鑑 —</div>
      <div class="mp-grid">
        ${list.map(c => `
          <button type="button" class="mp-item" data-cid="${c.id}">
            <span class="mp-num">${CRYSTAL_DB.indexOf(c) + 1}.</span>
            <span class="mp-fig">${crystalSVG(c)}</span>
            <span class="mp-name">${esc(c.zh)}<small>${esc(c.en)}</small></span>
          </button>`).join("") || `<p class="muted small" style="grid-column:1/-1;text-align:center">沒有符合的水晶，換個條件試試 ✨</p>`}
        ${showSuggest ? `
          <button type="button" class="mp-item mp-suggest" id="mp-suggest">
            <span class="mp-num">${CRYSTAL_DB.length + 1}.</span>
            <span class="mp-fig"><span class="mp-suggest-glyph">＋</span></span>
            <span class="mp-name">新水晶種類建議<small>Suggest a new one</small></span>
          </button>` : ""}
      </div>
      <div class="mp-footer">· ORDRE DES MATIÈRES ·<br>
        <span>${list.slice(0, 24).map((c, i) => `${CRYSTAL_DB.indexOf(c) + 1}. ${esc(c.en)}`).join(" — ")}${list.length > 24 ? " — …" : ""}</span>
      </div>
    </div>`;
  $$(".mp-item", box).forEach(b => {
    if (b.id === "mp-suggest") return;
    b.addEventListener("click", () => openCrystalDetail(b.dataset.cid));
  });
  $("#mp-suggest", box)?.addEventListener("click", openCrystalSuggestForm);
}

/* 新水晶種類建議：把使用者的想法送給 Blue（透過 /api/register 或本機收件匣） */
function openCrystalSuggestForm() {
  const m = modal(`
    <h3>＋ 新水晶種類建議</h3>
    <p class="muted small">想收藏但圖鑑裡還沒有？把它告訴 Blue，之後版本會補進來。</p>
    <label class="field">水晶中／英文名稱</label>
    <input type="text" id="cs-name" placeholder="例：拉利瑪、Ocean Jasper⋯">
    <label class="field">你想被記住的原因（選填）</label>
    <textarea id="cs-why" style="min-height:64px" placeholder="這顆水晶對你的意義、或為什麼想放進圖鑑⋯"></textarea>
    <div class="btn-row">
      <button class="btn" id="cs-send">送出 — 謝謝你的意見 🩵</button>
      <button class="btn secondary" id="cs-cancel">取消</button>
    </div>`);
  $("#cs-cancel", m).addEventListener("click", () => m.remove());
  $("#cs-send", m).addEventListener("click", async () => {
    const name = $("#cs-name", m).value.trim();
    const why = $("#cs-why", m).value.trim();
    if (!name) return toast("先告訴我水晶的名稱");
    // 本機收件匣（離線也不會遺失）
    store.data.settings.crystalSuggestions ||= [];
    store.data.settings.crystalSuggestions.push({ name, why, at: new Date().toISOString() });
    store.save();
    // 有帳號就順便寄回後端
    try {
      const email = store.data.settings.account?.email || "";
      await fetch("api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, kind: "crystal-suggest", name, why }),
      });
    } catch {}
    m.remove();
    toast("已送出，謝謝你的意見 🩵 未來版本會補進圖鑑");
  });
}

/* 詳細頁 */
function openCrystalDetail(cid) {
  const c = CRYSTAL_BY_ID[cid];
  if (!c) return;
  const owned = (store.data.crystals || []).filter(x => x.crystalId === cid);
  const moonTags = [c.nm >= 2 ? "🌑 新月許願" : "", c.fm >= 2 ? "🌕 滿月釋放充能" : ""].filter(Boolean).join("・");
  const m = modal(`
    <div class="cd-head">
      <div class="cd-fig mineral-paper">${crystalSVG(c)}</div>
      <div>
        <h3 style="margin:0">${esc(c.zh)}</h3>
        <p class="cd-en">${esc(c.en)}</p>
        <p class="muted small">${esc(c.alias)}・${esc(c.family)}</p>
        <p class="small">${c.chakra.map(k => `<span class="chakra-dot" style="background:${CHAKRAS[k]?.c || "#999"}"></span>${esc(k)}`).join(" ")}
          ・${esc(c.element)}元素・硬度 ${esc(c.hard)}</p>
      </div>
    </div>
    <div class="socratic">${c.fx.map(f => `✦ ${esc(f)}`).join("<br>")}</div>
    <p class="small"><b>🏷 用途</b>：${c.uses.map(u => `${CRYSTAL_USES[u]} ${u}`).join("・")}</p>
    ${moonTags ? `<p class="small"><b>🌙 月相搭配</b>：${moonTags}<br><span class="muted">${esc(c.moonNote)}</span></p>` : `<p class="small muted">${esc(c.moonNote)}</p>`}
    <p class="small"><b>🕊 淨化</b>：${c.cleanse.map(esc).join("・")}</p>
    ${c.avoid.length ? `<p class="small" style="color:var(--danger)"><b>⚠️ 保養禁忌</b>：${c.avoid.map(esc).join("；")}</p>` : ""}
    <p class="small"><b>⛰ 主要產地</b>：${esc(c.origin)}</p>
    <p class="small muted cod-lore">📜 ${esc(c.lore)}</p>
    ${owned.length ? `<p class="small">🗄 你的收藏裡有 ${owned.length} 顆${esc(c.zh)}</p>` : ""}
    <div class="btn-row">
      <button class="btn" id="cd-collect">📷 我買了一顆，收藏它</button>
      <button class="btn secondary" id="cd-close">關閉</button>
    </div>`);
  $("#cd-close", m).addEventListener("click", () => m.remove());
  $("#cd-collect", m).addEventListener("click", () => { m.remove(); openCollectForm({ crystalId: cid }); });
}

/* ============================================================
   虛擬收藏架
   ============================================================ */
function renderCrystalShelf() {
  const box = $("#crystal-shelf");
  if (!box) return;
  const col = [...(store.data.crystals || [])].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  if (!col.length) {
    box.innerHTML = `<div class="mineral-poster mp-empty">
      <div class="mp-title" style="font-size:1.05em">MY COLLECTION</div>
      <p class="muted small" style="text-align:center;padding:14px 10px">收藏架還空著。<br>把你的第一顆水晶放上來吧 💎</p>
    </div>`;
    return;
  }
  box.innerHTML = `
    <div class="mineral-poster">
      <div class="mp-title">MY COLLECTION</div>
      <div class="mp-subtitle">— 我的水晶收藏 —</div>
      <div class="mp-grid">
        ${col.map((it, i) => {
          const c = CRYSTAL_BY_ID[it.crystalId];
          return `<button type="button" class="mp-item" data-id="${it.id}">
            <span class="mp-num">${col.length - i}.</span>
            <span class="mp-fig">${it.photoId
              ? `<img class="shelf-photo" data-photo="${esc(it.photoId)}" alt="${esc(it.name)}">`
              : (c ? crystalSVG(c) : `<span class="shelf-noimg">💎</span>`)}</span>
            <span class="mp-name">${esc(it.name)}<small>${esc(c?.en || it.enName || "")}</small></span>
          </button>`;
        }).join("")}
      </div>
      <div class="mp-footer">· ${col.length} SPÉCIMENS ·</div>
    </div>`;
  $$(".shelf-photo", box).forEach(img => renderPhoto(img, img.dataset.photo));
  $$(".mp-item", box).forEach(b => b.addEventListener("click", () => openCollectionItem(b.dataset.id)));
}

function openCollectionItem(id) {
  const it = (store.data.crystals || []).find(x => x.id === id);
  if (!it) return;
  const c = CRYSTAL_BY_ID[it.crystalId];
  const m = modal(`
    <div class="cd-head">
      <div class="cd-fig mineral-paper">${it.photoId ? `<img class="shelf-photo big" alt="${esc(it.name)}">` : (c ? crystalSVG(c) : "💎")}</div>
      <div>
        <h3 style="margin:0">${esc(it.name)}</h3>
        ${c ? `<p class="cd-en">${esc(c.en)}</p>` : ""}
        <p class="muted small">${[it.date && `📅 ${esc(it.date)}`, it.place && `📍 ${esc(it.place)}`, it.price && `💰 ${esc(it.price)} ${esc(it.currency || "")}`].filter(Boolean).join("<br>") || "尚未填寫購買資訊"}</p>
      </div>
    </div>
    ${it.intent ? `<p class="small"><b>🎯 給它的任務</b>：${esc(it.intent)}</p>` : ""}
    ${it.note ? `<p class="small muted">${esc(it.note)}</p>` : ""}
    ${c ? `<p class="small muted">✦ ${esc(c.fx[0])}・淨化：${c.cleanse.slice(0, 3).map(esc).join("・")}${c.avoid.length ? `<br>⚠️ ${esc(c.avoid[0])}` : ""}</p>` : ""}
    <div class="btn-row">
      ${c ? `<button class="btn secondary" id="ci-info">📖 圖鑑資料</button>` : ""}
      <button class="btn secondary" id="ci-edit">✏️ 編輯</button>
      <button class="btn ghost" id="ci-del">🗑</button>
      <button class="btn secondary" id="ci-close">關閉</button>
    </div>`);
  if (it.photoId) renderPhoto($(".shelf-photo", m), it.photoId);
  $("#ci-close", m).addEventListener("click", () => m.remove());
  $("#ci-info", m)?.addEventListener("click", () => { m.remove(); openCrystalDetail(it.crystalId); });
  $("#ci-edit", m).addEventListener("click", () => { m.remove(); openCollectForm({ existing: it }); });
  $("#ci-del", m).addEventListener("click", async () => {
    if (!confirm(`把「${it.name}」從收藏架移除？`)) return;
    if (it.photoId) await idb.del(it.photoId);
    store.data.crystals = store.data.crystals.filter(x => x.id !== id);
    store.save(); m.remove();
    if (currentTab === "crystal") renderCrystal(); else renderCrystalShelf();
    toast("已從收藏架移除");
  });
}

function openCollectForm({ crystalId = "", existing = null } = {}) {
  const it = existing || { crystalId, name: "", date: todayStr(), place: "", price: "", currency: "TWD", note: "", intent: "", photoId: "" };
  let photoData = null; /* 新選的照片 dataURL */
  const opts = CRYSTAL_DB.map(c => `<option value="${c.id}" ${c.id === it.crystalId ? "selected" : ""}>${esc(c.zh)} ${esc(c.en)}</option>`).join("");
  const m = modal(`
    <h3>${existing ? "✏️ 編輯收藏" : "📷 收藏一顆新水晶"}</h3>
    <label class="field">水晶種類（找不到可選「其他」再自訂名稱）</label>
    <select id="cl-kind"><option value="">— 其他／自訂 —</option>${opts}</select>
    <label class="field">名稱（自動帶入，可自己改，如「阿嬤送的紫晶洞」）</label>
    <input type="text" id="cl-name" value="${esc(it.name)}" placeholder="這顆水晶的名字">
    <label class="field">照片</label>
    <div class="btn-row">
      <button class="btn secondary" id="cl-photo-btn">📷 拍照／選照片</button>
      <span class="muted small" id="cl-photo-hint">${it.photoId ? "已有照片，可重新選擇" : "沒拍也沒關係，會用復古插圖代替"}</span>
    </div>
    <input type="file" id="cl-photo" accept="image/*" capture="environment" class="hidden">
    <div class="field-row">
      <div><label class="field">購入日期</label><input type="date" id="cl-date" value="${esc(it.date)}"></div>
      <div><label class="field">地點</label><input type="text" id="cl-place" value="${esc(it.place)}" placeholder="店名／城市／網購"></div>
    </div>
    <div class="field-row">
      <div><label class="field">價格</label><input type="number" id="cl-price" value="${esc(it.price)}" placeholder="0" min="0" step="any"></div>
      <div><label class="field">幣別</label><select id="cl-cur">${["TWD", "USD", "JPY", "EUR", "CNY", "THB"].map(c => `<option ${c === (it.currency || "TWD") ? "selected" : ""}>${c}</option>`).join("")}</select></div>
    </div>
    <label class="field">給它的任務（意圖，選填）</label>
    <input type="text" id="cl-intent" value="${esc(it.intent)}" placeholder="例：守護我的新工作順利">
    <label class="field">筆記（選填）</label>
    <textarea id="cl-note" style="min-height:48px" placeholder="購買的故事、當下的心情…">${esc(it.note)}</textarea>
    <div class="btn-row">
      <button class="btn" id="cl-save">${existing ? "儲存" : "放上收藏架 🗄"}</button>
      <button class="btn secondary" id="cl-cancel">取消</button>
    </div>`);
  const kindSel = $("#cl-kind", m), nameInp = $("#cl-name", m);
  kindSel.addEventListener("change", () => {
    const c = CRYSTAL_BY_ID[kindSel.value];
    if (c && (!nameInp.value.trim() || CRYSTAL_DB.some(x => x.zh === nameInp.value.trim()))) nameInp.value = c.zh;
  });
  if (!existing && crystalId) kindSel.dispatchEvent(new Event("change"));
  $("#cl-photo-btn", m).addEventListener("click", () => $("#cl-photo", m).click());
  $("#cl-photo", m).addEventListener("change", async e => {
    const f = e.target.files[0];
    if (!f) return;
    photoData = await photoToDataURL(f);
    $("#cl-photo-hint", m).textContent = "照片已選好 ✓";
  });
  $("#cl-cancel", m).addEventListener("click", () => m.remove());
  $("#cl-save", m).addEventListener("click", async () => {
    const name = nameInp.value.trim() || CRYSTAL_BY_ID[kindSel.value]?.zh || "我的水晶";
    const rec = {
      id: it.id || uid(), crystalId: kindSel.value, name,
      enName: CRYSTAL_BY_ID[kindSel.value]?.en || "",
      date: $("#cl-date", m).value, place: $("#cl-place", m).value.trim(),
      price: $("#cl-price", m).value, currency: $("#cl-cur", m).value,
      intent: $("#cl-intent", m).value.trim(), note: $("#cl-note", m).value.trim(),
      photoId: it.photoId || "",
    };
    if (photoData) {
      rec.photoId = rec.photoId || "cph_" + uid();
      await idb.put(rec.photoId, photoData);
    }
    store.data.crystals ||= [];
    const i = store.data.crystals.findIndex(x => x.id === rec.id);
    if (i >= 0) store.data.crystals[i] = rec; else store.data.crystals.push(rec);
    store.save(); m.remove();
    if (currentTab === "crystal") renderCrystal(); else renderCrystalShelf();
    toast(existing ? "已更新 💎" : "已放上收藏架 🗄✨");
  });
}

function openCollectionStats() {
  const col = store.data.crystals || [];
  const byCur = {};
  for (const it of col) {
    const p = parseFloat(it.price);
    if (!isNaN(p) && p > 0) byCur[it.currency || "TWD"] = (byCur[it.currency || "TWD"] || 0) + p;
  }
  const useCount = {};
  for (const it of col) for (const u of CRYSTAL_BY_ID[it.crystalId]?.uses || []) useCount[u] = (useCount[u] || 0) + 1;
  const topUses = Object.entries(useCount).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const first = [...col].filter(x => x.date).sort((a, b) => a.date.localeCompare(b.date))[0];
  const m = modal(`
    <h3>📊 收藏統計</h3>
    <div class="socratic">
      🗄 共 <b>${col.length}</b> 顆水晶
      ${first ? `<br>📅 收藏始於 ${esc(first.date)}（${esc(first.name)}）` : ""}
      ${Object.keys(byCur).length ? `<br>💰 累計投入：${Object.entries(byCur).map(([c, v]) => `${v.toLocaleString()} ${c}`).join("＋")}` : ""}
      ${topUses.length ? `<br>🏷 你最常收藏的能量：${topUses.map(([u, n]) => `${CRYSTAL_USES[u]} ${u}（${n}）`).join("・")}` : ""}
    </div>
    ${topUses.length ? `<p class="muted small">收藏會說話——你最近在為「${topUses[0][0]}」補充能量。也許可以逛逛圖鑑裡同類的其他夥伴？</p>` : ""}
    <div class="btn-row"><button class="btn secondary" id="cs-close">關閉</button></div>`);
  $("#cs-close", m).addEventListener("click", () => m.remove());
}

/* 儀式教學 modal */
function openCrystalRitual(key) {
  const r = CRYSTAL_RITUALS[key];
  if (!r) return;
  const m = modal(`
    <h3>${r.icon} ${esc(r.name)}</h3>
    <p class="muted small">⏰ 時機：${esc(r.when)}</p>
    <div class="ritual-crystals">${r.crystals.map(cid => {
      const c = CRYSTAL_BY_ID[cid];
      return `<button type="button" class="rc-chip" data-cid="${cid}"><span class="rc-fig">${crystalSVG(c)}</span>${esc(c.zh)}</button>`;
    }).join("")}</div>
    <ol class="ritual-steps">${r.steps.map(s => `<li>${esc(s)}</li>`).join("")}</ol>
    <div class="btn-row">
      ${key === "newmoon" || key === "fullmoon" ? `<button class="btn" id="rt-go">🕯 開始顯化儀式</button>` : ""}
      <button class="btn secondary" id="rt-close">關閉</button>
    </div>`);
  $("#rt-close", m).addEventListener("click", () => m.remove());
  $("#rt-go", m)?.addEventListener("click", () => { m.remove(); openManifestRitual(); });
  $$(".rc-chip", m).forEach(b => b.addEventListener("click", () => { m.remove(); openCrystalDetail(b.dataset.cid); }));
}

/* 全域：點任何「水晶提示連結」都開詳細頁（含顯化儀式 modal 內） */
document.addEventListener("click", e => {
  const a = e.target.closest(".crystal-hint-link");
  if (!a) return;
  e.preventDefault();
  openCrystalDetail(a.dataset.cid);
});
