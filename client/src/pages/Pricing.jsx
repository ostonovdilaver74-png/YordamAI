import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

const plans = [
  {
    key: "free",
    name: "Free",
    price: "0 so‘m",
    period: "doimiy",
    description:
      "YordamAI imkoniyatlarini sinab ko‘rish uchun.",
    buttonText: "Hozirgi tarif",
    popular: false,
    features: [
      "Kuniga 20 ta AI xabar",
      "Oddiy AI chat",
      "Streaming javoblar",
      "PDF bilan ishlash",
      "Rasm tahlili",
      "Internet qidiruvi",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    price: "49 000 so‘m",
    period: "oyiga",
    description:
      "Ko‘proq limit va professional imkoniyatlar uchun.",
    buttonText: "Pro ga o‘tish",
    popular: true,
    features: [
      "Yuqori kunlik xabar limiti",
      "Barcha AI modellari",
      "Tezroq javoblar",
      "PDF va Vision imkoniyatlari",
      "Internet qidiruvi",
      "Ustuvor qo‘llab-quvvatlash",
    ],
  },
];

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const currentPlan = useMemo(
    () =>
      String(
        user?.plan || "free"
      ).toLowerCase(),
    [user?.plan]
  );

  function handlePlanAction(planKey) {
    if (planKey === currentPlan) {
      return;
    }

    if (planKey === "pro") {
      alert(
        "Pro tarif uchun to‘lov tizimi keyingi bosqichda ulanadi."
      );

      return;
    }

    navigate("/chat");
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-700">
          YordamAI tariflari
        </span>

        <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Sizga mos tarifni tanlang
        </h1>

        <p className="mt-4 text-base leading-7 text-slate-600">
          Free tarif orqali boshlang. Ko‘proq
          imkoniyat kerak bo‘lsa, Pro tarifga
          o‘ting.
        </p>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {plans.map((plan) => {
          const isCurrent =
            currentPlan === plan.key;

          return (
            <article
              key={plan.key}
              className={`relative flex h-full flex-col rounded-3xl border bg-white p-6 shadow-sm transition sm:p-8 ${
                plan.popular
                  ? "border-blue-500 shadow-blue-100"
                  : "border-slate-200"
              }`}
            >
              {plan.popular && (
                <span className="absolute right-5 top-5 rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">
                  Tavsiya etiladi
                </span>
              )}

              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">
                  {plan.name}
                </h2>

                <p className="mt-3 min-h-[48px] text-sm leading-6 text-slate-600">
                  {plan.description}
                </p>
              </div>

              <div className="mt-7">
                <div className="flex flex-wrap items-end gap-2">
                  <span className="text-4xl font-extrabold tracking-tight text-slate-900">
                    {plan.price}
                  </span>

                  <span className="pb-1 text-sm font-medium text-slate-500">
                    / {plan.period}
                  </span>
                </div>
              </div>

              <ul className="mt-7 flex-1 space-y-3">
                {plan.features.map(
                  (feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-3 text-sm leading-6 text-slate-700"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700"
                      >
                        ✓
                      </span>

                      <span>{feature}</span>
                    </li>
                  )
                )}
              </ul>

              <button
                type="button"
                onClick={() =>
                  handlePlanAction(plan.key)
                }
                disabled={isCurrent}
                className={`mt-8 min-h-12 rounded-xl px-5 py-3 text-sm font-bold transition ${
                  isCurrent
                    ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                    : plan.popular
                      ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700"
                      : "border border-slate-300 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                }`}
              >
                {isCurrent
                  ? "Hozirgi tarif"
                  : plan.buttonText}
              </button>
            </article>
          );
        })}
      </div>

      <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-800">
        <strong>Eslatma:</strong> Pro tarif narxi
        hozircha sinov narxi. To‘lov tizimi
        ulanganda narx va limitlarni yakuniy
        belgilaymiz.
      </div>
    </section>
  );
}