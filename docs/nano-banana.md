# Image Generation Prompting Best Practices

## Overview
This document outlines best practices for writing effective prompts for AI image generation, specifically for Google's Gemini image generation models. These guidelines are based on Google's official documentation and practical experience with the VillageOS farming generation system.

## Core Principles

### 1. Be Hyper-Specific
Don't settle for vague descriptions. Every detail matters for consistency and quality.

**L Poor:** "Create a village crop"  
** Better:** "Create a small, round plant with soft purple leaves, large amber flowers, tiny roots, and a curly stem that bends at the tip"

### 2. Describe Scenes, Not Keywords
Write full descriptions as if explaining to an artist, not listing tags.

**L Poor:** "Dragon, fantasy, medieval, armor, castle"  
** Better:** "A majestic dragon perched on a medieval castle tower, wearing ornate silver armor with intricate engravings, overlooking a misty valley at sunset"

### 3. Provide Context and Intent
Explain the purpose and use case for the image.

**L Poor:** "Make a logo"  
** Better:** "Create a minimalist logo for a collaborative farming game, featuring a stylized seed shape with modern, natural elements suitable for a mobile app icon"

## Prompt Structure Template

### For Village Object Generation
```
[Opening statement with subject and purpose]

Visual Details:
- [Composition and framing]
- [Lighting and atmosphere]
- [Specific physical features]
- [Colors and patterns]
- [Style and artistic direction]
- [Background and environment]

[Closing context about the image's use]
```

### Example Implementation
```
Generate a front-facing view of a village crop for a collaborative farming game.

Visual Details:
- Centered composition with the subject filling 80% of the frame
- Soft studio lighting from above creating gentle shadows
- Round body shape with short stubby legs and oversized head
- Bright teal base color with darker blue spots in a dalmatian pattern
- Large expressive eyes with star-shaped pupils
- Modern pixel-art style with smooth edges and high contrast
- Clean white gradient background fading to soft blue at edges

This will serve as the character's reference image for consistent appearance across all game assets.
```

## Technical Terminology

### Composition Terms
- **Portrait**: Close-up of face/head
- **Full-body shot**: Entire character visible
- **Three-quarter view**: Between profile and front
- **Centered composition**: Subject in middle of frame
- **Rule of thirds**: Subject positioned at intersection points

### Lighting Terms
- **Studio lighting**: Even, professional illumination
- **Soft lighting**: Gentle, diffused light with soft shadows
- **Dramatic lighting**: High contrast with strong shadows
- **Backlighting**: Light source behind subject
- **Ambient lighting**: Natural, environmental light

### Style Terms
- **Pixel-art inspired**: Retro gaming aesthetic with modern polish
- **Cell-shaded**: Cartoon-like with distinct shadow boundaries
- **Photorealistic**: Life-like appearance
- **Minimalist**: Simple, clean design with few elements
- **Stylized**: Artistic interpretation rather than realistic

## Consistency Techniques

### When Using Reference Images
Always explicitly state the consistency requirements:

```
[Action description]

Scene composition:
- The character must match EXACTLY the appearance shown in the reference image
- Maintain identical colors, patterns, and distinctive features
- Keep the same art style and visual quality
- [Specific action or pose requirements]
- Preserve all unique identifying markers

Critical: This is the same individual character, not a similar one.
```

### For Evolution/Transformation
Describe what changes AND what stays the same:

```
Transform this [current stage] into [next stage].

What changes:
- Body size increases by [specific amount]
- [List specific transformations]

What remains constant:
- Original color scheme and patterns
- Distinctive markings and features
- Art style and visual quality
- Core identity and personality hints
```

## Common Pitfalls to Avoid

### 1. Ambiguous Descriptions
**L Avoid:** "Make it look good"  
** Use:** "Apply professional color grading with enhanced contrast and vibrant saturation"

### 2. Contradictory Instructions
**L Avoid:** "Realistic cartoon style"  
** Use:** "Semi-realistic style with stylized proportions"

### 3. Negative Prompting
**L Avoid:** "Not dark, not scary"  
** Use:** "Bright, cheerful, and friendly appearance"

