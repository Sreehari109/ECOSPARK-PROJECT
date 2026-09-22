import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // AI Energy Saving Advice
  app.post("/api/ai-advice", async (req, res) => {
    const { appliances, monthlyBill, peakRatio } = req.body || {};
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.json({
        advice: "Shift your high-wattage heating and cooling appliances (AC, water geyser, washing machine) from 6 PM–10 PM to night off-peak (after 10 PM) or solar daytime (11 AM–4 PM) to save up to 40% on your monthly bill.",
        source: "rule-based"
      });
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `You are a Smart Grid Demand-Side Management & Energy Conservation Assistant.
A consumer has provided their current electricity profile:
- Monthly Bill Estimate: ₹${monthlyBill || 3500}
- Peak Usage Share: ${peakRatio || "High"}
- Audited Appliances: ${JSON.stringify(appliances || ["1.5 Ton AC", "2000W Geyser", "Washing Machine"])}

Provide 3 concise, highly actionable bullet points on how they can shift loads to off-peak/solar hours to cut electricity costs and reduce CO2 emissions. Keep it brief, practical, and direct (under 90 words total).`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
      });

      return res.json({
        advice: response.text || "Shift heavy cooling and heating loads away from 6 PM–10 PM peak hours to reduce tariff surcharges.",
        source: "gemini-2.5-flash"
      });
    } catch (err: any) {
      console.error("Gemini API Error:", err.message);
      return res.json({
        advice: "Shift heavy cooling and water-heating appliances to off-peak hours (10 PM–6 AM) or midday solar hours (11 AM–4 PM) to reduce monthly bills by up to 40%.",
        source: "rule-based-fallback"
      });
    }
  });

  // Dynamic Time-of-Use tariff slot
  app.get("/api/tariff", (_req, res) => {
    const currentHour = new Date().getHours();
    let slot = "solar";
    let multiplier = 1.0;
    let rate = 6.50;
    let name = "Solar Daytime";
    let description = "Clean solar generation window. Standard base tariff.";

    if (currentHour >= 22 || currentHour < 6) {
      slot = "offpeak";
      multiplier = 0.8;
      rate = 5.20;
      name = "Night Off-Peak";
      description = "Lowest demand period. 20% discount applied.";
    } else if (currentHour >= 18 && currentHour < 22) {
      slot = "peak";
      multiplier = 1.5;
      rate = 9.75;
      name = "Evening Surge Peak";
      description = "Maximum grid stress. +50% surge tariff in effect.";
    } else if (currentHour >= 6 && currentHour < 11) {
      slot = "morning";
      multiplier = 1.35;
      rate = 8.78;
      name = "Morning Peak";
      description = "Morning ramp-up load. +35% tariff applied.";
    }

    res.json({
      hour: currentHour,
      slot,
      name,
      rate,
      multiplier,
      description
    });
  });

  // Live Grid Telemetry
  app.get("/api/grid-telemetry", (_req, res) => {
    const jitter = (Math.random() - 0.5) * 0.06;
    const frequency = +(50.0 + jitter).toFixed(2);
    const demandMw = Math.round(14200 + Math.random() * 800);
    const currentHour = new Date().getHours();
    const isPeak = (currentHour >= 18 && currentHour <= 21);

    res.json({
      frequencyHz: frequency,
      nominalFrequency: 50.0,
      gridStatus: frequency >= 49.95 && frequency <= 50.05 ? "Normal / Synchronized" : "Frequency Alert",
      demandMw,
      isPeakSurge: isPeak,
      timestamp: new Date().toISOString()
    });
  });

  // Energy & Cost Calculation
  app.post("/api/calculate", (req, res) => {
    const { wattage, hoursPerDay, slot } = req.body || {};
    const w = Math.max(0, Number(wattage) || 0);
    const h = Math.min(24, Math.max(0, Number(hoursPerDay) || 0));

    let multiplier = 1.0;
    if (slot === "peak") multiplier = 1.5;
    else if (slot === "offpeak") multiplier = 0.8;
    else if (slot === "morning") multiplier = 1.35;

    const baseRate = 6.50;
    const effectiveRate = +(baseRate * multiplier).toFixed(2);
    const dailyKwh = +((w * h) / 1000).toFixed(3);
    const monthlyKwh = +(dailyKwh * 30).toFixed(2);
    const monthlyCost = Math.round(monthlyKwh * effectiveRate);
    const co2KgPerMonth = +(monthlyKwh * 0.82).toFixed(2);

    const peakCost = Math.round(monthlyKwh * (baseRate * 1.5));
    const offpeakCost = Math.round(monthlyKwh * (baseRate * 0.8));
    const potentialSavings = Math.max(0, peakCost - offpeakCost);

    res.json({
      wattage: w,
      hoursPerDay: h,
      effectiveRate,
      dailyKwh,
      monthlyKwh,
      monthlyCost,
      co2KgPerMonth,
      peakCost,
      offpeakCost,
      potentialSavings
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
