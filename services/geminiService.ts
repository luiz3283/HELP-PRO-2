import { GoogleGenAI } from "@google/genai";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

export const readOdometer = async (base64Image: string): Promise<number | null> => {
  const ai = getAiClient();
  if (!ai) {
    console.warn("API Key missing for Gemini");
    return null;
  }

  try {
    // Remove header if present (data:image/jpeg;base64,)
    const cleanBase64 = base64Image.split(',')[1] || base64Image;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64
            }
          },
          {
            text: "Analise esta foto do painel de uma moto. Identifique o número da quilometragem (odômetro) visível. Retorne APENAS o número, sem texto."
          }
        ]
      }
    });

    const text = response.text?.trim();
    if (!text) return null;

    // Extract numbers only
    const numberStr = text.replace(/[^0-9]/g, '');
    const number = parseInt(numberStr, 10);
    
    return isNaN(number) ? null : number;

  } catch (error) {
    console.error("Gemini OCR error:", error);
    return null;
  }
};
