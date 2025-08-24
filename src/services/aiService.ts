// AI Service for GPT-4 Vision integration
// Note: This is optional for MVP - you can implement this later

export interface AIVerificationRequest {
  imageUrl: string;
  goalRequirements: string[];
  goalTitle: string;
}

export interface AIVerificationResponse {
  isApproved: boolean;
  confidence: number;
  reasoning: string;
  suggestions?: string[];
}

export class AIService {
  private static apiKey: string | null = null;
  private static baseUrl = 'https://api.openai.com/v1';

  // Initialize with your OpenAI API key
  static initialize(apiKey: string): void {
    this.apiKey = apiKey;
  }

  // Verify check-in image against goal requirements
  static async verifyCheckIn(request: AIVerificationRequest): Promise<AIVerificationResponse> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not initialized');
    }

    try {
      const prompt = this.buildPrompt(request.goalTitle, request.goalRequirements);
      
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4-vision-preview',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: request.imageUrl,
                  },
                },
              ],
            },
          ],
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No response content from OpenAI');
      }

      return this.parseAIResponse(content);
    } catch (error) {
      console.error('Error verifying check-in with AI:', error);
      throw error;
    }
  }

  // Build the prompt for AI verification
  private static buildPrompt(goalTitle: string, requirements: string[]): string {
    return `You are an AI judge for a social accountability app called SquadCheck. 

Your task is to verify if a user's check-in image meets the requirements for their goal.

Goal: ${goalTitle}
Requirements: ${requirements.join(', ')}

Please analyze the image and provide:
1. A clear YES/NO verdict on whether the check-in meets the goal requirements
2. Your confidence level (0-100%)
3. Reasoning for your decision
4. Any suggestions for improvement (optional)

Format your response as:
VERDICT: [YES/NO]
CONFIDENCE: [0-100]%
REASONING: [Your detailed reasoning]
SUGGESTIONS: [Optional suggestions]`;
  }

  // Parse the AI response into structured data
  private static parseAIResponse(content: string): AIVerificationResponse {
    const lines = content.split('\n');
    let isApproved = false;
    let confidence = 0;
    let reasoning = '';
    let suggestions: string[] = [];

    for (const line of lines) {
      if (line.startsWith('VERDICT:')) {
        const verdict = line.replace('VERDICT:', '').trim().toUpperCase();
        isApproved = verdict === 'YES';
      } else if (line.startsWith('CONFIDENCE:')) {
        const confStr = line.replace('CONFIDENCE:', '').replace('%', '').trim();
        confidence = parseInt(confStr) || 0;
      } else if (line.startsWith('REASONING:')) {
        reasoning = line.replace('REASONING:', '').trim();
      } else if (line.startsWith('SUGGESTIONS:')) {
        const suggestionsStr = line.replace('SUGGESTIONS:', '').trim();
        if (suggestionsStr) {
          suggestions = suggestionsStr.split(',').map(s => s.trim());
        }
      }
    }

    return {
      isApproved,
      confidence,
      reasoning,
      suggestions,
    };
  }

  // Check if AI service is available
  static isAvailable(): boolean {
    return !!this.apiKey;
  }

  // Get service status
  static getStatus(): { available: boolean; initialized: boolean } {
    return {
      available: !!this.apiKey,
      initialized: !!this.apiKey,
    };
  }
} 