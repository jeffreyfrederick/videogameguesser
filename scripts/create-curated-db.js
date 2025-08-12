const fs = require('fs');
const path = require('path');

// Parse CSV line handling quotes and commas
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

// Parse screenshot URLs from CSV format
function parseScreenshotUrls(screenshotUrlsStr) {
  if (!screenshotUrlsStr || screenshotUrlsStr === '') return [];
  
  try {
    const cleaned = screenshotUrlsStr.replace(/^\[|\]$/g, '');
    if (!cleaned) return [];
    
    const urls = cleaned
      .split("', '")
      .map(url => url.replace(/^'|'$/g, '').trim())
      .filter(url => url.length > 0 && url.startsWith('http'));
    
    return urls;
  } catch (error) {
    return [];
  }
}

// Check if a year is between 1980-2024
function isValidYear(releaseDate) {
  if (!releaseDate) return false;
  const year = new Date(releaseDate).getFullYear();
  return year >= 1980 && year <= 2024;
}

function createCuratedDatabase() {
  console.log('🚀 Creating curated game database for Vercel deployment...');
  
  const csvPath = path.join(process.cwd(), 'game_dataset.csv');
  console.log('📂 Reading CSV file...');
  
  const csvData = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvData.split('\n');
  
  console.log(`📊 Processing ${lines.length} total lines...`);
  
  const curatedGames = [];
  let processed = 0;
  let skipped = 0;
  
  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    processed++;
    if (processed % 25000 === 0) {
      console.log(`📈 Processed ${processed} lines, found ${curatedGames.length} qualified games`);
    }
    
    const values = parseCSVLine(line);
    if (values.length < 23) {
      skipped++;
      continue;
    }
    
    const [id, name, category, release_date, rating, aggregated_rating, genres, themes, 
           franchise, series, main_developers, supporting_developers, publishers, platforms,
           player_perspectives, game_modes, game_engines, similar_games, keywords, 
           cover_url, summary, screenshot_urls, artwork_urls] = values;
    
    // Quality filters
    const gameRating = parseFloat(rating);
    const screenshots = parseScreenshotUrls(screenshot_urls);
    
    const qualifies = 
      category === 'main_game' &&
      !isNaN(gameRating) && gameRating >= 78 &&
      isValidYear(release_date) &&
      screenshots.length > 0 &&
      name && name.length > 0 &&
      cover_url && cover_url.startsWith('http');
    
    if (qualifies) {
      const gameYear = new Date(release_date).getFullYear();
      
      curatedGames.push({
        id: parseInt(id),
        name: name,
        year: gameYear,
        release_date: release_date,
        rating: gameRating,
        cover_url: cover_url,
        screenshots: screenshots,
        summary: summary || '',
        genres: genres || '',
        developers: main_developers || '',
        platforms: platforms || ''
      });
    } else {
      skipped++;
    }
  }
  
  console.log(`\n📋 Results:`);
  console.log(`   • Total processed: ${processed}`);
  console.log(`   • Qualified games: ${curatedGames.length}`);
  console.log(`   • Skipped: ${skipped}`);
  
  // Sort by rating (highest first) and year
  curatedGames.sort((a, b) => {
    if (b.rating !== a.rating) return b.rating - a.rating;
    return b.year - a.year;
  });
  
  // Create year distribution analysis
  const yearCounts = {};
  curatedGames.forEach(game => {
    yearCounts[game.year] = (yearCounts[game.year] || 0) + 1;
  });
  
  console.log(`\n📅 Year distribution (1980-2024):`);
  const decades = {
    '1980s': 0, '1990s': 0, '2000s': 0, '2010s': 0, '2020s': 0
  };
  
  Object.entries(yearCounts).forEach(([year, count]) => {
    const y = parseInt(year);
    if (y >= 1980 && y <= 1989) decades['1980s'] += count;
    else if (y >= 1990 && y <= 1999) decades['1990s'] += count;
    else if (y >= 2000 && y <= 2009) decades['2000s'] += count;
    else if (y >= 2010 && y <= 2019) decades['2010s'] += count;
    else if (y >= 2020 && y <= 2024) decades['2020s'] += count;
  });
  
  console.log('   Decade breakdown:');
  Object.entries(decades).forEach(([decade, count]) => {
    console.log(`   • ${decade}: ${count} games`);
  });
  
  // Save curated database
  const outputPath = path.join(process.cwd(), 'lib', 'curated-games.json');
  fs.writeFileSync(outputPath, JSON.stringify(curatedGames, null, 2));
  
  const fileSizeMB = (fs.statSync(outputPath).size / (1024 * 1024)).toFixed(2);
  console.log(`\n✅ Curated database created!`);
  console.log(`   • File: ${outputPath}`);
  console.log(`   • Size: ${fileSizeMB} MB`);
  console.log(`   • Games: ${curatedGames.length}`);
  
  if (parseFloat(fileSizeMB) > 10) {
    console.log(`\n⚠️  File is ${fileSizeMB}MB (target: <10MB)`);
    console.log('   Consider raising minimum rating to reduce size');
  }
  
  return curatedGames;
}

// Run if called directly
if (require.main === module) {
  createCuratedDatabase();
}

module.exports = { createCuratedDatabase };