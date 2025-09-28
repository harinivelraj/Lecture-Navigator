# Smart Text Processing Utilities for Search Enhancement
import re
from typing import List, Set

class SmartTextProcessor:
    """
    AI-powered text processing that extracts meaningful content words
    and filters out stop words, question words, and noise.
    """
    
    def __init__(self):
        # Common English stop words that don't add search value
        self.STOP_WORDS = {
            # Question words
            'what', 'why', 'how', 'when', 'where', 'who', 'which', 'whose',
            # Articles
            'a', 'an', 'the',
            # Pronouns
            'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
            'my', 'your', 'his', 'her', 'its', 'our', 'their',
            'myself', 'yourself', 'himself', 'herself', 'itself', 'ourselves', 'themselves',
            # Prepositions
            'in', 'on', 'at', 'by', 'for', 'with', 'from', 'to', 'of', 'about', 'into', 
            'through', 'during', 'before', 'after', 'above', 'below', 'up', 'down',
            'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once',
            # Conjunctions
            'and', 'or', 'but', 'so', 'because', 'as', 'until', 'while', 'since',
            # Common verbs (low content value)
            'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
            'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
            'must', 'can', 'shall',
            # Other common words with low search value
            'this', 'that', 'these', 'those', 'there', 'here', 'now', 'then',
            'some', 'any', 'many', 'much', 'more', 'most', 'other', 'such',
            'no', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
            'just', 'now', 'also', 'even', 'still', 'yet', 'already'
        }
        
        # Academic/technical terms that should be preserved even if they look like stop words
        self.PRESERVE_WORDS = {
            'ai', 'ml', 'api', 'sql', 'css', 'html', 'xml', 'json', 'http', 'https',
            'gpu', 'cpu', 'ram', 'ssd', 'usb', 'pdf', 'csv', 'zip', 'git', 'npm',
            'ide', 'gui', 'cli', 'sdk', 'aws', 'gcp', 'ios', 'app', 'web', 'dev',
            # Mathematical/statistical terms
            'r', 'p', 'x', 'y', 'z', 'alpha', 'beta', 'gamma', 'sigma', 'pi',
            # Units that might appear as single letters
            'm', 'cm', 'mm', 'km', 'g', 'kg', 's', 'ms', 'hz', 'db'
        }
        
        # Minimum word length for content words (but preserve important short terms)
        self.MIN_WORD_LENGTH = 2
        
        # Pattern for extracting words (including hyphenated terms, numbers, and special chars)
        self.WORD_PATTERN = re.compile(r'\b[\w\-\.]+\b')
    
    def extract_content_keywords(self, text: str) -> List[str]:
        """
        Extract meaningful content keywords from text by filtering out stop words
        and focusing on terms that are likely to be found in academic/lecture content.
        
        Args:
            text: Input text (e.g., user search query)
            
        Returns:
            List of meaningful keywords for search
        """
        if not text:
            return []
        
        # Convert to lowercase and extract words
        text_lower = text.lower().strip()
        words = self.WORD_PATTERN.findall(text_lower)
        
        content_words = []
        for word in words:
            # Remove punctuation from ends but preserve internal punctuation (e.g., "machine-learning", "3.14")
            cleaned_word = word.strip('.,!?;:"\'()[]{}')
            
            if not cleaned_word:
                continue
                
            # Preserve important technical terms regardless of other rules
            if cleaned_word in self.PRESERVE_WORDS:
                content_words.append(cleaned_word)
                continue
            
            # Skip stop words
            if cleaned_word in self.STOP_WORDS:
                continue
                
            # Skip very short words unless they're preserved terms
            if len(cleaned_word) < self.MIN_WORD_LENGTH:
                continue
            
            # Include words that look like meaningful content:
            # - Contains numbers (e.g., "linear2", "version3")
            # - Has mixed case patterns (e.g., "API", "JavaScript") - though we lowercased, this catches acronyms
            # - Contains hyphens or dots (e.g., "machine-learning", "sklearn")
            # - Is longer than typical stop words
            # - Contains non-English characters (might be technical terms)
            if (re.search(r'\d', cleaned_word) or 
                '-' in cleaned_word or 
                '.' in cleaned_word or
                len(cleaned_word) >= 4 or
                re.search(r'[^\w\s\-\.]', cleaned_word)):
                content_words.append(cleaned_word)
                continue
            
            # For remaining words, apply heuristics to identify content words
            if self._is_likely_content_word(cleaned_word):
                content_words.append(cleaned_word)
        
        return content_words
    
    def _is_likely_content_word(self, word: str) -> bool:
        """
        Determine if a word is likely to be a meaningful content word
        based on linguistic and academic context patterns.
        """
        # Technical/academic suffixes and prefixes suggest content words
        technical_patterns = [
            # Suffixes
            r'.*tion$', r'.*sion$', r'.*ment$', r'.*ness$', r'.*ing$', r'.*ed$',
            r'.*ly$', r'.*er$', r'.*est$', r'.*ive$', r'.*ous$', r'.*ful$',
            r'.*less$', r'.*able$', r'.*ible$', r'.*ism$', r'.*ist$', r'.*ics$',
            # Prefixes
            r'^un.*', r'^re.*', r'^pre.*', r'^sub.*', r'^super.*', r'^multi.*',
            r'^inter.*', r'^trans.*', r'^over.*', r'^under.*', r'^auto.*',
            # Academic/scientific patterns
            r'.*ology$', r'.*ography$', r'.*ometry$', r'.*analysis$', r'.*theory$',
            r'.*method$', r'.*algorithm$', r'.*function$', r'.*model$', r'.*system$'
        ]
        
        for pattern in technical_patterns:
            if re.match(pattern, word):
                return True
        
        # Words with capital letters (even after lowercasing) suggest proper nouns/technical terms
        # This won't work after lowercasing, but the length heuristic above should catch most
        
        # Default: include words that are 3+ characters and not in stop words
        return len(word) >= 3
    
    def preprocess_search_query(self, query: str) -> str:
        """
        Preprocess a search query to focus on content words.
        This is the main function to use for search preprocessing.
        
        Args:
            query: Original user query (e.g., "what is linear regression")
            
        Returns:
            Processed query with content words (e.g., "linear regression")
        """
        keywords = self.extract_content_keywords(query)
        
        # If no content words found, fall back to original query
        if not keywords:
            return query.strip()
        
        return ' '.join(keywords)
    
    def tokenize_for_search(self, text: str) -> List[str]:
        """
        Tokenize text for search indexing, applying the same content word extraction
        to ensure query and document processing are consistent.
        
        Args:
            text: Text to tokenize (document content)
            
        Returns:
            List of meaningful tokens for search indexing
        """
        # For document indexing, we want to be more inclusive
        # but still filter out the most common stop words
        keywords = self.extract_content_keywords(text)
        
        # Add some basic word variations for better matching
        expanded_keywords = []
        for keyword in keywords:
            expanded_keywords.append(keyword)
            # Add word without common suffixes for better stem matching
            if keyword.endswith('ing'):
                expanded_keywords.append(keyword[:-3])
            elif keyword.endswith('ed'):
                expanded_keywords.append(keyword[:-2])
            elif keyword.endswith('s') and len(keyword) > 3:
                expanded_keywords.append(keyword[:-1])
        
        return expanded_keywords

# Global processor instance
text_processor = SmartTextProcessor()