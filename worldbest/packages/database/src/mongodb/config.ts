export const config = {
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://worldbest:worldbest123@localhost:27017/worldbest?authSource=admin',
  },
};