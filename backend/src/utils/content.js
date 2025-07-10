const crypto = require('crypto');
const natural = require('natural');
const logger = require('./logger');

/**
 * Content processing utilities for text cleaning, language detection, similarity calculation, and metadata extraction
 */

// Initialize natural language processing tools
const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;
const TfIdf = natural.TfIdf;

// Language detection patterns
const LANGUAGE_PATTERNS = {
  en: /\b(the|and|of|to|in|is|you|that|it|he|was|for|on|are|as|with|his|they|at|be|this|have|from|or|one|had|by|word|but|not|what|all|were|we|when|your|can|said|there|use|an|each|which|she|do|how|their|if|will|up|other|about|out|many|then|them|these|so|some|her|would|make|like|him|into|time|has|look|two|more|write|go|see|number|no|way|could|people|my|than|first|water|been|call|who|oil|its|now|find|long|down|day|did|get|come|made|may|part)\b/gi,
  es: /\b(el|la|de|que|y|a|en|un|ser|se|no|haber|estar|tener|lo|su|para|como|más|poder|decir|este|ir|otro|ese|la|si|me|ya|ver|porque|dar|cuando|él|muy|sin|vez|mucho|saber|qué|sobre|mi|alguno|mismo|yo|también|hasta|año|dos|querer|entre|así|primero|desde|grande|eso|ni|nos|llegar|pasar|tiempo|ella|sí|día|uno|bien|poco|deber|entonces|poner|cosa|tanto|hombre|parecer|nuestro|tan|donde|ahora|parte|después|vida|quedar|siempre|creer|hablar|llevar|dejar|nada|cada|seguir|menos|nuevo|encontrar)\b/gi,
  fr: /\b(le|de|un|être|et|à|il|avoir|ne|je|son|que|se|qui|ce|dans|en|du|elle|au|pour|pas|que|vous|par|sur|faire|plus|dire|me|on|mon|lui|nous|comme|mais|pouvoir|avec|tout|y|aller|voir|en|bien|où|sans|tu|ou|leur|homme|si|deux|mari|moi|vouloir|te|femme|venir|quand|grand|celui|si|notre|devoir|là|jour|prendre|même|votre|tout|rien|petit|encore|aussi|quelque|dont|tout|mer|trouver|donner|temps|ça|peu|même|falloir|sous|parler|alors|main|chose|ton|mettre|vie|savoir|yeux|passer|autre|après|regarder|toujours|puis|jamais|cela|aimer|non|heure)\b/gi,
  de: /\b(der|die|und|in|den|von|zu|das|mit|sich|des|auf|für|ist|im|dem|nicht|ein|eine|als|auch|es|an|werden|aus|er|hat|daß|sie|nach|wird|bei|einer|Der|um|am|sind|noch|wie|einem|über|einen|Das|so|Sie|zum|war|haben|nur|oder|aber|vor|zur|bis|mehr|durch|man|sein|wurde|sei|In|Prozent|hatte|kann|gegen|vom|können|schon|wenn|habe|seine|Mark|ihre|dann|unter|wir|soll|ich|eines|Jahr|zwei|Jahren|diese|dieser|wieder|keine|Uhr|seiner|worden|Und|will|zwischen|Im|immer|Millionen|Ein|was|sagte|Er|gibt|alle|DM|diesem|seit|muß|wurden|beim|doch|jetzt|waren|drei|Jahre|Mit|neue|neuen|damit|bereits|da|Auch|ihr|seinen|müssen|ab|ihrer|Nach|ohne|sondern|selbst|ersten|nun|etwa|Bei|heute|ihren|weil|ihm|seien|Menschen|Deutschland|anderen|werde|Ich|sagt|Wir|Eine|rund|Für|Aber|ihn|Ende|jedoch|Zeit|sollen|ins|Wenn|So|seinem|uns|Stadt|geht|Doch|sehr|hier|ganz|erst|wollen|Berlin|vor allem|sowie|hatten|kein|deutschen|machen|lassen|Als|Unternehmen|andere|ob|dieses|steht|dabei|wegen|weiter|denn|beiden|einmal|etwas|Wie|nichts|diesen|vier|gibt|derzeit|allein|viel|wo|viele|während|dort|so|gab|fast|fünf|könnte|nicht nur|hätten|Frau|Am|dafür|kommen|diesen|letzten|zwar|Diese|könnten|wollte|Seit|würde|ließ|gleichzeitig|Frankfurt|gleich|darauf|nehmen|solche|Entscheidung|besonders|deutlich|zehn|beiden|stellen|einige|jeder|ihrer|Zeit|würden|Interesse|Wohl|später|könne|Fall|je|anders|neue|Männer|große|Art|Weise|dazu|zwölf|denn|Mann|Was|sollte|würde|also|bisher|Leben|Milliarden|Welt|Regierung|konnte|ihrem|Frauen|während|Land|zeigt|Beginn|besteht|Ordnung|Arbeit|mich|Mitte|zur|gehört|Ziel|darf|Seite|fest|hin|erklärt|Personen|Ansicht|über|solchen|Nur|Nach|bleibt|wenig|lange|großen|Die|solcher|tun|Vor|dann|zunächst|derart|Prozent|möglich|Ich|Probleme|weniger|guten|vorher|Bereich|zum Beispiel|Ländern|entsprechend|Woche|fand|Recht|eigenen|Platz|Zahl|System|Entwicklung|Kampf|weit|Staat|Kosten|Erfolg|bekannt|findet|Tag|liegen|gar|Männern|erhielt|Job|machen|Lösung|macht|Lage|Länder|aus|Zeiten|Kraft|könnten|Arbeit|Buch|ihres|konnte|dort|Deutsche|Gesetz|Geschäft|kommt|Dabei|Man|Zug)\b/gi,
  it: /\b(il|di|e|la|che|è|per|un|essere|come|dei|con|ne|da|lo|ma|al|si|anche|o|ed|se|perché|molto|ha|mi|più|così|hai|del|tu|solo|le|dopo|uno|noi|sono|io|ho|ora|su|tutto|c'è|questo|bene|qui|no|voglio|lei|cosa|a|fare|lui|sì|grazie|quello|va|prego|oh|ecco|la|loro|vi|arrivederci|dove|chi|davvero|hanno|ciao|male|è|già|fatto|essere|ancora|voi|detto|morto|nella|forse|alla|vita|dell|era|gli|dei|sta|cui|certo|quella|tra|dire|suo|me|quando|questa|li|allora|io|aver|molto|anche|l'|prima|ora|stato|sul|andare|altra|hanno|casa|tempo|numero|tutte|parte|fino|qualcosa|niente|anni|capo|oggi|parlare|sapere|fai|tuo|qua|sempre|sua|mano|nelle|momento|proprio|bella|fare|andiamo|aveva|abbiamo|stai|devo|vuoi|sono|dice|prendere|qualcuno|altri|venire|senza|quell|volta|fuori|perchè|nostro|avere|poi|gli|vedere|giorno|tre|una|mio|siamo|nessuno|sai|due|altro|modo|alla|posso|vogliamo|nei|tua|okay|pare|farlo|adesso|trovare|sicuro|visto|lavoro|contro|stati|vero|amore|tutti|può|fine|li|cose|presto|quel|molti|dei|troppo|quanto|stata|nome)\b/gi,
  pt: /\b(o|de|e|a|que|do|da|em|para|com|um|é|os|se|na|por|uma|dos|no|as|não|mais|das|foi|como|mas|ao|ele|das|à|seu|sua|ou|quando|muito|nos|já|eu|também|pelo|pela|até|isso|ela|entre|depois|sem|mesmo|aos|seus|quem|nas|me|esse|eles|essa|num|nem|suas|meu|às|minha|numa|pelos|elas|qual|nós|lhe|deles|essas|esses|pelas|este|dele|tu|te|vocês|vos|lhes|meus|minhas|teu|tua|teus|tuas|nosso|nossa|nossos|nossas|dela|delas|esta|estes|estas|aquele|aquela|aqueles|aquelas|isto|aquilo|estou|está|estamos|estão|estive|esteve|estivemos|estiveram|estava|estávamos|estavam|estivera|estivéramos|esteja|estejamos|estejam|estivesse|estivéssemos|estivessem|estiver|estivermos|estiverem|hei|há|havemos|hão|houve|houvemos|houveram|houvera|houvéramos|haja|hajamos|hajam|houvesse|houvéssemos|houvessem|houver|houvermos|houverem|houverei|houverá|houveremos|houverão|houveria|houveríamos|houveriam|sou|somos|são|era|éramos|eram|fui|foi|fomos|foram|fora|fôramos|seja|sejamos|sejam|fosse|fôssemos|fossem|for|formos|forem|serei|será|seremos|serão|seria|seríamos|seriam|tenho|tem|temos|tém|tinha|tínhamos|tinham|tive|teve|tivemos|tiveram|tivera|tivéramos|tenha|tenhamos|tenham|tivesse|tivéssemos|tivessem|tiver|tivermos|tiverem|terei|terá|teremos|terão|teria|teríamos|teriam)\b/gi,
  ja: /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/,
  ko: /[\uac00-\ud7af\u1100-\u11ff\u3130-\u318f]/,
  zh: /[\u4e00-\u9fff\u3400-\u4dbf]/,
  ar: /[\u0600-\u06ff\u0750-\u077f]/,
  hi: /[\u0900-\u097f]/,
  ru: /[а-яА-Я]/
};

