import { SupabaseMediaService, TempFileInfo } from './supabaseMediaService';
import { GoogleGenAI } from '@google/genai';
import zlib from 'zlib';

export interface MediaGenerationRequest {
   prompt: string;
   type: 'image' | 'video' | 'audio';
   style?: string;
   format?: string;
   baselineImageUrl?: string;  // New optional field
   jobType?: string;  // New optional field for job type
}

export class MediaGenerationService {
  private ai: GoogleGenAI;

  constructor(
    private mediaService: SupabaseMediaService,
    private geminiApiKey: string
  ) {
    this.ai = new GoogleGenAI({
      apiKey: geminiApiKey
    });
  }

  private enhancePromptWithoutBaseline(prompt: string): string {
    // Enhanced prompt following Google's guidelines for detailed image generation
    return `${prompt}

Scene composition guidelines:
- Create a highly detailed, vivid scene with rich visual elements
- Use dramatic lighting and professional composition techniques
- Include appropriate environmental details and atmospheric effects
- Ensure all elements are visually cohesive and well-integrated
- Apply professional art direction with attention to color theory and visual hierarchy

Technical quality:
- Ultra-high resolution with crisp, clean details
- Professional photography quality with perfect focus and exposure
- Rich color palette with accurate color representation
- Photorealistic textures and materials
- Perfect anatomy and proportions for all subjects

Artistic style:
- Cinematic composition with dynamic camera angles
- Professional illustration quality with smooth gradients and textures
- Consistent art direction throughout the entire scene
- High production value with attention to every visual detail`;
  }

  private enhanceMePrompt(basePrompt: string): string {
    return `${basePrompt}

Additional context: This is for a farming village simulation game character.
The character should look friendly and approachable.
Ensure the image is suitable for a family-friendly game environment.
Focus on creating a cohesive character design that will work well in various village scenes.
Style: Professional portrait photography with warm, natural lighting.
Composition: Head and shoulders view, centered, with clean background.`;
  }

  async generateMedia(request: MediaGenerationRequest): Promise<TempFileInfo> {
    try {
      console.log(`Generating image for prompt: "${request.prompt}"`);

      let contents: any[] = [{ text: request.prompt }];

      // Include baseline image if available
      if (request.baselineImageUrl) {
        try {
          const response = await fetch(request.baselineImageUrl);
          const buffer = await response.arrayBuffer();
          const base64Image = Buffer.from(buffer).toString('base64');

          // Enhanced prompt following Google's guidelines for consistency with reference image
          const enhancedPrompt = `${request.prompt}

          Scene composition:
          - The village object must match EXACTLY the appearance, colors, and patterns shown in the reference image
          - Maintain the same art style and visual consistency
          - Place the village object in the center of the composition performing the action
          - Use appropriate props and environment for the action (watering can for watering, tools for harvesting, etc.)
          - Keep the same lighting quality and color temperature as the reference
          - The village object's appearance should reflect the action while preserving all unique visual features

          Critical: This is the same individual village object, not a similar one. All distinctive markings, colors, and features must be identical.`;

          contents = [
            { text: enhancedPrompt },
            {
              inlineData: {
                mimeType: "image/png",
                data: base64Image,
              },
            },
          ];
        } catch (error) {
          console.error('Failed to load baseline image, proceeding without reference:', error);
          // Fall back to enhanced text prompt
          request.prompt = this.enhancePromptWithoutBaseline(request.prompt);
        }
      } else {
         // If no baseline, use enhanced text prompt with detailed description
         request.prompt = this.enhancePromptWithoutBaseline(request.prompt);

         // Apply additional enhancement for character customization
         if (request.jobType === 'BASELINE') {
           request.prompt = this.enhanceMePrompt(request.prompt);
         }
       }

      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash-image-preview",
        contents: contents
      });

      if (response.candidates && response.candidates[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.text) {
            // console.log(part.text);
          } else if (part.inlineData?.data) {
            const imageData = part.inlineData.data;
            const buffer = Buffer.from(imageData, "base64");

            // Upload to Supabase
            const result = await this.mediaService.saveTemporaryFile(
              buffer,
              `generated-${Date.now()}.png`,
              'image/png'
            );

            console.log(`Image uploaded to Supabase: ${result.url}`);
            return result;
          }
        }
      }
      
      console.log("No candidates found in response. This could be due to:");
      console.log("1. Content filtering/safety restrictions");
      console.log("2. API quota/rate limits");
      console.log("3. Model not generating content for this prompt");
      if (response.usageMetadata?.totalTokenCount === response.usageMetadata?.promptTokenCount) {
        console.log("4. No content was generated (input tokens = output tokens)");
      }
      throw new Error('No image generated by Gemini API');
    } catch (error) {
      console.error('Error generating image:', error);
      throw error;
    }
  }
}