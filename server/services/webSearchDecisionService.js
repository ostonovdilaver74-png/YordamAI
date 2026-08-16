/* =========================================================
   YordamAI
   AUTO WEB SEARCH DECISION SERVICE
   Internet Search V3.6
========================================================= */

/* =========================================================
   TEXT NORMALIZATION
========================================================= */

function normalizeText(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/* =========================================================
   PATTERN HELPER
========================================================= */

function matchesAny(
  text,
  patterns = []
) {
  if (!text) {
    return false;
  }

  return patterns.some(
    (pattern) =>
      pattern.test(text)
  );
}

/* =========================================================
   EXPLICIT INTERNET SEARCH
========================================================= */

const EXPLICIT_SEARCH_PATTERNS = [
  // Uzbek
  /\binternetdan qidir\b/i,
  /\binternetdan top\b/i,
  /\binternet orqali qidir\b/i,
  /\bwebdan qidir\b/i,
  /\bweb orqali qidir\b/i,
  /\bgoogle dan qidir\b/i,
  /\bgoogle['‘’]?dan qidir\b/i,
  /\bqidirib ber\b/i,
  /\btekshirib ber\b/i,
  /\binternetda tekshir\b/i,
  /\bmanbasini top\b/i,
  /\bmanba top\b/i,
  /\brasmiy manbadan top\b/i,
  /\bsaytdan top\b/i,

  // English
  /\bsearch the web\b/i,
  /\bsearch online\b/i,
  /\blook it up\b/i,
  /\bfind online\b/i,
  /\bcheck online\b/i,
  /\bverify online\b/i,
  /\bfind sources\b/i,

  // Russian
  /\bнайди в интернете\b/i,
  /\bпоищи в интернете\b/i,
  /\bпроверь в интернете\b/i,
  /\bнайди источник\b/i,
  /\bпроверь онлайн\b/i,
];

/* =========================================================
   REAL-TIME / FRESHNESS
========================================================= */

const REALTIME_PATTERNS = [
  // Uzbek
  /\bbugun\b/i,
  /\bbugungi\b/i,
  /\bhozir\b/i,
  /\bhozirgi\b/i,
  /\bhozirda\b/i,
  /\bayni paytda\b/i,
  /\bshu paytda\b/i,
  /\bshu onda\b/i,

  /\bso['‘’]?nggi\b/i,
  /\beng so['‘’]?nggi\b/i,
  /\boxirgi\b/i,

  /\beng yangi\b/i,
  /\byangi xabar\b/i,
  /\byangilik\b/i,
  /\byangiliklar\b/i,

  /\bkecha\b/i,
  /\bkechagi\b/i,
  /\bertaga\b/i,
  /\bshu hafta\b/i,
  /\bshu oy\b/i,
  /\bjoriy yil\b/i,
  /\bbu yil\b/i,

  /\b202[5-9]\b/i,

  // Russian
  /\bсегодня\b/i,
  /\bсейчас\b/i,
  /\bтекущ(ий|ая|ее|ие)\b/i,
  /\bпоследн(ий|яя|ее|ие)\b/i,
  /\bсвеж(ий|ая|ее|ие)\b/i,
  /\bновост(ь|и)\b/i,
  /\bвчера\b/i,
  /\bзавтра\b/i,
  /\bна этой неделе\b/i,
  /\bв этом месяце\b/i,

  // English
  /\btoday\b/i,
  /\bright now\b/i,
  /\bcurrently\b/i,
  /\bcurrent\b/i,
  /\blatest\b/i,
  /\brecent\b/i,
  /\bnewest\b/i,
  /\bnews\b/i,
  /\byesterday\b/i,
  /\btomorrow\b/i,
  /\bthis week\b/i,
  /\bthis month\b/i,
];

/* =========================================================
   HIGH DYNAMIC TOPICS
========================================================= */

const HIGH_DYNAMIC_PATTERNS = [
  /* ---------------------------------------------------------
     WEATHER
  --------------------------------------------------------- */

  /\bob[- ]?havo\b/i,
  /\bweather\b/i,
  /\bпогода\b/i,

  /\bhavo harorati\b/i,
  /\bharorat nechchi\b/i,

  /\byomg['‘’]?ir\b/i,
  /\bqor yog['‘’]?ad/i,

  /\bprognoz\b/i,
  /\bforecast\b/i,

  /* ---------------------------------------------------------
     CURRENCY
  --------------------------------------------------------- */

  /\bdollar kurs/i,
  /\bevro kurs/i,
  /\brubl kurs/i,
  /\bvalyuta kurs/i,

  /\bexchange rate\b/i,

  /\bкурс доллара\b/i,
  /\bкурс евро\b/i,
  /\bкурс рубля\b/i,
  /\bкурс валют\b/i,

  /* ---------------------------------------------------------
     CRYPTO / STOCK
  --------------------------------------------------------- */

  /\bbitcoin narx/i,
  /\bethereum narx/i,

  /\bbitcoin price\b/i,
  /\bethereum price\b/i,

  /\bbtc price\b/i,
  /\beth price\b/i,

  /\bstock price\b/i,
  /\baktsiya narxi\b/i,

  /* ---------------------------------------------------------
     SPORT
  --------------------------------------------------------- */

  /\bo['‘’]?yin natijasi\b/i,
  /\bo['‘’]?yini natijasi\b/i,
  /\bo['‘’]?yinining natijasi\b/i,

  /\bmatch result\b/i,
  /\bgame result\b/i,

  /\bfinal score\b/i,
  /\blive score\b/i,

  /\bturnir jadvali\b/i,
  /\bturnir jadval\b/i,

  /\bstandings\b/i,
  /\bleague table\b/i,

  /\bkim yutdi\b/i,
  /\bkim g['‘’]?olib\b/i,

  /\bnechi nechi bo['‘’]?ldi\b/i,
  /\bnecha necha bo['‘’]?ldi\b/i,

  /\bсч[её]т матча\b/i,
  /\bрезультат матча\b/i,
  /\bтурнирная таблица\b/i,

  /* ---------------------------------------------------------
     FLIGHTS / TRANSPORT
  --------------------------------------------------------- */

  /\breys holati\b/i,
  /\bflight status\b/i,

  /\bsamolyot reysi\b/i,
  /\breys jadvali\b/i,

  /\bpoyezd jadvali\b/i,
  /\btrain schedule\b/i,

  /\bавиарейс\b/i,
];

/* =========================================================
   DYNAMIC TOPICS
========================================================= */

const DYNAMIC_TOPIC_PATTERNS = [
  /* ---------------------------------------------------------
     PRICES
  --------------------------------------------------------- */

  /\bnarxi\b/i,
  /\bnarx qancha\b/i,
  /\bqancha turadi\b/i,

  /\bprice\b/i,
  /\bcost\b/i,

  /\bцена\b/i,
  /\bстоимость\b/i,

  /* ---------------------------------------------------------
     POLITICS / CURRENT OFFICIALS
  --------------------------------------------------------- */

  /\bprezident\b/i,
  /\bbosh vazir\b/i,
  /\bvazir\b/i,
  /\bhokim\b/i,

  /\bhukumat\b/i,
  /\bparlament\b/i,
  /\bsaylov\b/i,

  /\bpresident\b/i,
  /\bprime minister\b/i,
  /\bgovernment\b/i,
  /\belection\b/i,

  /* ---------------------------------------------------------
     CURRENT ROLE
  --------------------------------------------------------- */

  /\bkim hozir\b/i,
  /\bhozir kim\b/i,

  /\bkim rahbar\b/i,
  /\bkim direktor\b/i,
  /\bkim ceo\b/i,

  /\bcurrent ceo\b/i,
  /\bcurrent president\b/i,

  /\bwho is the current\b/i,
  /\bкто сейчас\b/i,

  /* ---------------------------------------------------------
     LAWS
  --------------------------------------------------------- */

  /\byangi qonun\b/i,
  /\bamaldagi qonun\b/i,

  /\bqonun o['‘’]?zgardimi\b/i,

  /\byangi qaror\b/i,
  /\byangi farmon\b/i,

  /\bnew law\b/i,
  /\bcurrent law\b/i,
  /\bnew regulation\b/i,

  /\bновый закон\b/i,

  /* ---------------------------------------------------------
     SOFTWARE / TECHNOLOGY VERSION
  --------------------------------------------------------- */

  /\byangi versiya\b/i,
  /\byangi versiyasi\b/i,

  /\beng yangi versiya\b/i,
  /\beng yangi versiyasi\b/i,

  /\boxirgi versiya\b/i,
  /\boxirgi versiyasi\b/i,

  /\bso['‘’]?nggi versiya\b/i,
  /\bso['‘’]?nggi versiyasi\b/i,

  /\blatest version\b/i,
  /\bnewest version\b/i,
  /\bcurrent version\b/i,
  /\bnew version\b/i,

  /\brelease date\b/i,

  /\bupdate chiq/i,
  /\byangilanish chiq/i,

  /\bchiqdimi\b/i,

  /\bкакая последняя версия\b/i,
  /\bпоследняя версия\b/i,

  /* ---------------------------------------------------------
     AVAILABILITY
  --------------------------------------------------------- */

  /\bsotuvda bormi\b/i,
  /\bmavjudmi\b/i,

  /\bavailable now\b/i,
  /\bin stock\b/i,

  /\bв наличии\b/i,
];

/* =========================================================
   LOCAL TASKS
========================================================= */

const LOCAL_TASK_PATTERNS = [
  /* ---------------------------------------------------------
     TRANSLATION
  --------------------------------------------------------- */

  /\btarjima qil\b/i,
  /\btarjima qilib ber\b/i,

  /\btranslate\b/i,
  /\bпереведи\b/i,

  /* ---------------------------------------------------------
     REWRITE
  --------------------------------------------------------- */

  /\bqayta yoz\b/i,
  /\bqaytadan yoz\b/i,

  /\byaxshilab yoz\b/i,
  /\bchiroyli yoz\b/i,

  /\brewrite\b/i,
  /\bперепиши\b/i,

  /* ---------------------------------------------------------
     PROVIDED CONTENT
  --------------------------------------------------------- */

  /\bshu matnni qisqartir\b/i,
  /\bshu matnni tushuntir\b/i,

  /\bquyidagi matnni\b/i,
  /\bmen yuborgan matn\b/i,

  /\bshu kodni\b/i,

  /* ---------------------------------------------------------
     CODING
  --------------------------------------------------------- */

  /\bkod yoz\b/i,
  /\bkod yozib ber\b/i,

  /\bcode yoz\b/i,

  /\bfunction yoz\b/i,
  /\bclass yoz\b/i,

  /\bkomponent yoz\b/i,
  /\bkomponent yozib ber\b/i,

  /\breact komponent\b/i,
  /\breact component\b/i,

  /* ---------------------------------------------------------
     CREATIVE
  --------------------------------------------------------- */

  /\bsenariy yoz\b/i,
  /\bhikoya yoz\b/i,

  /\bmatn yozib ber\b/i,
  /\btabrik yoz\b/i,

  /\bprompt yoz\b/i,

  /* ---------------------------------------------------------
     MEMORY / PERSONAL
  --------------------------------------------------------- */

  /\bmening ismim\b/i,
  /\bismim nima\b/i,

  /\bmen haqimda\b/i,

  /\beslaysanmi\b/i,
  /\byodingdami\b/i,
];

/* =========================================================
   SIMPLE MATH
========================================================= */

function isSimpleMath(text) {
  if (!text) {
    return false;
  }

  return /^[\d\s+\-*/().,%=]+$/.test(
    text
  );
}

/* =========================================================
   URL CHECK
========================================================= */

function containsUrl(text) {
  return /https?:\/\/\S+/i.test(
    text
  );
}

/* =========================================================
   CREATE DECISION
========================================================= */

function createDecision({
  enabled,
  reason,
  confidence,
}) {
  const numericConfidence =
    Number(confidence);

  return {
    enabled:
      Boolean(enabled),

    reason:
      reason ||
      "unknown",

    confidence:
      Number.isFinite(
        numericConfidence
      )
        ? Math.min(
            Math.max(
              numericConfidence,
              0
            ),
            1
          )
        : 0,
  };
}

/* =========================================================
   AUTO SEARCH DECISION
========================================================= */

function shouldAutoEnableWebSearch(
  message
) {
  const text =
    normalizeText(message);

  /* ---------------------------------------------------------
     EMPTY
  --------------------------------------------------------- */

  if (!text) {
    return createDecision({
      enabled: false,
      reason:
        "empty_message",
      confidence: 1,
    });
  }

  /* ---------------------------------------------------------
     EXPLICIT SEARCH
  --------------------------------------------------------- */

  if (
    matchesAny(
      text,
      EXPLICIT_SEARCH_PATTERNS
    )
  ) {
    return createDecision({
      enabled: true,
      reason:
        "explicit_search_request",
      confidence: 1,
    });
  }

  /* ---------------------------------------------------------
     SIMPLE MATH
  --------------------------------------------------------- */

  if (
    isSimpleMath(text)
  ) {
    return createDecision({
      enabled: false,
      reason:
        "simple_math",
      confidence: 0.99,
    });
  }

  /* ---------------------------------------------------------
     SIGNALS
  --------------------------------------------------------- */

  const hasRealtimeSignal =
    matchesAny(
      text,
      REALTIME_PATTERNS
    );

  const hasHighDynamicTopic =
    matchesAny(
      text,
      HIGH_DYNAMIC_PATTERNS
    );

  const hasDynamicTopic =
    matchesAny(
      text,
      DYNAMIC_TOPIC_PATTERNS
    );

  const hasLocalTask =
    matchesAny(
      text,
      LOCAL_TASK_PATTERNS
    );

  /* ---------------------------------------------------------
     URL VERIFICATION
  --------------------------------------------------------- */

  if (
    containsUrl(text) &&
    (
      /\btekshir\b/i.test(
        text
      ) ||
      /\btahlil\b/i.test(
        text
      ) ||
      /\bcheck\b/i.test(
        text
      ) ||
      /\bverify\b/i.test(
        text
      )
    )
  ) {
    return createDecision({
      enabled: true,
      reason:
        "url_verification",
      confidence: 0.95,
    });
  }

  /* ---------------------------------------------------------
     REALTIME + HIGH DYNAMIC
  --------------------------------------------------------- */

  if (
    hasRealtimeSignal &&
    hasHighDynamicTopic
  ) {
    return createDecision({
      enabled: true,
      reason:
        "realtime_high_dynamic",
      confidence: 0.99,
    });
  }

  /* ---------------------------------------------------------
     HIGH DYNAMIC
  --------------------------------------------------------- */

  if (
    hasHighDynamicTopic
  ) {
    return createDecision({
      enabled: true,
      reason:
        "high_dynamic_information",
      confidence: 0.95,
    });
  }

  /* ---------------------------------------------------------
     REALTIME + DYNAMIC
  --------------------------------------------------------- */

  if (
    hasRealtimeSignal &&
    hasDynamicTopic
  ) {
    return createDecision({
      enabled: true,
      reason:
        "realtime_dynamic_topic",
      confidence: 0.97,
    });
  }

  /* ---------------------------------------------------------
     REALTIME
  --------------------------------------------------------- */

  if (
    hasRealtimeSignal &&
    !hasLocalTask
  ) {
    return createDecision({
      enabled: true,
      reason:
        "realtime_information",
      confidence: 0.9,
    });
  }

  /* ---------------------------------------------------------
     LOCAL TASK
  --------------------------------------------------------- */

  if (
    hasLocalTask
  ) {
    return createDecision({
      enabled: false,
      reason:
        "local_task",
      confidence: 0.95,
    });
  }

  /* ---------------------------------------------------------
     DYNAMIC TOPIC
  --------------------------------------------------------- */

  if (
    hasDynamicTopic
  ) {
    return createDecision({
      enabled: true,
      reason:
        "dynamic_information",
      confidence: 0.85,
    });
  }

  /* ---------------------------------------------------------
     DEFAULT
  --------------------------------------------------------- */

  return createDecision({
    enabled: false,
    reason:
      "no_web_requirement",
    confidence: 0.85,
  });
}

/* =========================================================
   MANUAL + AUTO SEARCH
========================================================= */

function resolveWebSearch({
  message,
  requestedWebSearch = false,
}) {
  /*
    Manual Internet ON har doim ustun.
    Boolean yoki object bo‘lishi mumkin.
  */

  if (requestedWebSearch) {
    return {
      enabled:
        requestedWebSearch,

      autoEnabled:
        false,

      reason:
        "manual_web_search",

      confidence:
        1,
    };
  }

  const decision =
    shouldAutoEnableWebSearch(
      message
    );

  return {
    enabled:
      decision.enabled,

    autoEnabled:
      Boolean(
        decision.enabled
      ),

    reason:
      decision.reason,

    confidence:
      decision.confidence,
  };
}

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  shouldAutoEnableWebSearch,
  resolveWebSearch,
};