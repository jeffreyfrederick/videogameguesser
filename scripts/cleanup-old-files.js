const fs = require('fs');
const path = require('path');

console.log('🧹 Cleaning up old files for Vercel deployment...');

const filesToRemove = [
  'lib/csv-games.ts',
  'game_dataset.csv'
];

filesToRemove.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`✅ Removed: ${file}`);
    } catch (error) {
      console.log(`❌ Failed to remove ${file}:`, error.message);
    }
  } else {
    console.log(`⚠️  File not found: ${file}`);
  }
});

console.log('\n📊 Final deployment stats:');
const curatedDbPath = path.join(process.cwd(), 'lib', 'curated-games.json');
if (fs.existsSync(curatedDbPath)) {
  const stats = fs.statSync(curatedDbPath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`   • Curated database: ${sizeMB} MB`);
}

console.log('\n🚀 Ready for Vercel deployment!');