### 4. Overloading Details
**L Avoid:** 20+ specific requirements in one prompt  
** Use:** Focus on 5-7 key visual elements that define the character

## Iterative Refinement Strategy

### Initial Generation
Start with core identity elements:
1. Overall shape and proportions
2. Primary colors and patterns
3. Distinctive features
4. Art style

### Refinement Prompts
Use conversational follow-ups:
- "Perfect, but make the eyes slightly larger"
- "Great base, now add a small crown accessory"
- "Excellent, but warm up the color temperature slightly"

## Special Use Cases

### Text in Images
Be explicit about text placement and styling:
```
Include the text "LEVEL UP" in bold, pixelated font at the top center of the image, 
with a golden gradient and subtle drop shadow
```

### Multiple Characters
Describe relationships and positioning:
```
Two village crops growing together: the larger plant on the left is providing shade for the smaller plant on the right.
Both should maintain their distinct appearances from their reference images.
```

### Action Scenes
Describe motion and energy:
```
The crop is mid-growth reaching for sunlight, with its stem stretched upward, 
leaves curved for optimal light capture, and flowers focused on pollination. 
Motion blur on the extremities suggests movement.
```

## Quality Checklist

Before finalizing a prompt, verify:
- [ ] Specific visual details provided
- [ ] Clear composition and framing described
- [ ] Lighting and atmosphere defined
- [ ] Art style explicitly stated
- [ ] Purpose/context included
- [ ] No contradictory instructions
- [ ] Positive descriptions (not negative)
- [ ] Reasonable scope (not overloaded)

## Example Prompts by Category

### Character Creation
```
Design a young tomato plant for a collaborative farming game. 
Small, chubby body with oversized wings, pastel pink scales with iridescent shine, 
large innocent eyes with long eyelashes, sitting pose with tail wrapped around its feet. 
Soft, even lighting. Clean, minimal background. 
Cute, approachable style similar to modern Pokemon designs.
```

### Environment/Scene
```
Create a cozy village garden scene viewed from a three-quarter angle.
Small raised garden beds with soil patterns, scattered farming tools,
watering can and seed packets in the corner, warm afternoon sunlight streaming through trees, 
soft shadows, pastel color palette, illustration style with smooth gradients.
```

### UI Elements
```
Design a growth bar UI element for a farming game. 
Horizontal capsule shape, 200px wide by 40px tall, 
bright green fill with subtle gradient from light to dark, 
thin white outline with soft drop shadow, 
small heart icon on the left end, 
clean vector style suitable for mobile interface.
```

## Testing Your Prompts

### Consistency Test
Generate the same prompt 3 times and check:
- Do key features remain consistent?
- Is the style maintained?
- Are colors and patterns similar?

### Clarity Test
Have someone else read your prompt:
- Can they visualize what you're describing?
- Are there ambiguous parts?
- What questions do they have?

### Refinement Test
Try variations:
- Add one detail at a time
- Adjust single parameters
- Test different phrasings

## References

- [Google Gemini Image Generation Guide](https://ai.google.dev/gemini-api/docs/image-generation#prompt-guide)
- [Google AI Studio Best Practices](https://x.com/googleaistudio/article/1962957615262224511)
- VillageOS Baseline Implementation: `/thoughts/shared/plans/baseline-image-consistency.md`

## Quick Reference Card

### Prompt Formula
**Subject** + **Action/Pose** + **Visual Details** + **Style** + **Composition** + **Purpose**

### Essential Elements
1. **Who/What**: Clear subject identification
2. **How**: Specific visual appearance
3. **Where**: Background/environment
4. **Style**: Artistic direction
5. **Why**: Context and use case

### Power Words
- **Composition**: centered, rule-of-thirds, portrait, full-body
- **Lighting**: soft, dramatic, studio, ambient, backlit
- **Style**: pixel-art, minimalist, stylized, photorealistic
- **Quality**: vibrant, high-contrast, detailed, polished
- **Mood**: cheerful, serene, energetic, cozy, playful