import crypto from 'crypto';

console.log('🔐 PRODUCTION SECRETS GENERATOR');
console.log('==================================');

// Generate secure secrets
const sessionSecret = crypto.randomBytes(32).toString('hex');
const jwtSecret = crypto.randomBytes(32).toString('hex');

console.log('\n📝 Copy these secrets to your .env.production file:');
console.log('\n1. SESSION_SECRET:');
console.log(sessionSecret);
console.log('\n2. JWT_SECRET:');
console.log(jwtSecret);
console.log('\n⚠️  Keep these secrets secure and never share them!');
console.log('\n✅ Secrets generated successfully!');

// Export for programmatic use
export { sessionSecret, jwtSecret };
