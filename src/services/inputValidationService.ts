import logger from '../config/logger';

export interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

export class InputValidationService {
  private readonly MAX_DESCRIPTION_LENGTH = 500;
  private readonly MAX_IMAGE_SIZE_MB = 10;
  private readonly ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  validateUserDescription(description: string): ValidationResult {
    if (!description || description.trim().length === 0) {
      return { isValid: true }; // Empty descriptions are allowed
    }

    const trimmed = description.trim();

    if (trimmed.length > this.MAX_DESCRIPTION_LENGTH) {
      return {
        isValid: false,
        errorMessage: `Description is too long. Maximum length is ${this.MAX_DESCRIPTION_LENGTH} characters.`
      };
    }

    // Check for potentially harmful content (basic filtering)
    const harmfulPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i
    ];

    for (const pattern of harmfulPatterns) {
      if (pattern.test(trimmed)) {
        logger.warn({
          event: 'harmful_content_detected',
          content: trimmed.substring(0, 100) + '...'
        });
        return {
          isValid: false,
          errorMessage: 'Description contains potentially harmful content.'
        };
      }
    }

    return { isValid: true };
  }

  async validateReferenceImage(url: string): Promise<ValidationResult> {
    try {
      // Basic URL validation
      const urlPattern = /^https?:\/\/.+/i;
      if (!urlPattern.test(url)) {
        return {
          isValid: false,
          errorMessage: 'Invalid image URL format.'
        };
      }

      // Check if URL is accessible and get content type/size
      const response = await fetch(url, { method: 'HEAD' });

      if (!response.ok) {
        return {
          isValid: false,
          errorMessage: 'Image URL is not accessible.'
        };
      }

      const contentType = response.headers.get('content-type');
      const contentLength = response.headers.get('content-length');

      // Validate content type
      if (!contentType || !this.ALLOWED_IMAGE_TYPES.includes(contentType)) {
        return {
          isValid: false,
          errorMessage: `Unsupported image type. Allowed types: ${this.ALLOWED_IMAGE_TYPES.join(', ')}`
        };
      }

      // Validate file size
      if (contentLength) {
        const sizeInMB = parseInt(contentLength) / (1024 * 1024);
        if (sizeInMB > this.MAX_IMAGE_SIZE_MB) {
          return {
            isValid: false,
            errorMessage: `Image is too large. Maximum size is ${this.MAX_IMAGE_SIZE_MB}MB.`
          };
        }
      }

      return { isValid: true };

    } catch (error) {
      logger.error({
        event: 'image_validation_error',
        error: error instanceof Error ? error.message : String(error),
        url
      });

      return {
        isValid: false,
        errorMessage: 'Failed to validate image. Please try again.'
      };
    }
  }

  validateCombinedInput(description?: string, imageUrl?: string): ValidationResult {
    // Validate description if provided
    if (description) {
      const descValidation = this.validateUserDescription(description);
      if (!descValidation.isValid) {
        return descValidation;
      }
    }

    // At least one input should be provided for enhancement
    if (!description && !imageUrl) {
      return {
        isValid: false,
        errorMessage: 'Please provide either a description or reference image for enhancement.'
      };
    }

    return { isValid: true };
  }
}