/**
 * Clean and normalize text content
 * @param {string} text - Text to clean
 * @param {Object} options - Cleaning options
 * @returns {string} Cleaned text
 */
function cleanText(text, options = {}) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  let cleaned = text;

  // Remove HTML tags if specified
  if (options.removeHtml !== false) {
    cleaned = cleaned.replace(/<[^>]*>/g, ' ');
  }

  // Normalize whitespace
  cleaned = cleaned
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ') // Convert tabs to spaces
    .replace(/\u00A0/g, ' ') // Replace non-breaking spaces
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim();

  // Remove special characters if specified
  if (options.removeSpecialChars) {
    cleaned = cleaned.replace(/[^\w\s\-.,!?;:'"]/g, ' ');
  }

  // Convert to lowercase if specified
  if (options.lowercase) {
    cleaned = cleaned.toLowerCase();
  }

  // Remove URLs if specified
  if (options.removeUrls) {
    cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, ' ');
  }

  // Remove email addresses if specified
  if (options.removeEmails) {
    cleaned = cleaned.replace(/[\w.-]+@[\w.-]+\.\w+/g, ' ');
  }

  // Remove numbers if specified
  if (options.removeNumbers) {
    cleaned = cleaned.replace(/\d+/g, ' ');
  }

  // Remove extra punctuation
  if (options.removePunctuation) {
    cleaned = cleaned.replace(/[^\w\s]/g, ' ');
  }

  // Final whitespace cleanup
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

/**
 * Detect language of text
 * @param {string} text - Text to analyze
 * @returns {Object} Language detection result
 */
function detectLanguage(text) {
  if (!text || typeof text !== 'string') {
    return { language: 'unknown', confidence: 0 };
  }

  const cleanedText = cleanText(text, { lowercase: true });
  const results = {};

  // Check each language pattern
  for (const [lang, pattern] of Object.entries(LANGUAGE_PATTERNS)) {
    if (pattern instanceof RegExp) {
      const matches = cleanedText.match(pattern);
      if (matches) {
        results[lang] = matches.length;
      }
    } else {
      // For non-Latin scripts, check presence
      if (pattern.test(text)) {
        results[lang] = text.match(pattern).length;
      }
    }
  }

  // Find language with most matches
  let detectedLang = 'unknown';
  let maxMatches = 0;

  for (const [lang, matches] of Object.entries(results)) {
    if (matches > maxMatches) {
      maxMatches = matches;
      detectedLang = lang;
    }
  }

  // Calculate confidence
  const totalWords = cleanedText.split(/\s+/).length;
  const confidence = totalWords > 0 ? Math.min(maxMatches / totalWords, 1) : 0;

  return {
    language: detectedLang,
    confidence: Math.round(confidence * 100) / 100,
    scores: results
  };
}

/**
 * Calculate text similarity using TF-IDF and cosine similarity
 * @param {string} text1 - First text
 * @param {string} text2 - Second text
 * @param {Object} options - Similarity options
 * @returns {number} Similarity score (0-1)
 */
function calculateSimilarity(text1, text2, options = {}) {
  if (!text1 || !text2) {
    return 0;
  }

  const {
    useStemming = true,
    removeStopWords = true,
    caseSensitive = false
  } = options;

  // Clean texts
  let cleaned1 = cleanText(text1, { lowercase: !caseSensitive });
  let cleaned2 = cleanText(text2, { lowercase: !caseSensitive });

  // Tokenize
  let tokens1 = tokenizer.tokenize(cleaned1);
  let tokens2 = tokenizer.tokenize(cleaned2);

  // Remove stop words if specified
  if (removeStopWords) {
    const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'as', 'are', 'was', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can', 'of', 'in', 'to', 'for', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once']);
    tokens1 = tokens1.filter(token => !stopWords.has(token.toLowerCase()));
    tokens2 = tokens2.filter(token => !stopWords.has(token.toLowerCase()));
  }

  // Apply stemming if specified
  if (useStemming) {
    tokens1 = tokens1.map(token => stemmer.stem(token));
    tokens2 = tokens2.map(token => stemmer.stem(token));
  }

  // Create TF-IDF vectors
  const tfidf = new TfIdf();
  tfidf.addDocument(tokens1.join(' '));
  tfidf.addDocument(tokens2.join(' '));

  // Get all unique terms
  const terms = new Set([...tokens1, ...tokens2]);
  
  // Build vectors
  const vector1 = [];
  const vector2 = [];

  terms.forEach(term => {
    vector1.push(tfidf.tfidf(term, 0));
    vector2.push(tfidf.tfidf(term, 1));
  });

  // Calculate cosine similarity
  const dotProduct = vector1.reduce((sum, val, i) => sum + val * vector2[i], 0);
  const magnitude1 = Math.sqrt(vector1.reduce((sum, val) => sum + val * val, 0));
  const magnitude2 = Math.sqrt(vector2.reduce((sum, val) => sum + val * val, 0));

  if (magnitude1 === 0 || magnitude2 === 0) {
    return 0;
  }

  const similarity = dotProduct / (magnitude1 * magnitude2);
  return Math.round(similarity * 1000) / 1000; // Round to 3 decimal places
}

