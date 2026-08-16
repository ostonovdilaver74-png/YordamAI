/* =========================================================
   YordamAI
   AUTO WEB SEARCH DECISION SERVICE
   Internet Search V3
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

const REALTIME_PATTERNS = [
  /\bbugun\b/i,
  /\bhozir\b/i,
  /\bhozirgi\b/i,
  /\bhozirda\b/i,
  /\bayni paytda\b/i,
  /\bshu paytda\b/i,
  /\bso['‘’]?nggi\b/i,
  /\beng so['‘’]?nggi\b/i,
  /\byangi xabar\b/i,
  /\byangiliklar\b/i,
  /\boxirgi yangilik\b/i,
  /\bkecha\b/i,
  /\bertaga\b/i,
  /\bshu hafta\b/i,
  /\bshu oy\b/i,
  /\bjoriy yil\b/i,

  /\bсегодня\b/i,
  /\bсейчас\b/i,
  /\bпоследн(ие|яя|ий)\b/i,
  /\bсвеж(ие|ая)\b/i,
  /\bновости\b/i,
  /\bвчера\b/i,
  /\bзавтра\b/i,

  /\btoday\b/i,
  /\bright now\b/i,
  /\bcurrent\b/i,
  /\blatest\b/i,
  /\brecent\b/i,
  /\bnews\b/i,
  /\byesterday\b/i,
  /\btomorrow\b/i,
];

const DYNAMIC_TOPIC_PATTERNS = [
  /\bob[- ]?havo\b/i,
  /\bhavo harorati\b/i,
  /\bweather\b/i,
  /\bпогода\b/i,
  /\byomg['‘’]?ir\b/i,
  /\bqor yog['‘’]?ad/i,
  /\bharorat\b/i,

  /\bdollar kurs/i,
  /\bevro kurs/i,
  /\bvalyuta kurs/i,
  /\bexchange rate\b/i,
  /\bкурс доллар/i,
  /\bкурс валют/i,
  /\bbitcoin\b/i,
  /\bethereum\b/i,
  /\bkripto\b/i,
  /\bcrypto\b/i,
  /\baktsiya narxi\b/i,
  /\bstock price\b/i,

  /\bnarxi\b/i,
  /\bnarx qancha\b/i,
  /\bprice\b/i,
  /\bqancha turadi\b/i,
  /\bстоимость\b/i,
  /\bцена\b/i,

  /\bnatija\b/i,
  /\bhisob\b/i,
  /\bturnir jadvali\b/i,
  /\bo['‘’]?yin natijasi\b/i,
  /\bmatch result\b/i,
  /\bscore\b/i,
  /\bstandings\b/i,
  /\bтурнирн/i,
  /\bсч[её]т\b/i,

  /\bprezident\b/i,
  /\bvazir\b/i,
  /\bhukumat\b/i,
  /\bsaylov\b/i,
  /\bqonun\b/i,
  /\bqaror\b/i,
  /\bfarmon\b/i,
  /\bparlament\b/i,
  /\bpresident\b/i,
  /\bgovernment\b/i,
  /\belection\b/i,

  /\baviachipta\b/i,
  /\bsamolyot reys/i,
  /\breys jadvali\b/i,
  /\bpoyezd jadvali\b/i,
  /\bflight\b/i,
  /\bflight status\b/i,
  /\btrain schedule\b/i,

  /\byangi model\b/i,
  /\bchiqdimi\b/i,
  /\brelease date\b/i,
  /\bversiya\b/i,
  /\bversion\b/i,
  /\bupdate\b/i,
  /\byangilanish\b/i,
];

const EXPLICIT_SEARCH_PATTERNS = [
  /\binternetdan qidir\b/i,
  /\binternetdan top\b/i,
  /\bwebdan qidir\b/i,
  /\bgoogle dan qidir\b/i,
  /\bgoogle['‘’]?dan qidir\b/i,
  /\bqidirib ber\b/i,
  /\btekshirib ber\b/i,
  /\bmanbasini top\b/i,
  /\bmanba top\b/i,
  /\bsaytdan top\b/i,

  /\bsearch the web\b/i,
  /\bsearch online\b/i,
  /\blook it up\b/i,
  /\bfind online\b/i,
  /\bcheck online\b/i,

  /\bнайди в интернете\b/i,
  /\bпоищи в интернете\b/i,
  /\bпроверь в интернете\b/i,
];

const NO_SEARCH_PATTERNS = [
  /^\s*[\d\s+\-*/().,%=]+\s*$/,
  /\btarjima qil\b/i,
  /\btranslate\b/i,
  /\bпереведи\b/i,
  /\bqayta yoz\b/i,
  /\byaxshilab yoz\b/i,
  /\brewrite\b/i,
  /\bперепиши\b/i,
  /\bkod yoz\b/i,
  /\bcode yoz\b/i,
  /\bfunction yoz\b/i,
  /\bclass yoz\b/i,
  /\bshu matnni\b/i,
  /\bquyidagi matnni\b/i,
  /\bmen yuborgan\b/i,
];

function matchesAny(
  text,
  patterns = []
) {
  return patterns.some(
    (pattern) =>
      pattern.test(text)
  );
}

function shouldAutoEnableWebSearch(
  message
) {
  const text =
    normalizeText(message);

  if (!text) {
    return {
      enabled: false,
      reason: "empty_message",
      confidence: 0,
    };
  }

  if (
    matchesAny(
      text,
      EXPLICIT_SEARCH_PATTERNS
    )
  ) {
    return {
      enabled: true,
      reason: "explicit_search_request",
      confidence: 1,
    };
  }

  const hasRealtimeSignal =
    matchesAny(
      text,
      REALTIME_PATTERNS
    );

  const hasDynamicTopic =
    matchesAny(
      text,
      DYNAMIC_TOPIC_PATTERNS
    );

  if (
    hasRealtimeSignal &&
    hasDynamicTopic
  ) {
    return {
      enabled: true,
      reason:
        "realtime_dynamic_topic",
      confidence: 0.98,
    };
  }

  if (hasRealtimeSignal) {
    return {
      enabled: true,
      reason:
        "realtime_information",
      confidence: 0.9,
    };
  }

  if (hasDynamicTopic) {
    return {
      enabled: true,
      reason:
        "dynamic_information",
      confidence: 0.82,
    };
  }

  if (
    matchesAny(
      text,
      NO_SEARCH_PATTERNS
    )
  ) {
    return {
      enabled: false,
      reason:
        "local_task",
      confidence: 0.9,
    };
  }

  return {
    enabled: false,
    reason:
      "no_web_requirement",
    confidence: 0.75,
  };
}

function resolveWebSearch({
  message,
  requestedWebSearch = false,
}) {
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
      decision.enabled,

    reason:
      decision.reason,

    confidence:
      decision.confidence,
  };
}

module.exports = {
  shouldAutoEnableWebSearch,
  resolveWebSearch,
};
