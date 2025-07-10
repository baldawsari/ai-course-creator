const Anthropic = require('@anthropic-ai/sdk');
const { getConfig } = require('./index');

class ClaudeConfig {
  constructor() {
    this.config = null;
    this.client = null;
    this.initialized = false;
  }

  initialize() {
    if (this.initialized) return;

    this.config = this.getClaudeConfig();
    this.validateConfig();
    this.createClient();
    this.initialized = true;
    
    console.log('Claude AI configuration initialized');
  }

  getClaudeConfig() {
    const config = getConfig();
    return {
      apiKey: config.raw.ANTHROPIC_API_KEY,
      baseURL: 'https://api.anthropic.com',
      timeout: 120000, // 2 minutes
      maxRetries: 3,
      retryDelay: 2000,
    };
  }

  validateConfig() {
    if (!this.config.apiKey) {
      throw new Error('Anthropic API key is required');
    }

    if (!this.config.apiKey.startsWith('sk-ant-')) {
      throw new Error('Anthropic API key format is invalid (should start with "sk-ant-")');
    }

    if (this.config.apiKey.length < 50) {
      throw new Error('Anthropic API key appears to be invalid');
    }
  }

  createClient() {
    this.client = new Anthropic({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries,
    });
  }

  getClient() {
    if (!this.client) {
      throw new Error('Claude client not initialized. Call initialize() first.');
    }
    return this.client;
  }

  getModels() {
    return {
      'claude-3-5-sonnet-20241022': {
        max_tokens: 8192,
        max_context: 200000,
        capabilities: ['text', 'reasoning', 'analysis', 'coding'],
        use_case: 'general',
        cost_per_1k_tokens: { input: 0.003, output: 0.015 },
      },
      'claude-3-5-haiku-20241022': {
        max_tokens: 8192,
        max_context: 200000,
        capabilities: ['text', 'fast_response'],
        use_case: 'fast',
        cost_per_1k_tokens: { input: 0.0008, output: 0.004 },
      },
      'claude-3-opus-20240229': {
        max_tokens: 4096,
        max_context: 200000,
        capabilities: ['text', 'reasoning', 'analysis', 'creative'],
        use_case: 'complex',
        cost_per_1k_tokens: { input: 0.015, output: 0.075 },
      },
      'claude-3-sonnet-20240229': {
        max_tokens: 4096,
        max_context: 200000,
        capabilities: ['text', 'reasoning', 'analysis'],
        use_case: 'balanced',
        cost_per_1k_tokens: { input: 0.003, output: 0.015 },
      },
      'claude-3-haiku-20240307': {
        max_tokens: 4096,
        max_context: 200000,
        capabilities: ['text', 'fast_response'],
        use_case: 'fast',
        cost_per_1k_tokens: { input: 0.00025, output: 0.00125 },
      },
    };
  }

  getDefaultModel() {
    return 'claude-3-5-sonnet-20241022';
  }

  getFastModel() {
    return 'claude-3-5-haiku-20241022';
  }

  getComplexModel() {
    return 'claude-3-opus-20240229';
  }

  getModelByUseCase(useCase) {
    const models = this.getModels();
    const model = Object.entries(models).find(([_, config]) => config.use_case === useCase);
    return model ? model[0] : this.getDefaultModel();
  }

  validateMessageRequest(messages, model) {
    if (!Array.isArray(messages)) {
      throw new Error('Messages must be an array');
    }

    if (messages.length === 0) {
      throw new Error('Messages array cannot be empty');
    }

    const modelConfig = this.getModels()[model];
    if (!modelConfig) {
      throw new Error(`Unsupported model: ${model}`);
    }

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      
      if (!message || typeof message !== 'object') {
        throw new Error(`Message ${i} must be an object`);
      }

      if (!message.role || !['user', 'assistant', 'system'].includes(message.role)) {
        throw new Error(`Message ${i} must have a valid role (user, assistant, or system)`);
      }

      if (!message.content || typeof message.content !== 'string') {
        throw new Error(`Message ${i} must have non-empty content`);
      }

      if (message.content.length > 100000) {
        throw new Error(`Message ${i} content exceeds maximum length`);
      }
    }

