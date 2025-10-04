from typing import List, Optional, Dict, Any
from openai import AsyncOpenAI
from app.core.config import settings
import json

class EmbeddingService:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = settings.EMBEDDING_MODEL
    
    async def create_embedding(self, text: str) -> List[float]:
        if not text or len(text.strip()) == 0:
            raise ValueError("Text cannot be empty")
        
        text = text[:8000]
        
        try:
            response = await self.client.embeddings.create(
                input=text,
                model=self.model
            )
            return response.data[0].embedding
        except Exception as e:
            raise Exception(f"Failed to generate embedding: {str(e)}")
    
    async def create_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            raise ValueError("Texts list cannot be empty")
        
        texts = [t[:8000] for t in texts]
        
        try:
            response = await self.client.embeddings.create(
                input=texts,
                model=self.model
            )
            return [item.embedding for item in response.data]
        except Exception as e:
            raise Exception(f"Failed to generate batch embeddings: {str(e)}")
    
    async def generate_content_tags(self, title: str, description: str, content: str, domain: str) -> List[str]:
        """Generate exactly 3 tags: 1 content format + 2 content domain tags using GPT-4o mini with function calling."""
        
        # Prepare content for analysis (limit to avoid token limits)
        content_sample = content[:1500] if content else ""
        
        # Define the function schema for structured output
        function_schema = {
            "name": "classify_content",
            "description": "Classify web content into format and domain tags",
            "parameters": {
                "type": "object",
                "properties": {
                    "content_format": {
                        "type": "string",
                        "enum": ["article", "tutorial", "documentation", "video", "tool", "library", "course", "blog", "news", "reference", "guide"],
                        "description": "The format/type of the content"
                    },
                    "domain_tags": {
                        "type": "array",
                        "items": {"type": "string"},
                        "minItems": 2,
                        "maxItems": 2,
                        "description": "Two domain tags that best describe the subject matter"
                    }
                },
                "required": ["content_format", "domain_tags"]
            }
        }
        
        prompt = f"""
Analyze this web content and classify it:

Content to analyze:
Title: {title}
Description: {description or "Not provided"}
Domain: {domain}
Content Preview: {content_sample}

Classify the content format (article, tutorial, documentation, etc.) and choose 2 domain tags that best describe the subject matter (e.g., programming, web-dev, ai-ml, business, design, etc.).
"""

        try:
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                functions=[function_schema],
                function_call={"name": "classify_content"},
                temperature=0.1
            )
            
            # Extract function call result
            function_call = response.choices[0].message.function_call
            if function_call and function_call.name == "classify_content":
                import json
                result = json.loads(function_call.arguments)
                
                # Extract and clean the tags
                content_format = result.get("content_format", "").lower().replace(" ", "-")
                domain_tags = [tag.lower().replace(" ", "-") for tag in result.get("domain_tags", [])]
                
                if content_format and len(domain_tags) == 2:
                    return [content_format] + domain_tags
            
            raise ValueError("Function call did not return expected format")
                
        except Exception as e:
            print(f"Error generating tags with GPT-4o mini function calling: {e}")
            raise Exception(f"Failed to generate tags: {str(e)}")
    
    async def parse_search_query(self, query: str) -> Dict[str, Any]:
        """Parse user query to extract search text and metadata filters using GPT-4o mini."""
        
        # Define the function schema for structured output
        function_schema = {
            "name": "parse_search_query",
            "description": "Extract semantic search query and metadata filters from natural language",
            "parameters": {
                "type": "object",
                "properties": {
                    "domain_filter": {
                        "type": "string",
                        "description": "Domain name or author name to filter by (e.g., 'medium.com', 'paul graham', 'fast.ai'). Extract ONLY if clearly referring to a website/domain or article author. When ambiguous with reference, prefer reference."
                    },
                    "reference_filter": {
                        "type": "string",
                        "description": "How the bookmark was found or who shared it (e.g., 'hackernews', 'reddit', 'newsletter', 'john', 'sarah'). Extract if user mentions someone sharing/recommending or a source. When a person's name appears with verbs like 'shared', 'recommended', 'sent', 'suggested', treat it as reference, not domain."
                    },
                    "date_range": {
                        "type": "string",
                        "enum": ["today", "last_week", "last_month", "last_3_months", "last_year", None],
                        "description": "Time period mentioned in the query"
                    },
                    "ambiguous_person_name": {
                        "type": "string",
                        "description": "If a person's name is mentioned but it's unclear if they're the author (domain) or the person who shared it (reference), return the name here and we'll search both fields"
                    }
                },
                "required": []
            }
        }
        
        prompt = f"""
Parse this search query to extract metadata filters only. DO NOT extract or modify the search query itself.

Important rules:
1. When someone "shared", "sent", "recommended", "suggested", or "showed" something, they are a REFERENCE (how you found it), not a domain/author
2. Domain filter is for website domains (medium.com, youtube.com) or content authors (when explicitly mentioned as author)
3. Reference filter is for how/where you found the bookmark or who shared it with you
4. If a person's name appears and it's ambiguous whether they're the author or the person who shared it, put it in ambiguous_person_name

Examples:
- "React tutorials from dan abramov" → domain_filter: "dan abramov" (clearly an author)
- "Machine learning articles I found on hackernews last week" → reference_filter: "hackernews", date_range: "last_week"
- "Python documentation from python.org" → domain_filter: "python.org"
- "Articles via newsletter about AI" → reference_filter: "newsletter"
- "article on steel threads vinod shared" → reference_filter: "vinod" (vinod shared it)
- "video john sent about rust" → reference_filter: "john" (john sent it)
- "paul graham essay on startups" → domain_filter: "paul graham" (paul graham is the author)
- "article about react by dan" → ambiguous_person_name: "dan" (could be author or who shared it)

Query to parse: "{query}"
"""

        try:
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                functions=[function_schema],
                function_call={"name": "parse_search_query"},
                temperature=0.1
            )
            
            # Extract function call result
            function_call = response.choices[0].message.function_call
            if function_call and function_call.name == "parse_search_query":
                result = json.loads(function_call.arguments)
                
                # Handle ambiguous person name - search both domain and reference
                ambiguous_name = result.get("ambiguous_person_name")
                
                # Clean up None values and prepare the response
                parsed_result = {
                    "domain_filter": result.get("domain_filter"),
                    "reference_filter": result.get("reference_filter"),
                    "date_range": result.get("date_range"),
                    "ambiguous_person_name": ambiguous_name
                }
                
                # If there's an ambiguous name, we'll handle it in the search logic
                # by searching both domain and reference fields
                return parsed_result
            
            # Fallback to original query if parsing fails
            return {
                "domain_filter": None,
                "reference_filter": None,
                "date_range": None,
                "ambiguous_person_name": None
            }
                
        except Exception as e:
            print(f"Error parsing search query: {e}")
            # Return original query on error
            return {
                "domain_filter": None,
                "reference_filter": None,
                "date_range": None,
                "ambiguous_person_name": None
            }