import OpenAI from 'openai';
import { SmartPreferenceRule } from '../../../shared/types';

export interface NLPParsedResponse {
  originalPrompt: string;
  summary: string;
  interpretedRules: SmartPreferenceRule[];
  confidence: number;
  reasoning?: string;
}

export class NLPPreferenceParser {
  public static async parse(prompt: string): Promise<NLPParsedResponse> {
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
      throw new Error("NVIDIA_API_KEY is missing in environment variables.");
    }

    const client = new OpenAI({
      baseURL: "https://integrate.api.nvidia.com/v1",
      apiKey: apiKey
    });

    const systemPrompt = `You are a Smart Timetabling Preference Parser.
You receive natural language preferences from university administrators about timetables.
Extract scheduling rules from the input and return them as a JSON array of "SmartPreferenceRule" objects.
Also provide a "summary" string explaining the rules found.

Respond ONLY with valid JSON in this exact structure, with no markdown formatting or extra text. Example:
{
  "summary": "String explaining the rules",
  "interpretedRules": [
    {
      "id": "rule-nlp-timestamp-1",
      "category": "STUDENT",
      "ruleCode": "MINIMIZE_GAPS",
      "name": "Minimize Gaps",
      "description": "Keep student schedule gap free",
      "targetScope": "GLOBAL",
      "priority": "HIGH",
      "weight": 80,
      "parameterValue": {},
      "isEnabled": true
    }
  ],
  "confidence": 0.95
}`;

    try {
      const completion: any = await client.chat.completions.create({
        model: "nvidia/nemotron-3-ultra-550b-a55b",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: 1,
        top_p: 0.95,
        max_tokens: 16384,
        extra_body: {
          chat_template_kwargs: { enable_thinking: true }
        },
        stream: true
      } as any);

      let reasoningContent = '';
      let textContent = '';

      for await (const chunk of completion) {
        if (!chunk.choices || chunk.choices.length === 0) continue;
        
        const delta = chunk.choices[0].delta as any;
        if (delta.reasoning_content) {
          reasoningContent += delta.reasoning_content;
        }
        if (delta.content) {
          textContent += delta.content;
        }
      }

      // Extract JSON from output content
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : textContent;
      
      let parsedData: any = {};
      try {
        parsedData = JSON.parse(jsonStr);
      } catch {
        parsedData = {
          summary: textContent.slice(0, 150) || "Interpreted via Nemotron 3 Ultra reasoning",
          interpretedRules: [],
          confidence: 0.85
        };
      }

      // Add generated IDs if missing
      const rules = (parsedData.interpretedRules || []).map((rule: any, idx: number) => ({
        ...rule,
        id: rule.id || `rule-nlp-${Date.now()}-${idx}`
      }));

      return {
        originalPrompt: prompt,
        summary: parsedData.summary || "Parsed using NVIDIA Nemotron 3 Ultra AI",
        interpretedRules: rules,
        confidence: parsedData.confidence || 0.95,
        reasoning: reasoningContent || undefined
      };
    } catch (error: any) {
      console.error("Error parsing preferences with NVIDIA Nemotron 3 Ultra:", error);
      throw new Error(`Failed to parse preferences using AI: ${error.message}`);
    }
  }
}
