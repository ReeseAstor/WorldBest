export const config = {
  pinecone: {
    apiKey: process.env.PINECONE_API_KEY || '',
    indexName: process.env.PINECONE_INDEX || 'worldbest',
    environment: process.env.PINECONE_ENVIRONMENT || 'us-west1-gcp',
  },
};