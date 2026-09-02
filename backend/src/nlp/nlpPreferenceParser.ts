import { PreferencePriority, SmartPreferenceRule } from '../../../shared/types';

export interface NLPParsedResponse {
  originalPrompt: string;
  summary: string;
  interpretedRules: SmartPreferenceRule[];
  confidence: number;
}

export class NLPPreferenceParser {
  public static async parse(prompt: string): Promise<NLPParsedResponse> {
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
      throw new Error("NVIDIA_API_KEY is missing in environment variables.");
    }

    const invoke_url = "https://integrate.api.nvidia.com/v1/chat/completions";

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

    const payload = {
      model: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      max_tokens: 4096,
      reasoning_budget: 1024,
      temperature: 0.6,
      top_p: 0.95,
      stream: false
    };

    try {
      const response = await fetch(invoke_url, {
        method: 'POST',
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`NVIDIA API Error: ${response.status} - ${errText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      
      // Parse JSON from content (it might be wrapped in ```json)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : content;
      
      const parsedData = JSON.parse(jsonStr);

      // Add generated IDs if missing
      const rules = (parsedData.interpretedRules || []).map((rule: any, idx: number) => ({
        ...rule,
        id: rule.id || `rule-nlp-${Date.now()}-${idx}`
      }));

      return {
        originalPrompt: prompt,
        summary: parsedData.summary || "Parsed using NVIDIA AI",
        interpretedRules: rules,
        confidence: parsedData.confidence || 0.95
      };
    } catch (error) {
      console.error("Error parsing preferences with NVIDIA AI:", error);
      throw new Error("Failed to parse preferences using AI reasoning.");
    }
  }
}
