const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 60_000,
  maxRetries: 2,
});

async function generateAIReply(messages = []) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY server .env faylida topilmadi");
  }

  const conversationInput = messages.map((message) => ({
    role: message.role === "assistant" ? "assistant" : "user",
    content: message.content,
  }));

  const response = await openai.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-5.5",

    instructions: `
Sen YordamAI nomli foydali AI yordamchisan.

Asosiy qoidalar:
- Foydalanuvchi qaysi tilda yozsa, o‘sha tilda javob ber.
- O‘zbek tilida tabiiy, sodda va tushunarli yoz.
- Keraksiz uzun javob bermagin.
- Dasturlash savollarida ishlaydigan kod va aniq tushuntirish ber.
- Markdown formatidan foydalanishing mumkin.
- Bilmagan narsangni o‘ylab topma.
`.trim(),

    input: conversationInput,
  });

  const reply = response.output_text?.trim();

  if (!reply) {
    throw new Error("AI bo‘sh javob qaytardi");
  }

  return reply;
}

module.exports = {
  generateAIReply,
};