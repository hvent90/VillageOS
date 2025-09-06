import { GoogleGenAI } from '@google/genai';
import logger from '../config/logger';

export interface PromptEnhancementRequest {
  basePrompt: string;
  userDescription?: string;
  referenceImageUrl?: string;
  villageName?: string;
  actionType?: string;
}

export interface PromptEnhancementResponse {
  enhancedPrompt: string;
  usedFallback: boolean;
  enhancementReason?: string;
}

const promptingGuidelines = '## Core Principles\n' +
    '\n' +
    '### 1. Be Hyper-Specific\n' +
    'Don\'t settle for vague descriptions. Every detail matters for consistency and quality.\n' +
    '\n' +
    '**L Poor:** "Create a village crop"  \n' +
    '** Better:** "Create a small, round plant with soft purple leaves, large amber flowers, tiny roots, and a curly stem that bends at the tip"\n' +
    '\n' +
    '### 2. Describe Scenes, Not Keywords\n' +
    'Write full descriptions as if explaining to an artist, not listing tags.\n' +
    '\n' +
    '**L Poor:** "Dragon, fantasy, medieval, armor, castle"  \n' +
    '** Better:** "A majestic dragon perched on a medieval castle tower, wearing ornate silver armor with intricate engravings, overlooking a misty valley at sunset"\n' +
    '\n' +
    '### 3. Provide Context and Intent\n' +
    'Explain the purpose and use case for the image.\n' +
    '\n' +
    '**L Poor:** "Make a logo"  \n' +
    '** Better:** "Create a minimalist logo for a collaborative farming game, featuring a stylized seed shape with modern, natural elements suitable for a mobile app icon"\n' +
    '\n' +
    '## Prompt Structure Template\n' +
    '\n' +
    '### For Village Object Generation\n' +
    '```\n' +
    '[Opening statement with subject and purpose]\n' +
    '\n' +
    'Visual Details:\n' +
    '- [Composition and framing]\n' +
    '- [Lighting and atmosphere]\n' +
    '- [Specific physical features]\n' +
    '- [Colors and patterns]\n' +
    '- [Style and artistic direction]\n' +
    '- [Background and environment]\n' +
    '\n' +
    '[Closing context about the image\'s use]\n' +
    '```\n' +
    '\n' +
    '### Example Implementation\n' +
    '```\n' +
    'Generate a front-facing view of a village crop for a collaborative farming game.\n' +
    '\n' +
    'Visual Details:\n' +
    '- Centered composition with the subject filling 80% of the frame\n' +
    '- Soft studio lighting from above creating gentle shadows\n' +
    '- Round body shape with short stubby legs and oversized head\n' +
    '- Bright teal base color with darker blue spots in a dalmatian pattern\n' +
    '- Large expressive eyes with star-shaped pupils\n' +
    '- Modern pixel-art style with smooth edges and high contrast\n' +
    '- Clean white gradient background fading to soft blue at edges\n' +
    '\n' +
    'This will serve as the character\'s reference image for consistent appearance across all game assets.\n' +
    '```\n' +
    '\n' +
    '## Technical Terminology\n' +
    '\n' +
    '### Composition Terms\n' +
    '- **Portrait**: Close-up of face/head\n' +
    '- **Full-body shot**: Entire character visible\n' +
    '- **Three-quarter view**: Between profile and front\n' +
    '- **Centered composition**: Subject in middle of frame\n' +
    '- **Rule of thirds**: Subject positioned at intersection points\n' +
    '\n' +
    '### Lighting Terms\n' +
    '- **Studio lighting**: Even, professional illumination\n' +
    '- **Soft lighting**: Gentle, diffused light with soft shadows\n' +
    '- **Dramatic lighting**: High contrast with strong shadows\n' +
    '- **Backlighting**: Light source behind subject\n' +
    '- **Ambient lighting**: Natural, environmental light\n' +
    '\n' +
    '### Style Terms\n' +
    '- **Pixel-art inspired**: Retro gaming aesthetic with modern polish\n' +
    '- **Cell-shaded**: Cartoon-like with distinct shadow boundaries\n' +
    '- **Photorealistic**: Life-like appearance\n' +
    '- **Minimalist**: Simple, clean design with few elements\n' +
    '- **Stylized**: Artistic interpretation rather than realistic\n' +
    '\n' +
    '## Consistency Techniques\n' +
    '\n' +
    '### When Using Reference Images\n' +
    'Always explicitly state the consistency requirements:\n' +
    '\n' +
    '```\n' +
    '[Action description]\n' +
    '\n' +
    'Scene composition:\n' +
    '- The village object must match EXACTLY the appearance shown in the reference image\n' +
    '- Maintain identical colors, patterns, and distinctive features\n' +
    '- Keep the same art style and visual quality\n' +
    '- [Specific action or pose requirements]\n' +
    '- Preserve all unique identifying markers\n' +
    '\n' +
    'Critical: This is the same individual character, not a similar one.\n' +
    '```\n' +
    '\n' +
    '### For Evolution/Transformation\n' +
    'Describe what changes AND what stays the same:\n' +
    '\n' +
    '```\n' +
    'Transform this [current stage] into [next stage].\n' +
    '\n' +
    'What changes:\n' +
    '- Body size increases by [specific amount]\n' +
    '- [List specific transformations]\n' +
    '\n' +
    'What remains constant:\n' +
    '- Original color scheme and patterns\n' +
    '- Distinctive markings and features\n' +
    '- Art style and visual quality\n' +
    '- Core identity and personality hints\n' +
    '```\n' +
    '\n' +
    '## Common Pitfalls to Avoid\n' +
    '\n' +
    '### 1. Ambiguous Descriptions\n' +
    '**L Avoid:** "Make it look good"  \n' +
    '** Use:** "Apply professional color grading with enhanced contrast and vibrant saturation"\n' +
    '\n' +
    '### 2. Contradictory Instructions\n' +
    '**L Avoid:** "Realistic cartoon style"  \n' +
    '** Use:** "Semi-realistic style with stylized proportions"\n' +
    '\n' +
    '### 3. Negative Prompting\n' +
    '**L Avoid:** "Not dark, not scary"  \n' +
    '** Use:** "Bright, cheerful, and friendly appearance"\n' +
    '\n' +
    '### 4. Overloading Details\n' +
    '**L Avoid:** 20+ specific requirements in one prompt  \n' +
    '** Use:** Focus on 5-7 key visual elements that define the character\n' +
    '\n' +
    '## Iterative Refinement Strategy\n' +
    '\n' +
    '### Initial Generation\n' +
    'Start with core identity elements:\n' +
    '1. Overall shape and proportions\n' +
    '2. Primary colors and patterns\n' +
    '3. Distinctive features\n' +
    '4. Art style\n' +
    '\n' +
    '### Refinement Prompts\n' +
    'Use conversational follow-ups:\n' +
    '- "Perfect, but make the eyes slightly larger"\n' +
    '- "Great base, now add a small crown accessory"\n' +
    '- "Excellent, but warm up the color temperature slightly"\n' +
    '\n' +
    '## Special Use Cases\n' +
    '\n' +
    '### Text in Images\n' +
    'Be explicit about text placement and styling:\n' +
    '```\n' +
    'Include the text "LEVEL UP" in bold, pixelated font at the top center of the image, \n' +
    'with a golden gradient and subtle drop shadow\n' +
    '```\n' +
    '\n' +
    '### Multiple Characters\n' +
    'Describe relationships and positioning:\n' +
    '```\n' +
    'Two village crops growing together: the larger plant on the left is providing shade for the smaller plant on the right.\n' +
    'Both should maintain their distinct appearances from their reference images.\n' +
    '```\n' +
    '\n' +
    '### Action Scenes\n' +
    'Describe motion and energy:\n' +
    '```\n' +
    'The crop is mid-growth reaching for sunlight, with its stem stretched upward, \n' +
    'leaves curved for optimal light capture, and flowers focused on pollination. \n' +
    'Motion blur on the extremities suggests natural movement.\n' +
    '```\n' +
    '\n' +
    '## Quality Checklist\n' +
    '\n' +
    'Before finalizing a prompt, verify:\n' +
    '- [ ] Specific visual details provided\n' +
    '- [ ] Clear composition and framing described\n' +
    '- [ ] Lighting and atmosphere defined\n' +
    '- [ ] Art style explicitly stated\n' +
    '- [ ] Purpose/context included\n' +
    '- [ ] No contradictory instructions\n' +
    '- [ ] Positive descriptions (not negative)\n' +
    '- [ ] Reasonable scope (not overloaded)\n' +
    '\n' +
    '## Example Prompts by Category\n' +
    '\n' +
    '### Character Creation\n' +
    '```\n' +
    'Design a young tomato plant for a collaborative farming game. \n' +
    'Small, bushy plant with broad leaves, bright green foliage with natural texture, \n' +
    'small developing fruit with subtle red tint, growing pose with roots anchoring in soil. \n' +
    'Soft, natural lighting. Clean, garden background. \n' +
    'Realistic, approachable style similar to modern farming sim designs.\n' +
    '```\n' +
    '\n' +
    '### Environment/Scene\n' +
    '```\n' +
    'Create a cozy village garden scene viewed from a three-quarter angle. \n' +
    'Small raised garden beds with soil patterns, scattered farming tools, \n' +
    'watering can and seed packets in the corner, warm afternoon sunlight streaming through trees, \n' +
    'soft shadows, natural color palette, illustration style with smooth gradients.\n' +
    '```\n' +
    '\n' +
    '### UI Elements\n' +
    '```\n' +
    'Design a growth bar UI element for a farming game. \n' +
    'Horizontal capsule shape, 200px wide by 40px tall, \n' +
    'bright green fill with subtle gradient from light to dark, \n' +
    'thin white outline with soft drop shadow, \n' +
    'small leaf icon on the left end, \n' +
    'clean vector style suitable for mobile interface.\n' +
    '```';


export class LLMPromptService {
  private ai: GoogleGenAI;
  private textModel: string;

  constructor(geminiApiKey: string, textModel: string = 'gemini-2.5-flash', cacheService?: any) {
    this.ai = new GoogleGenAI({ apiKey: geminiApiKey });
    this.textModel = textModel;
  }

  async generate(instructions: string): Promise<string> {
    const prompt = 'You are generating a prompt for an image generation model called "Nano Banana".' +
        `<prompt_guidelines>${promptingGuidelines}</prompt_guidelines>` +
        `<instructions>${instructions}</instructions>
        Now generate a new prompt.`;

    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ text: prompt }]
    });

    let enhancement = '';

    if (response.candidates && response.candidates[0]?.content?.parts?.[0]?.text) {
      enhancement = response.candidates[0].content.parts[0].text.trim();
    }

    return enhancement;
  }
}