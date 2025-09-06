import { LLMPromptService } from '../src/services/llmPromptService';

// Mock the GoogleGenAI
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      generateContent: jest.fn()
    }
  }))
}));

describe('LLMPromptService Multi-Modal', () => {
  let service: LLMPromptService;
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create service instance
    service = new LLMPromptService(mockApiKey);
  });

  it('should generate prompts with image data', async () => {
    const mockResponse = {
      candidates: [{
        content: {
          parts: [{ text: 'Enhanced prompt with image analysis' }]
        }
      }]
    };

    // Mock the generateContent method
    const mockGenerateContent = service['ai'].models.generateContent as jest.MockedFunction<any>;
    mockGenerateContent.mockResolvedValue(mockResponse);

    const imageBuffer = Buffer.from('fake-image-data');
    const result = await service.generate('test prompt', {
      data: imageBuffer,
      mimeType: 'image/png'
    });

    expect(result).toBe('Enhanced prompt with image analysis');
    expect(mockGenerateContent).toHaveBeenCalledWith({
      model: 'gemini-2.5-flash',
      contents: [
        { text: expect.stringContaining('test prompt') },
        {
          inlineData: {
            mimeType: 'image/png',
            data: 'ZmFrZS1pbWFnZS1kYXRh' // base64 encoded 'fake-image-data'
          }
        }
      ]
    });
  });

  it('should work without image data (backward compatibility)', async () => {
    const mockResponse = {
      candidates: [{
        content: {
          parts: [{ text: 'Enhanced prompt without image' }]
        }
      }]
    };

    // Mock the generateContent method
    const mockGenerateContent = service['ai'].models.generateContent as jest.MockedFunction<any>;
    mockGenerateContent.mockResolvedValue(mockResponse);

    const result = await service.generate('test prompt');

    expect(result).toBe('Enhanced prompt without image');
    expect(mockGenerateContent).toHaveBeenCalledWith({
      model: 'gemini-2.5-flash',
      contents: [{ text: expect.stringContaining('test prompt') }]
    });
  });

  it('should handle base64 string image data', async () => {
    const mockResponse = {
      candidates: [{
        content: {
          parts: [{ text: 'Enhanced prompt with base64 image' }]
        }
      }]
    };

    // Mock the generateContent method
    const mockGenerateContent = service['ai'].models.generateContent as jest.MockedFunction<any>;
    mockGenerateContent.mockResolvedValue(mockResponse);

    const base64Data = 'dGVzdC1iYXNlNjQtZGF0YQ=='; // base64 encoded 'test-base64-data'
    const result = await service.generate('test prompt', {
      data: base64Data,
      mimeType: 'image/jpeg'
    });

    expect(result).toBe('Enhanced prompt with base64 image');
    expect(mockGenerateContent).toHaveBeenCalledWith({
      model: 'gemini-2.5-flash',
      contents: [
        { text: expect.stringContaining('test prompt') },
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Data
          }
        }
      ]
    });
  });

  it('should handle API errors gracefully', async () => {
    // Mock the generateContent method to throw an error
    const mockGenerateContent = service['ai'].models.generateContent as jest.MockedFunction<any>;
    mockGenerateContent.mockRejectedValue(new Error('API Error'));

    const imageBuffer = Buffer.from('fake-image-data');
    await expect(service.generate('test prompt', {
      data: imageBuffer,
      mimeType: 'image/png'
    })).rejects.toThrow('API Error');
  });

  it('should handle empty response from API', async () => {
    const mockResponse = {
      candidates: [{
        content: {
          parts: [{}] // Empty parts
        }
      }]
    };

    // Mock the generateContent method
    const mockGenerateContent = service['ai'].models.generateContent as jest.MockedFunction<any>;
    mockGenerateContent.mockResolvedValue(mockResponse);

    const result = await service.generate('test prompt');

    expect(result).toBe('');
  });

  it('should generate prompts with multiple images', async () => {
    const mockResponse = {
      candidates: [{
        content: {
          parts: [{ text: 'Enhanced prompt with multiple images' }]
        }
      }]
    };

    // Mock the generateContent method
    const mockGenerateContent = service['ai'].models.generateContent as jest.MockedFunction<any>;
    mockGenerateContent.mockResolvedValue(mockResponse);

    const imageData = [
      { data: Buffer.from('plant-image-data'), mimeType: 'image/png' },
      { data: Buffer.from('village-image-data'), mimeType: 'image/png' }
    ];

    const result = await service.generate('test prompt', imageData);

    expect(result).toBe('Enhanced prompt with multiple images');
    expect(mockGenerateContent).toHaveBeenCalledWith({
      model: 'gemini-2.5-flash',
      contents: [
        { text: expect.stringContaining('test prompt') },
        {
          inlineData: {
            mimeType: 'image/png',
            data: 'cGxhbnQtaW1hZ2UtZGF0YQ==' // base64 encoded 'plant-image-data'
          }
        },
        {
          inlineData: {
            mimeType: 'image/png',
            data: 'dmlsbGFnZS1pbWFnZS1kYXRh' // base64 encoded 'village-image-data'
          }
        }
      ]
    });
  });

  it('should handle mixed image types in array', async () => {
    const mockResponse = {
      candidates: [{
        content: {
          parts: [{ text: 'Enhanced prompt with mixed images' }]
        }
      }]
    };

    // Mock the generateContent method
    const mockGenerateContent = service['ai'].models.generateContent as jest.MockedFunction<any>;
    mockGenerateContent.mockResolvedValue(mockResponse);

    const imageData = [
      { data: Buffer.from('png-image'), mimeType: 'image/png' },
      { data: 'jpeg-base64-data', mimeType: 'image/jpeg' }
    ];

    const result = await service.generate('test prompt', imageData);

    expect(result).toBe('Enhanced prompt with mixed images');
    expect(mockGenerateContent).toHaveBeenCalledWith({
      model: 'gemini-2.5-flash',
      contents: [
        { text: expect.stringContaining('test prompt') },
        {
          inlineData: {
            mimeType: 'image/png',
            data: 'cG5nLWltYWdl' // base64 encoded 'png-image'
          }
        },
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: 'jpeg-base64-data'
          }
        }
      ]
    });
  });

  it('should handle empty image array', async () => {
    const mockResponse = {
      candidates: [{
        content: {
          parts: [{ text: 'Enhanced prompt with no images' }]
        }
      }]
    };

    // Mock the generateContent method
    const mockGenerateContent = service['ai'].models.generateContent as jest.MockedFunction<any>;
    mockGenerateContent.mockResolvedValue(mockResponse);

    const result = await service.generate('test prompt', []);

    expect(result).toBe('Enhanced prompt with no images');
    expect(mockGenerateContent).toHaveBeenCalledWith({
      model: 'gemini-2.5-flash',
      contents: [{ text: expect.stringContaining('test prompt') }]
    });
  });
});