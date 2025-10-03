#!/usr/bin/env node

/**
 * Convert All Datasets Script
 * 
 * Converts all .jsonl files in the datasets folder to chatbot-ready JSON files
 * Usage: node convert-all-datasets.js
 */

const fs = require('fs');
const path = require('path');

/**
 * Extract question from prompt
 */
function extractQuestion(prompt) {
  // Look for <|user|> tag and extract the question
  const userMatch = prompt.match(/<\|user\|>\s*(.*?)\s*<\/s>/s);
  if (userMatch) {
    return userMatch[1].trim();
  }
  
  // Fallback: look for any text after <|user|>
  const fallbackMatch = prompt.match(/<\|user\|>\s*(.*)/s);
  if (fallbackMatch) {
    return fallbackMatch[1].trim();
  }
  
  return null;
}

/**
 * Clean completion text
 */
function cleanCompletion(completion) {
  // Remove </s> tags and clean up
  return completion.replace(/<\/s>/g, '').trim();
}

/**
 * Get dataset name from filename
 */
function getDatasetName(filename) {
  const name = path.basename(filename, '.jsonl');
  
  // Map filenames to friendly names
  const nameMap = {
    'cleaned_tales': 'Tales App Knowledge Base',
    'cleaned_self': 'Stewie AI Assistant Info',
    'cleaned_Hinduism': 'Hinduism Knowledge Base',
    'cleaned_IHH': 'IHH Knowledge Base',
    'cleaned_korba': 'Korba Information',
    'korba_tourist': 'Korba Tourist Information',
    'stweprjct_fixed2': 'stwe.prjct Project Information'
  };
  
  return nameMap[name] || name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Get dataset type based on content
 */
function getDatasetType(filename, data) {
  const name = path.basename(filename, '.jsonl');
  
  // Determine type based on filename and content
  if (name.includes('tales') || name.includes('stweprjct')) {
    return 'faq';
  } else if (name.includes('self') || name.includes('stewie')) {
    return 'faq';
  } else if (name.includes('Hinduism') || name.includes('IHH') || name.includes('korba')) {
    return 'knowledge';
  } else {
    return 'faq';
  }
}

/**
 * Convert a single .jsonl file
 */
function convertFile(inputFile, outputDir) {
  try {
    console.log(`\n📁 Processing: ${inputFile}`);
    
    // Read the input file
    const content = fs.readFileSync(inputFile, 'utf8');
    
    // Split by lines and parse each JSON object
    const lines = content.trim().split('\n');
    const faqData = [];
    let processedCount = 0;
    let skippedCount = 0;
    
    lines.forEach((line, index) => {
      try {
        const data = JSON.parse(line);
        
        if (data.prompt && data.completion) {
          const question = extractQuestion(data.prompt);
          const answer = cleanCompletion(data.completion);
          
          if (question && answer) {
            faqData.push({
              question: question,
              answer: answer
            });
            processedCount++;
          } else {
            skippedCount++;
          }
        } else {
          skippedCount++;
        }
      } catch (parseError) {
        skippedCount++;
      }
    });
    
    if (faqData.length === 0) {
      console.log(`⚠️  No valid data found in ${inputFile}`);
      return null;
    }
    
    // Create the dataset object
    const datasetName = getDatasetName(inputFile);
    const datasetType = getDatasetType(inputFile, faqData);
    
    const dataset = {
      name: datasetName,
      type: datasetType,
      description: `Converted from ${path.basename(inputFile)} - ${faqData.length} Q&A pairs`,
      data: faqData
    };
    
    // Create output filename
    const outputFile = path.join(outputDir, `${path.basename(inputFile, '.jsonl')}.json`);
    
    // Write the output file
    fs.writeFileSync(outputFile, JSON.stringify(dataset, null, 2));
    
    console.log(`✅ Converted: ${processedCount} items`);
    console.log(`   Output: ${outputFile}`);
    console.log(`   Type: ${datasetType}`);
    console.log(`   Name: ${datasetName}`);
    
    return {
      inputFile,
      outputFile,
      processedCount,
      skippedCount,
      dataset
    };
    
  } catch (error) {
    console.error(`❌ Error processing ${inputFile}: ${error.message}`);
    return null;
  }
}

/**
 * Main conversion function
 */
function convertAllDatasets() {
  const datasetsDir = path.join(__dirname, 'datasets');
  const outputDir = path.join(__dirname, 'converted-datasets');
  
  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
    console.log(`📁 Created output directory: ${outputDir}`);
  }
  
  // Find all .jsonl files
  const files = fs.readdirSync(datasetsDir)
    .filter(file => file.endsWith('.jsonl'))
    .map(file => path.join(datasetsDir, file));
  
  if (files.length === 0) {
    console.log('❌ No .jsonl files found in datasets directory');
    return;
  }
  
  console.log(`🔄 Found ${files.length} files to convert:`);
  files.forEach(file => console.log(`   - ${path.basename(file)}`));
  
  const results = [];
  
  // Convert each file
  files.forEach(file => {
    const result = convertFile(file, outputDir);
    if (result) {
      results.push(result);
    }
  });
  
  // Summary
  console.log(`\n🎉 Conversion Complete!`);
  console.log(`   Files processed: ${results.length}`);
  console.log(`   Total Q&A pairs: ${results.reduce((sum, r) => sum + r.processedCount, 0)}`);
  console.log(`   Output directory: ${outputDir}`);
  
  console.log(`\n📊 Results:`);
  results.forEach(result => {
    console.log(`   ${path.basename(result.inputFile)} → ${path.basename(result.outputFile)} (${result.processedCount} items)`);
  });
  
  console.log(`\n📁 Ready to upload to blob storage:`);
  console.log(`   1. Go to Azure Portal → Storage Account → Container`);
  console.log(`   2. Create 'datasets' folder`);
  console.log(`   3. Upload all files from: ${outputDir}`);
  console.log(`   4. Deploy your backend to Azure`);
  console.log(`   5. Test your chatbot!`);
}

/**
 * Show usage information
 */
function showUsage() {
  console.log(`
🔄 Convert All Datasets

Converts all .jsonl files in the datasets/ folder to chatbot-ready JSON files.

Usage:
  node convert-all-datasets.js

This will:
  1. Read all .jsonl files from datasets/ folder
  2. Convert them to chatbot format
  3. Save them to converted-datasets/ folder
  4. Show you what to upload to blob storage

Output:
  - converted-datasets/cleaned_tales.json
  - converted-datasets/cleaned_self.json
  - converted-datasets/cleaned_Hinduism.json
  - etc.
`);
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    showUsage();
    return;
  }
  
  convertAllDatasets();
}

// Run the script
main();
