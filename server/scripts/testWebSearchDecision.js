const {
  shouldAutoEnableWebSearch,
  resolveWebSearch,
} = require(
  "../services/webSearchDecisionService"
);

const tests = [
  {
    message:
      "Bugun O‘zbekistonda qanday muhim yangiliklar bor?",
    expected: true,
  },
  {
    message:
      "Toshkentda ob-havo qanday?",
    expected: true,
  },
  {
    message:
      "Dollar kursi qancha?",
    expected: true,
  },
  {
    message:
      "Bitcoin narxi qancha?",
    expected: true,
  },
  {
    message:
      "Manchester City o‘yini natijasi qanday?",
    expected: true,
  },
  {
    message:
      "Hozir O‘zbekiston prezidenti kim?",
    expected: true,
  },
  {
    message:
      "Eng yangi React versiyasi qaysi?",
    expected: true,
  },
  {
    message:
      "Mening ismim nima?",
    expected: false,
  },
  {
    message:
      "Shu matnni tarjima qil",
    expected: false,
  },
  {
    message:
      "React komponent yozib ber",
    expected: false,
  },
  {
    message:
      "2 + 2",
    expected: false,
  },
  {
    message:
      "AutoCAD nima?",
    expected: false,
  },
];

console.log(
  "\n=================================="
);

console.log(
  "YordamAI Auto Web Search V3.5 TEST"
);

console.log(
  "==================================\n"
);

let passed = 0;
let failed = 0;

for (
  let index = 0;
  index < tests.length;
  index += 1
) {
  const test =
    tests[index];

  const decision =
    shouldAutoEnableWebSearch(
      test.message
    );

  const success =
    decision.enabled ===
    test.expected;

  if (success) {
    passed += 1;
  } else {
    failed += 1;
  }

  console.log(
    `${success ? "✅" : "❌"} TEST ${
      index + 1
    }`
  );

  console.log(
    "Savol:",
    test.message
  );

  console.log(
    "Kutilgan:",
    test.expected
      ? "INTERNET ON"
      : "INTERNET OFF"
  );

  console.log(
    "Natija:",
    decision.enabled
      ? "INTERNET ON"
      : "INTERNET OFF"
  );

  console.log(
    "Reason:",
    decision.reason
  );

  console.log(
    "Confidence:",
    decision.confidence
  );

  console.log(
    "----------------------------------"
  );
}

/* =========================================================
   MANUAL INTERNET TEST
========================================================= */

const manualTest =
  resolveWebSearch({
    message:
      "Mening ismim nima?",

    requestedWebSearch:
      true,
  });

console.log(
  "\nMANUAL INTERNET TEST"
);

console.log(
  manualTest.enabled
    ? "✅ Manual Internet ON ishladi"
    : "❌ Manual Internet ishlamadi"
);

/* =========================================================
   FINAL RESULT
========================================================= */

console.log(
  "\n=================================="
);

console.log(
  `✅ O‘tdi: ${passed}`
);

console.log(
  `❌ Xato: ${failed}`
);

console.log(
  `📊 Jami: ${tests.length}`
);

console.log(
  "==================================\n"
);

if (
  failed > 0
) {
  process.exitCode = 1;
}