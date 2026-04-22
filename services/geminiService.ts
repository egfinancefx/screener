
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { MarketAnalysis, NewsItem, SmtAnalysis, PatternAnalysis } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function retryOperation<T>(operation: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    // Check for 429 or Resource Exhausted errors from the API
    // The error object might be nested or have different structures depending on the SDK version and error type
    const isRateLimit = 
      error?.status === 429 || 
      error?.code === 429 || 
      error?.message?.includes('429') || 
      error?.status === 'RESOURCE_EXHAUSTED' ||
      (error?.error && (error.error.code === 429 || error.error.status === 'RESOURCE_EXHAUSTED'));

    if (isRateLimit && retries > 0) {
      console.warn(`Rate limit hit. Retrying in ${delay}ms...`);
      await wait(delay);
      return retryOperation(operation, retries - 1, delay * 2);
    }
    throw error;
  }
}

export const getMarketAnalysis = async (symbolLabel: string): Promise<MarketAnalysis> => {
  try {
    const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Perform a technical deep-dive for ${symbolLabel}. 
      Provide:
      1. Sentiment (Bullish, Bearish, or Neutral).
      2. A concise 2-sentence market summary.
      3. Key resistance and support price levels.
      4. Current status of these indicators: RSI (14), MACD (12,26,9), SMA (20), SMA (200), and Bollinger Bands. 
      For indicators, provide a plausible current value and a signal (Buy, Sell, Neutral, Overbought, or Oversold).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sentiment: { type: Type.STRING, enum: ['Bullish', 'Bearish', 'Neutral'] },
            summary: { type: Type.STRING },
            keyLevels: {
              type: Type.OBJECT,
              properties: {
                resistance: { type: Type.ARRAY, items: { type: Type.STRING } },
                support: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ['resistance', 'support']
            },
            indicators: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  value: { type: Type.STRING },
                  signal: { type: Type.STRING, enum: ['Buy', 'Sell', 'Neutral', 'Overbought', 'Oversold'] }
                },
                required: ['name', 'value', 'signal']
              }
            }
          },
          required: ['sentiment', 'summary', 'keyLevels', 'indicators']
        }
      }
    }));

    if (!response.text) {
        throw new Error("No text returned from API");
    }

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Analysis Error:", error);
    return {
      sentiment: 'Neutral',
      summary: 'Market data currently unavailable due to high demand. Please rely on chart analysis.',
      keyLevels: { resistance: ['N/A'], support: ['N/A'] },
      indicators: [
        { name: 'RSI (14)', value: '--', signal: 'Neutral' },
        { name: 'MACD', value: '--', signal: 'Neutral' },
        { name: 'SMA (20)', value: '--', signal: 'Neutral' }
      ]
    };
  }
};

export const getMarketNews = async (symbolLabel: string): Promise<NewsItem[]> => {
  try {
    const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate 5 realistic, high-impact news headlines and full article summaries for the asset ${symbolLabel}. 
      The news should be relevant to current global economic trends.
      Include a source (e.g., Reuters, Bloomberg, FT), a timestamp (recent), and an impact level (High, Medium, Low).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              headline: { type: Type.STRING },
              content: { type: Type.STRING },
              timestamp: { type: Type.STRING },
              source: { type: Type.STRING },
              impact: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] }
            },
            required: ['id', 'headline', 'content', 'timestamp', 'source', 'impact']
          }
        }
      }
    }));

    if (!response.text) {
        throw new Error("No text returned from API");
    }

    return JSON.parse(response.text);
  } catch (error) {
    console.error("News Fetch Error:", error);
    return [];
  }
};

export const getSmtAnalysis = async (asset1: string, asset2: string): Promise<SmtAnalysis> => {
  try {
    const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze the correlation and price action between ${asset1} and ${asset2} to detect any Smart Money Tool (SMT) divergence.
      SMT divergence occurs when correlated assets fail to confirm each other's highs or lows (e.g., one makes a higher high while the other makes a lower high).
      Provide:
      1. Whether an SMT divergence is currently detected (true/false).
      2. Type of divergence (Bullish, Bearish, or None).
      3. Confidence level (High, Medium, Low).
      4. Brief reasoning (max 1 sentence).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detected: { type: Type.BOOLEAN },
            type: { type: Type.STRING, enum: ['Bullish', 'Bearish', 'None'] },
            confidence: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
            reasoning: { type: Type.STRING }
          },
          required: ['detected', 'type', 'confidence', 'reasoning']
        }
      }
    }));

    if (!response.text) {
        throw new Error("No text returned from API");
    }

    return JSON.parse(response.text);
  } catch (error) {
    console.error("SMT Analysis Error:", error);
    return {
      detected: false,
      type: 'None',
      confidence: 'Low',
      reasoning: 'Unable to analyze divergence at this moment.'
    };
  }
};

export const getPatternAnalysis = async (symbolLabel: string, timeframe: string): Promise<PatternAnalysis> => {
  try {
    const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-3-flash-preview", // Use flash to avoid quota limits
      contents: `Analyze the current chart for ${symbolLabel} on the ${timeframe} timeframe.
      Detect any of the following patterns: Divergence (RSI/MACD), Head and Shoulders, Elliott Wave structures, Trendlines, or Harmonic Patterns.
      Provide:
      1. Whether any patterns are detected (true/false).
      2. A list of detected patterns, each with:
         - name: The name of the pattern.
         - type: Bullish, Bearish, or Neutral.
         - confidence: High, Medium, or Low.
         - description: A brief 1-sentence explanation.
         - signal: Buy, Sell, or Neutral.
      If no patterns are clearly visible, set detected to false and return an empty list.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detected: { type: Type.BOOLEAN },
            patterns: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ['Bullish', 'Bearish', 'Neutral'] },
                  confidence: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
                  description: { type: Type.STRING },
                  signal: { type: Type.STRING, enum: ['Buy', 'Sell', 'Neutral'] }
                },
                required: ['name', 'type', 'confidence', 'description', 'signal']
              }
            }
          },
          required: ['detected', 'patterns']
        }
      }
    }));

    if (!response.text) {
        throw new Error("No text returned from API");
    }

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Pattern Analysis Error:", error);
    return {
      detected: false,
      patterns: []
    };
  }
};
