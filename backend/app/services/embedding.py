from typing import List, Optional, Dict, Any
from openai import AsyncOpenAI
from anthropic import AsyncAnthropic
from app.core.config import settings
from app.core.logging import get_logger
import json

class EmbeddingService:
    def __init__(self):
        # OpenAI is used only for embeddings (Claude has no embeddings API).
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        # Claude handles the reasoning tasks: tagging, categorization, query parsing.
        self.anthropic = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.logger = get_logger(__name__)
        # Model configurations from settings
        self.embedding_model = settings.EMBEDDING_MODEL
        self.tag_generation_model = settings.TAG_GENERATION_MODEL
        self.tag_generation_temperature = settings.TAG_GENERATION_TEMPERATURE
        self.category_generation_model = settings.CATEGORY_GENERATION_MODEL
        self.category_generation_temperature = settings.CATEGORY_GENERATION_TEMPERATURE
        self.query_parsing_model = settings.QUERY_PARSING_MODEL
        self.query_parsing_temperature = settings.QUERY_PARSING_TEMPERATURE
        self.content_analysis_model = settings.CONTENT_ANALYSIS_MODEL
        self.content_analysis_temperature = settings.CONTENT_ANALYSIS_TEMPERATURE
    
    async def create_embedding(self, text: str) -> List[float]:
        if not text or len(text.strip()) == 0:
            raise ValueError("Text cannot be empty")
        
        text = text[:8000]
        
        try:
            response = await self.client.embeddings.create(
                input=text,
                model=self.embedding_model
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
                model=self.embedding_model
            )
            return [item.embedding for item in response.data]
        except Exception as e:
            raise Exception(f"Failed to generate batch embeddings: {str(e)}")
    
    async def _generate_json(self, model: str, temperature: float, prompt: str, schema: Dict[str, Any], max_tokens: int = 512) -> Dict[str, Any]:
        """Call Claude and return a dict validated against `schema` via structured outputs.

        Uses `output_config.format` (json_schema), the model-agnostic analog of the
        OpenAI function-calling we used before. Note: a custom `temperature` is only
        accepted by Haiku; Opus/Sonnet 5.x reject non-default values, so only pass it
        when it differs from the default.
        """
        kwargs: Dict[str, Any] = {
            "model": model,
            "max_tokens": max_tokens,
            "messages": [{"role": "user", "content": prompt}],
            "output_config": {"format": {"type": "json_schema", "schema": schema}},
        }
        if temperature is not None:
            kwargs["temperature"] = temperature

        response = await self.anthropic.messages.create(**kwargs)
        # output_config.format guarantees the first text block is valid JSON.
        text = next((b.text for b in response.content if b.type == "text"), None)
        if text is None:
            raise ValueError("Claude response contained no text block")
        return json.loads(text)

    async def generate_content_tags(self, title: str, description: str, content: str, domain: str) -> List[str]:
        """Generate exactly 3 tags: 1 content format + 2 content domain tags using Claude with structured outputs."""

        # Prepare content for analysis (limit to avoid token limits)
        content_sample = content[:1500] if content else ""

        # JSON schema for structured output
        schema = {
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
            "required": ["content_format", "domain_tags"],
            "additionalProperties": False
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
            result = await self._generate_json(
                self.tag_generation_model,
                self.tag_generation_temperature,
                prompt,
                schema,
                max_tokens=256,
            )

            # Extract and clean the tags
            content_format = result.get("content_format", "").lower().replace(" ", "-")
            domain_tags = [tag.lower().replace(" ", "-") for tag in result.get("domain_tags", [])]

            if content_format and len(domain_tags) == 2:
                return [content_format] + domain_tags

            raise ValueError("Model did not return expected tag format")

        except Exception as e:
            self.logger.error(f"Error generating tags with {self.tag_generation_model}: {e}", exc_info=True)
            raise Exception(f"Failed to generate tags: {str(e)}")
    
    async def generate_content_category(self, title: str, content: str) -> str:
        """Generate a descriptive category for the content using Claude."""

        # Prepare content for analysis (limit to avoid token limits)
        content_sample = content[:1500] if content else ""

        # JSON schema for structured output
        schema = {
            "type": "object",
            "properties": {
                "category": {
                    "type": "string",
                    "description": "A concise category (1-3 words) that best describes the content type and subject matter (e.g., 'Web Development', 'AI Research', 'Business Strategy', 'Design Tutorial', 'Tech News', 'Programming Guide')"
                }
            },
            "required": ["category"],
            "additionalProperties": False
        }

        prompt = f"""
Analyze this web content and generate a descriptive category that best describes what this content is about:

Title: {title}
Content: {content_sample}

Generate a concise category (1-3 words) that best describes both the content type and subject matter. Examples:
- "Web Development" for React tutorials
- "AI Research" for machine learning papers  
- "Business Strategy" for startup advice
- "Design Tutorial" for UI/UX guides
- "Tech News" for technology articles
- "Programming Guide" for coding documentation
"""

        try:
            result = await self._generate_json(
                self.category_generation_model,
                self.category_generation_temperature,
                prompt,
                schema,
                max_tokens=64,
            )
            category = result.get("category", "").strip()

            if category:
                return category

            raise ValueError("Model did not return expected category")

        except Exception as e:
            self.logger.error(f"Error generating category with {self.category_generation_model}: {e}", exc_info=True)
            # Return a default category on error rather than failing the entire bookmark creation
            return "General"
    
    async def parse_search_query(self, query: str) -> Dict[str, Any]:
        """Parse user query to extract search text and metadata filters using Claude."""

        # JSON schema for structured output. All fields optional; omit a field
        # (rather than returning null) when it does not apply.
        schema = {
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
                    "enum": ["today", "last_week", "last_month", "last_3_months", "last_year"],
                    "description": "Time period mentioned in the query. Omit if none is mentioned."
                },
                "ambiguous_person_name": {
                    "type": "string",
                    "description": "If a person's name is mentioned but it's unclear if they're the author (domain) or the person who shared it (reference), return the name here and we'll search both fields"
                }
            },
            "required": [],
            "additionalProperties": False
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
            result = await self._generate_json(
                self.query_parsing_model,
                self.query_parsing_temperature,
                prompt,
                schema,
                max_tokens=256,
            )

            # Clean up and prepare the response (fields may be absent -> None).
            # An ambiguous name is handled in the search logic by searching both
            # the domain and reference fields.
            return {
                "domain_filter": result.get("domain_filter"),
                "reference_filter": result.get("reference_filter"),
                "date_range": result.get("date_range"),
                "ambiguous_person_name": result.get("ambiguous_person_name"),
            }

        except Exception as e:
            self.logger.error(f"Error parsing search query: {e}", exc_info=True)
            # Return original query on error
            return {
                "domain_filter": None,
                "reference_filter": None,
                "date_range": None,
                "ambiguous_person_name": None
            }