/**
 * Extract metadata from text content
 * @param {string} text - Text to analyze
 * @returns {Object} Extracted metadata
 */
function extractMetadata(text) {
  if (!text || typeof text !== 'string') {
    return {
      wordCount: 0,
      charCount: 0,
      lineCount: 0,
      paragraphCount: 0,
      sentenceCount: 0,
      readingTime: 0,
      language: 'unknown',
      keywords: []
    };
  }

  const cleanedText = cleanText(text);
  
  // Basic counts
  const wordCount = cleanedText.split(/\s+/).filter(word => word.length > 0).length;
  const charCount = text.length;
  const lineCount = text.split('\n').length;
  const paragraphCount = text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
  
  // Sentence count (approximate)
  const sentenceCount = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  
  // Reading time (assuming 200 words per minute)
  const readingTime = Math.ceil(wordCount / 200);
  
  // Language detection
  const { language } = detectLanguage(text);
  
  // Extract keywords using TF-IDF
  const keywords = extractKeywords(text, 10);
  
  // Extract title (first line or first heading)
  let title = '';
  const firstLine = text.trim().split('\n')[0];
  if (firstLine && firstLine.length < 200) {
    title = firstLine.replace(/^#+\s*/, '').trim();
  }
  
  return {
    title,
    wordCount,
    charCount,
    lineCount,
    paragraphCount,
    sentenceCount,
    readingTime,
    language,
    keywords,
    avgWordsPerSentence: sentenceCount > 0 ? Math.round(wordCount / sentenceCount) : 0,
    avgWordsPerParagraph: paragraphCount > 0 ? Math.round(wordCount / paragraphCount) : 0
  };
}

/**
 * Extract keywords from text using TF-IDF
 * @param {string} text - Text to analyze
 * @param {number} count - Number of keywords to extract
 * @returns {Array} Array of keywords
 */
function extractKeywords(text, count = 10) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const cleanedText = cleanText(text, { lowercase: true, removePunctuation: true });
  const tokens = tokenizer.tokenize(cleanedText);
  
  // Remove stop words
  const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'as', 'are', 'was', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can', 'of', 'in', 'to', 'for', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once']);
  const filteredTokens = tokens.filter(token => 
    !stopWords.has(token.toLowerCase()) && token.length > 2
  );
  
  // Count frequencies
  const frequencies = {};
  filteredTokens.forEach(token => {
    const stem = stemmer.stem(token);
    frequencies[stem] = (frequencies[stem] || 0) + 1;
  });
  
  // Sort by frequency and get top keywords
  const keywords = Object.entries(frequencies)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([word, freq]) => ({
      word,
      frequency: freq,
      score: freq / filteredTokens.length
    }));
  
  return keywords;
}

