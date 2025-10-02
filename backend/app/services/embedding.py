from typing import List
from openai import AsyncOpenAI
from app.core.config import settings

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