import { GoogleGenAI, Modality, Type } from "@google/genai";
import { GradeLevel, QuizQuestion, ScienceTopic, Language } from "../types";

// Helper to get a fresh AI instance with the latest API Key
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to convert Blob to Base64
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        // Remove data URL prefix
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error("Failed to convert blob to base64"));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Helper to determine complexity instructions based on Grade
const getComplexityInstruction = (grade: GradeLevel): string => {
  const gradeStr = grade.toString();
  
  // Lower Primary (1-2)
  if (gradeStr.includes('الأول') || gradeStr.includes('الثاني')) {
    return `
      Target Audience: Children aged 6-7 (Grades 1-2).
      Complexity Level: Beginner.
      Style: Use very simple, short sentences. Focus on sensory details (what we see, hear, feel).
      Avoid complex scientific terms. Use concrete examples from home and school.
      Tone: Playful, warm, like a kindergarten teacher.
    `;
  }
  
  // Middle Primary (3-4)
  if (gradeStr.includes('الثالث') || gradeStr.includes('الرابع')) {
    return `
      Target Audience: Children aged 8-9 (Grades 3-4).
      Complexity Level: Intermediate.
      Style: Explain "How" and "Why". Start introducing cause and effect.
      Use simple analogies. Introduce basic scientific terms but explain them immediately.
      Tone: Encouraging, like a guide on an adventure.
    `;
  }
  
  // Upper Primary (5-6)
  return `
    Target Audience: Children aged 10-12 (Grades 5-6).
    Complexity Level: Advanced Primary.
    Style: Discuss processes, systems, and relationships.
    Use accurate scientific terminology. Connect concepts to real-world applications and technology.
    Tone: Junior scientist mentor, respectful of their growing intelligence.
  `;
};

// Helper to construct the full System Instruction
const getSystemInstruction = (grade: GradeLevel, language: Language) => {
  const complexity = getComplexityInstruction(grade);
  const langInstruction = language === 'en' 
    ? "OUTPUT LANGUAGE: ENGLISH ONLY. Speak naturally in English suitable for kids." 
    : "OUTPUT LANGUAGE: ARABIC. Speak in simple, clear Arabic (Modern Standard or White Dialect).";

  return `
    You are "The Smart Tutor" (المدرس الذكي), an AI science tutor for primary school kids.
    ${langInstruction}
    ${complexity}
    Goal: Make science fun, accessible, and age-appropriate.
    If the child makes a mistake, correct them gently and constructively.
    Use emojis to make the text lively.
  `;
};

export const explainLesson = async (grade: GradeLevel, topic: ScienceTopic, language: Language, input?: string | { audioData: string, mimeType: string }): Promise<string> => {
  try {
    const ai = getAI();
    const parts: any[] = [];
    
    // Context about grade and topic (Using the enum value which is Arabic, but the system instruction handles the output lang)
    const contextPrompt = `My grade is ${grade}. The topic is "${topic}".`;
    parts.push({ text: contextPrompt });

    if (!input || typeof input === 'string') {
        const query = input as string | undefined;
        const userPrompt = query 
          ? `${query}. Explain this to me.`
          : `Explain the lesson about "${topic}". Give me examples from daily life.`;
        parts.push({ text: userPrompt });
    } else {
        parts.push({ text: "Listen to my question and answer me." });
        parts.push({
            inlineData: {
                mimeType: input.mimeType,
                data: input.audioData
            }
        });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts },
      config: {
        systemInstruction: getSystemInstruction(grade, language),
        temperature: 0.7,
      },
    });
    return response.text || (language === 'en' ? "Sorry, something went wrong. Try again?" : "آسف، حدث خطأ بسيط. هل يمكننا المحاولة مرة أخرى؟");
  } catch (error) {
    console.error("Explanation error:", error);
    return language === 'en' ? "Connection error. Please check your internet." : "واجهت مشكلة في الاتصال. تأكد من الإنترنت!";
  }
};