/**
 * Calculate text readability scores
 * @param {string} text - Text to analyze
 * @returns {Object} Readability scores
 */
function calculateReadability(text) {
  if (!text || typeof text !== 'string') {
    return {
      fleschReading: 0,
      fleschKincaid: 0,
      readabilityLevel: 'unknown'
    };
  }

  const cleanedText = cleanText(text);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = cleanedText.split(/\s+/).filter(w => w.length > 0);
  const syllables = words.reduce((count, word) => count + countSyllables(word), 0);
  
  const sentenceCount = Math.max(sentences.length, 1);
  const wordCount = Math.max(words.length, 1);
  
  // Flesch Reading Ease
  const fleschReading = 206.835 - 1.015 * (wordCount / sentenceCount) - 84.6 * (syllables / wordCount);
  
  // Flesch-Kincaid Grade Level
  const fleschKincaid = 0.39 * (wordCount / sentenceCount) + 11.8 * (syllables / wordCount) - 15.59;
  
  // Determine readability level
  let readabilityLevel;
  if (fleschReading >= 90) {
    readabilityLevel = 'very easy';
  } else if (fleschReading >= 80) {
    readabilityLevel = 'easy';
  } else if (fleschReading >= 70) {
    readabilityLevel = 'fairly easy';
  } else if (fleschReading >= 60) {
    readabilityLevel = 'standard';
  } else if (fleschReading >= 50) {
    readabilityLevel = 'fairly difficult';
  } else if (fleschReading >= 30) {
    readabilityLevel = 'difficult';
  } else {
    readabilityLevel = 'very difficult';
  }
  
  return {
    fleschReading: Math.round(fleschReading * 10) / 10,
    fleschKincaid: Math.round(fleschKincaid * 10) / 10,
    readabilityLevel,
    averageSyllablesPerWord: Math.round((syllables / wordCount) * 10) / 10,
    averageWordsPerSentence: Math.round((wordCount / sentenceCount) * 10) / 10
  };
}

