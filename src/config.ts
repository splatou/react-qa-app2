interface Config {
    DEEPGRAM_API_KEY: string;
    OPENAI_API_KEY: string;
    IS_DEVELOPMENT: boolean;
  }
  
  const config: Config = {
    DEEPGRAM_API_KEY: process.env.REACT_APP_DEEPGRAM_API_KEY || '',
    OPENAI_API_KEY: process.env.REACT_APP_OPENAI_API_KEY || '',
    IS_DEVELOPMENT: process.env.NODE_ENV === 'development'
  };
  
  // Add warning for missing API keys in development mode
  if (config.IS_DEVELOPMENT) {
    if (!config.DEEPGRAM_API_KEY) {
      console.warn('Warning: Deepgram API key is missing. Add it to your .env file.');
    }
    if (!config.OPENAI_API_KEY) {
      console.warn('Warning: OpenAI API key is missing. Add it to your .env file.');
    }
  }
  
  export default config;