export const generateLessonImages = async (topic: string): Promise<string[]> => {
  try {
    const ai = getAI();
    // Prompt for Arabic Version - No text to avoid rendering issues
    const arabicPrompt = `
      Create a high-quality, cute, 3D cartoon educational illustration about: "${topic}".
      CRITICAL: DO NOT WRITE TEXT. Keep it visual only.
      Focus on a clear, single object or scene for a child.
      Background: Simple and bright.
    `;
    
    // Prompt for English Version
    const englishPrompt = `
      High-quality educational scientific diagram for kids explaining: "${topic}".
      Labels and text MUST be in ENGLISH.
      Visual Style: Colorful, clear, white background.
    `;

    const imageConfig = { aspectRatio: "4:3" };

    const [arabicRes, englishRes] = await Promise.all([
      ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: arabicPrompt }] },
        config: { imageConfig }
      }),
      ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: englishPrompt }] },
        config: { imageConfig }
      })
    ]);

    const images: string[] = [];
    
    // Extract Arabic Image
    for (const part of arabicRes.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        images.push(`data:image/png;base64,${part.inlineData.data}`);
        break; 
      }
    }

    // Extract English Image
    for (const part of englishRes.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        images.push(`data:image/png;base64,${part.inlineData.data}`);
        break;
      }
    }

    return images;
  } catch (error) {
    console.error("Images gen error:", error);
    return [];
  }
};

export const generateQuiz = async (grade: GradeLevel, topic: ScienceTopic, language: Language): Promise<QuizQuestion[]> => {
  try {
    const ai = getAI();
    const langReq = language === 'en' ? "in English" : "in Arabic";
    
    const prompt = `
      Create a short quiz of 3 questions about "${topic}" for "${grade}".
      The questions must be ${langReq} and suitable for the age group.
      Return the result as JSON only.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswer: { type: Type.INTEGER, description: "Index of the correct answer (0-based)" },
              explanation: { type: Type.STRING, description: "Simple explanation for why it is correct" }
            },
            required: ["question", "options", "correctAnswer", "explanation"]
          }
        },
        systemInstruction: getSystemInstruction(grade, language)
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Quiz gen error:", error);
    return [];
  }
};

export const correctHomework = async (grade: GradeLevel, language: Language, imageBase64: string, mimeType: string): Promise<string> => {
  try {
    const ai = getAI();
    const userText = language === 'en' 
        ? `I am in ${grade}. This is my science homework. Correct it gently. If correct, encourage me. If wrong, explain why simply.`
        : `أنا طالب في ${grade}. هذه صورة واجبي المنزلي في العلوم. صحح الإجابة بلطف. إذا كانت صحيحة شجعني. إذا كانت خاطئة، اشرح لي الصواب ببساطة.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType, data: imageBase64 } },
          { text: userText }
        ]
      },
      config: {
        systemInstruction: getSystemInstruction(grade, language)
      }
    });
    return response.text || (language === 'en' ? "Couldn't read the homework clearly." : "لم أستطع قراءة الواجب بوضوح.");
  } catch (error) {
    console.error("Homework correction error:", error);
    return language === 'en' ? "Error checking homework." : "حدث خطأ أثناء فحص الواجب.";
  }
};

export const textToSpeech = async (text: string): Promise<string | null> => {
  try {
    const ai = getAI();
    const textToRead = text.length > 2000 ? text.substring(0, 2000) + "..." : text;
    
    // Kore is a good multilingual voice, handles both Arabic and English well.
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: textToRead }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, 
          },
        },
      },
    });
    
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (error) {
    console.error("TTS Error", error);
    return null;
  }
}

export const generateVideoScript = async (topic: ScienceTopic, language: Language, grade: GradeLevel): Promise<string> => {
    try {
        const ai = getAI();
        const prompt = language === 'en'
            ? `Tell me a very short, fun sci-fi story explaining "${topic}" for a child. Start with "Once upon a time..."`
            : `احكِ لي قصة خيال علمي قصيرة جداً وممتعة تشرح "${topic}" لطفل. ابدأ بـ "كان يا مكان..."`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { systemInstruction: getSystemInstruction(grade, language) }
        });
        return response.text || "";
    } catch (e) {
        return language === 'en' ? "Error generating story." : "حدث خطأ.";
    }
}