/**
 * Count syllables in a word (approximate)
 * @param {string} word - Word to analyze
 * @returns {number} Syllable count
 */
function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  let count = 0;
  let previousWasVowel = false;
  
  for (let i = 0; i < word.length; i++) {
    const isVowel = /[aeiou]/.test(word[i]);
    if (isVowel && !previousWasVowel) {
      count++;
    }
    previousWasVowel = isVowel;
  }
  
  // Adjust for silent e
  if (word.endsWith('e')) {
    count--;
  }
  
  // Ensure at least one syllable
  return Math.max(count, 1);
}

/**
 * Generate content hash for deduplication
 * @param {string} text - Text to hash
 * @returns {string} Content hash
 */
function generateContentHash(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  const cleanedText = cleanText(text, { lowercase: true, removePunctuation: true });
  return crypto.createHash('sha256').update(cleanedText).digest('hex');
}

/**
 * Split text into sentences
 * @param {string} text - Text to split
 * @returns {Array} Array of sentences
 */
function splitIntoSentences(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }
  
  // Use natural's sentence tokenizer
  const sentenceTokenizer = new natural.SentenceTokenizer();
  return sentenceTokenizer.tokenize(text);
}

/**
 * Split text into paragraphs
 * @param {string} text - Text to split
 * @returns {Array} Array of paragraphs
 */
function splitIntoParagraphs(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }
  
  return text
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
}

module.exports = {
  cleanText,
  detectLanguage,
  calculateSimilarity,
  extractMetadata,
  extractKeywords,
  calculateReadability,
  generateContentHash,
  splitIntoSentences,
  splitIntoParagraphs,
  countSyllables,
  LANGUAGE_PATTERNS
};