    return true;
  }

  validateCompletionRequest(params) {
    if (!params || typeof params !== 'object') {
      throw new Error('Completion params must be an object');
    }

    if (!params.messages) {
      throw new Error('Messages are required');
    }

    const model = params.model || this.getDefaultModel();
    this.validateMessageRequest(params.messages, model);

    if (params.max_tokens && (typeof params.max_tokens !== 'number' || params.max_tokens <= 0 || params.max_tokens > 8192)) {
      throw new Error('max_tokens must be a number between 1 and 8192');
    }

    if (params.temperature && (typeof params.temperature !== 'number' || params.temperature < 0 || params.temperature > 1)) {
      throw new Error('temperature must be a number between 0 and 1');
    }

    if (params.top_p && (typeof params.top_p !== 'number' || params.top_p < 0 || params.top_p > 1)) {
      throw new Error('top_p must be a number between 0 and 1');
    }

    if (params.top_k && (typeof params.top_k !== 'number' || params.top_k < 0)) {
      throw new Error('top_k must be a non-negative number');
    }

    return true;
  }

  getCompletionDefaults() {
    return {
      model: this.getDefaultModel(),
      max_tokens: 4096,
      temperature: 0.7,
      top_p: 1,
      top_k: 0,
      stop_sequences: [],
    };
  }

  getCourseGenerationPrompts() {
    return {
      courseStructure: `You are an expert course designer. Create a comprehensive course structure based on the provided content. 
      
      Requirements:
      - Generate a clear course title and description
      - Create 5-8 modules with descriptive titles
      - Each module should have 3-5 lessons
      - Include learning objectives for each module
      - Suggest assessment methods
      - Provide estimated time for completion
      
      Return the response as valid JSON with the following structure:
      {
        "title": "Course Title",
        "description": "Course description",
        "modules": [
          {
            "title": "Module Title",
            "description": "Module description",
            "lessons": ["Lesson 1", "Lesson 2", "Lesson 3"],
            "objectives": ["Objective 1", "Objective 2"],
            "assessment": "Assessment type",
            "duration": "Estimated time"
          }
        ]
      }`,
      
      lessonContent: `You are an expert instructional designer. Create detailed lesson content based on the provided topic and context.
      
      Requirements:
      - Create engaging lesson content with clear explanations
      - Include practical examples and case studies
      - Add interactive elements (questions, activities)
      - Provide key takeaways and summary
      - Include references to source material
      
      Return the response as valid JSON with the following structure:
      {
        "title": "Lesson Title",
        "content": "Detailed lesson content in HTML format",
        "examples": ["Example 1", "Example 2"],
        "activities": ["Activity 1", "Activity 2"],
        "keyTakeaways": ["Takeaway 1", "Takeaway 2"],
        "references": ["Reference 1", "Reference 2"]
      }`,
      
      assessment: `You are an expert assessment designer. Create comprehensive assessments based on the provided learning objectives.
      
      Requirements:
      - Create multiple choice questions (4 options each)
      - Include true/false questions
      - Add scenario-based questions
      - Provide correct answers and explanations
      - Ensure questions test different cognitive levels
      
      Return the response as valid JSON with the following structure:
      {
        "questions": [
          {
            "type": "multiple_choice",
            "question": "Question text",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correct": 0,
            "explanation": "Explanation for correct answer"
          }
        ]
      }`,
    };
  }

  async testConnection() {
    try {
      const client = this.getClient();
      const response = await client.messages.create({
        model: this.getFastModel(),
        max_tokens: 10,
        messages: [
          {
            role: 'user',
            content: 'Hello'
          }
        ]
      });
      
      console.log('Claude API connection test successful');
      return true;
    } catch (error) {
      console.error('Claude API connection test failed:', error.message);
      return false;
    }
  }

  getUsageConfig() {
    return {
      rateLimit: {
        requestsPerMinute: 50,
        tokensPerMinute: 40000,
      },
      retry: {
        maxRetries: 3,
        backoffFactor: 2,
        baseDelay: 1000,
      },
      timeout: {
        completion: 120000,
        streaming: 300000,
      },
      performance: {
        concurrency: 2,
        batchSize: 1,
      },
    };
  }

  getConfig() {
    return {
      baseURL: this.config.baseURL,
      hasApiKey: !!this.config.apiKey,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries,
      initialized: this.initialized,
      models: Object.keys(this.getModels()),
      defaultModel: this.getDefaultModel(),
      fastModel: this.getFastModel(),
      complexModel: this.getComplexModel(),
      usage: this.getUsageConfig(),
    };
  }
}

const claudeConfig = new ClaudeConfig();

module.exports = {
  claudeConfig,
  initialize: () => claudeConfig.initialize(),
  getClient: () => claudeConfig.getClient(),
  getModels: () => claudeConfig.getModels(),
  getDefaultModel: () => claudeConfig.getDefaultModel(),
  getFastModel: () => claudeConfig.getFastModel(),
  getComplexModel: () => claudeConfig.getComplexModel(),
  getModelByUseCase: (useCase) => claudeConfig.getModelByUseCase(useCase),
  validateMessageRequest: (messages, model) => claudeConfig.validateMessageRequest(messages, model),
  validateCompletionRequest: (params) => claudeConfig.validateCompletionRequest(params),
  getCompletionDefaults: () => claudeConfig.getCompletionDefaults(),
  getCourseGenerationPrompts: () => claudeConfig.getCourseGenerationPrompts(),
  testConnection: () => claudeConfig.testConnection(),
  getUsageConfig: () => claudeConfig.getUsageConfig(),
  getConfig: () => claudeConfig.getConfig(),
};